'use strict';
/**
 * Owner: BUILD-SHOP
 * Kasse: /kasse (+ POST) , /bestellung/danke
 *
 * Die Kasse ist eine UNVERBINDLICHE BESTELLANFRAGE: Der Inhaber bestätigt per E-Mail, erst dann
 * kommt ein Vertrag zustande; es gibt (noch) keine Online-Zahlung.
 * Beim Absenden wird alles serverseitig neu berechnet (Katalogpreise, Rabatt inkl. Mindestwert,
 * Gültigkeit, Kontingent und "einmal pro E-Mail") und in EINER Datenbank-Transaktion gespeichert.
 */
const express = require('express');
const config = require('../../shared/config');
const { transaction, getDb } = require('../../shared/db');
const mailer = require('../../shared/mailer');
const { buildMeta } = require('../../shared/seo');
const { noIndex, rateLimits, honeypot, mailQuota } = require('../../shared/security');
const { parse, schemas, z, optional, oneOf } = require('../../shared/validate');
const cart = require('../lib/cart');

const router = express.Router();

const DELIVERY = [
  { value: 'versand', label: 'Versand innerhalb Deutschlands', hint: 'Versandkosten: [VERSANDKOSTEN] – wir nennen sie Ihnen verbindlich in der Bestätigung.' },
  { value: 'abholung', label: 'Abholung in Memmingen', hint: 'Kostenlos nach Terminabsprache · [ABHOLADRESSE]' },
];
const PAYMENT = [
  { value: 'ueberweisung', label: 'Überweisung (Vorkasse)', hint: 'Die Bankverbindung erhalten Sie mit unserer Bestätigung.' },
  { value: 'paypal', label: 'PayPal', hint: 'Den Zahlungslink erhalten Sie mit unserer Bestätigung. [bitte bestätigen]' },
  { value: 'bar', label: 'Barzahlung bei Abholung', hint: 'Nur bei Abholung in Memmingen möglich.' },
];
const COUNTRIES = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich [bitte bestätigen]' },
];

const CheckoutSchema = z
  .object({
    name: schemas.name,
    email: schemas.email,
    phone: optional(schemas.phone),
    delivery: oneOf(['versand', 'abholung'], 'Bitte wählen Sie Versand oder Abholung.'),
    street: optional(schemas.street),
    zip: optional(schemas.zip),
    city: optional(schemas.city),
    country: optional(oneOf(['DE', 'AT'], 'Bitte wählen Sie ein Lieferland.')),
    payment: oneOf(['ueberweisung', 'paypal', 'bar'], 'Bitte wählen Sie Ihre bevorzugte Zahlungsart.'),
    message: optional(schemas.text(2000)),
    privacy: schemas.consent('Bitte bestätigen Sie, dass Sie die Datenschutzerklärung zur Kenntnis genommen haben.'),
    agb: schemas.consent('Bitte bestätigen Sie, dass Sie die AGB und die Widerrufsbelehrung zur Kenntnis genommen haben.'),
    totalSeen: optional(z.string().regex(/^\d{1,9}$/)),
  })
  .superRefine((v, ctx) => {
    if (v.delivery === 'versand') {
      if (!v.street) ctx.addIssue({ code: 'custom', path: ['street'], message: 'Bitte geben Sie Straße und Hausnummer ein.' });
      if (!v.zip) ctx.addIssue({ code: 'custom', path: ['zip'], message: 'Bitte geben Sie Ihre Postleitzahl ein.' });
      if (!v.city) ctx.addIssue({ code: 'custom', path: ['city'], message: 'Bitte geben Sie Ihren Ort ein.' });
      const country = v.country || 'DE';
      if (v.zip && country === 'DE' && !/^\d{5}$/.test(v.zip)) {
        ctx.addIssue({ code: 'custom', path: ['zip'], message: 'Bitte geben Sie eine gültige deutsche Postleitzahl (5 Ziffern) ein.' });
      }
      if (v.zip && country === 'AT' && !/^\d{4}$/.test(v.zip)) {
        ctx.addIssue({ code: 'custom', path: ['zip'], message: 'Bitte geben Sie eine gültige österreichische Postleitzahl (4 Ziffern) ein.' });
      }
    }
    if (v.payment === 'bar' && v.delivery !== 'abholung') {
      ctx.addIssue({ code: 'custom', path: ['payment'], message: 'Barzahlung ist nur bei Abholung in Memmingen möglich.' });
    }
  });

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

function defaultValues(req) {
  const u = req.user;
  return {
    name: u ? u.name || '' : '',
    email: u ? u.email : '',
    phone: '',
    delivery: 'versand',
    street: '',
    zip: '',
    city: '',
    country: 'DE',
    payment: 'ueberweisung',
    message: '',
    privacy: false,
    agb: false,
  };
}

/** Nur bekannte Felder als Strings zurück in das Formular geben (Passwörter gibt es hier nicht). */
function echoValues(body) {
  const keys = ['name', 'email', 'phone', 'delivery', 'street', 'zip', 'city', 'country', 'payment', 'message'];
  const out = {};
  for (const k of keys) out[k] = typeof body[k] === 'string' ? body[k].slice(0, 2000) : '';
  out.privacy = body.privacy === 'on';
  out.agb = body.agb === 'on';
  return out;
}

function renderCheckout(req, res, { values, errors = {}, status = 200, formError = null, summary = null }) {
  const sum = summary || cart.summarize(req);
  res.locals.cartCount = sum.count;
  res.status(status).render('checkout/checkout.njk', {
    meta: buildMeta({ title: 'Ihre Bestellanfrage', noindex: true, path: '/kasse', description: 'Unverbindliche Bestellanfrage im Hasret Nuts Shop.' }, req),
    summary: sum,
    values,
    errors,
    formError,
    delivery: DELIVERY,
    payment: PAYMENT,
    countries: COUNTRIES,
  });
}

/* ----------------------------------------------------------------------- Kasse */
router.get('/kasse', noIndex, noStore, (req, res) => {
  const summary = cart.summarize(req);
  if (summary.empty) {
    req.flash('info', 'Ihr Warenkorb ist leer. Legen Sie zuerst Spezialitäten in den Warenkorb.');
    return res.redirect(303, '/warenkorb');
  }
  return renderCheckout(req, res, { values: defaultValues(req), summary });
});

/** Nächste Bestellnummer HN-<Jahr>-<laufende Nummer, 4-stellig> – innerhalb der Transaktion. */
function nextPublicId(db) {
  const year = new Date().getFullYear();
  const prefix = `${config.orderPrefix || 'HN'}-${year}-`;
  const row = db
    .prepare('SELECT MAX(CAST(substr(public_id, ?) AS INTEGER)) AS n FROM orders WHERE public_id LIKE ? ESCAPE \'\\\'')
    .get(prefix.length + 1, `${prefix.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const n = (row && row.n ? Number(row.n) : 0) + 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

class CheckoutConflict extends Error {}

router.post(
  '/kasse',
  noIndex,
  noStore,
  rateLimits.forms,
  honeypot('website', { redirectTo: '/', message: 'Vielen Dank – Ihre Anfrage wurde übermittelt.' }),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const values = echoValues(body);
      const pre = cart.summarize(req);
      if (pre.empty) {
        req.flash('error', 'Ihr Warenkorb ist leer.');
        return res.redirect(303, '/warenkorb');
      }
      if (pre.notices.length) {
        // Warenkorb hat sich geändert (Artikel entfernt, Code ungültig) – erst bestätigen lassen
        return renderCheckout(req, res, { values, status: 409, formError: pre.notices.map((n) => n.message).join(' '), summary: pre });
      }

      const r = parse(CheckoutSchema, body);
      if (!r.ok) {
        delete r.errors.totalSeen;
        return renderCheckout(req, res, { values, errors: r.errors, status: 422, formError: 'Bitte prüfen Sie die markierten Felder.', summary: pre });
      }
      const d = r.data;

      // Rabatt mit E-Mail-Adresse erneut prüfen ("einmal pro E-Mail", Mindestwert, Gültigkeit)
      const summary = cart.summarize(req, { email: d.email });
      if (summary.notices.some((n) => n.type === 'error' || n.type === 'warning')) {
        return renderCheckout(req, res, {
          values,
          status: 409,
          formError: summary.notices.map((n) => n.message).join(' '),
          summary,
        });
      }
      // Preise haben sich seit dem Anzeigen der Kasse geändert?
      if (d.totalSeen !== undefined && Number(d.totalSeen) !== summary.totalCents) {
        return renderCheckout(req, res, {
          values,
          status: 409,
          formError: 'Die Preise oder Ihr Warenkorb haben sich geändert. Bitte prüfen Sie Ihre Bestellung erneut.',
          summary,
        });
      }

      const delivery = d.delivery;
      const paymentLabel = (PAYMENT.find((p) => p.value === d.payment) || {}).label || '';
      const orderData = {
        user_id: req.user ? req.user.id : null,
        email: d.email,
        name: d.name,
        phone: d.phone || null,
        street: delivery === 'versand' ? d.street : null,
        zip: delivery === 'versand' ? d.zip : null,
        city: delivery === 'versand' ? d.city : null,
        country: delivery === 'versand' ? d.country || 'DE' : 'DE',
        delivery,
        payment_pref: paymentLabel,
        message: d.message || null,
        discount_code: summary.discount ? summary.discount.code : null,
        subtotal_cents: summary.subtotalCents,
        discount_cents: summary.discount ? summary.discount.cents : 0,
        total_cents: summary.totalCents,
      };

      let saved;
      try {
        saved = transaction((db) => {
          // Kontingent atomar prüfen und zählen (Schutz vor gleichzeitigen Einlösungen)
          let codeRow = null;
          if (summary.discount) {
            codeRow = db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(summary.discount.row.id);
            const ev = cart.evaluate(codeRow ? codeRow.code : '', summary.subtotalCents, { email: d.email, row: codeRow });
            if (!ev.ok || ev.cents !== summary.discount.cents) throw new CheckoutConflict(ev.message || cart.DISCOUNT_MESSAGES.invalid);
            const upd = db
              .prepare('UPDATE discount_codes SET uses = uses + 1 WHERE id = ? AND active = 1 AND (max_uses IS NULL OR uses < max_uses)')
              .run(codeRow.id);
            if (upd.changes !== 1) throw new CheckoutConflict(cart.DISCOUNT_MESSAGES.invalid);
          }
          const publicId = nextPublicId(db);
          const info = db
            .prepare(
              `INSERT INTO orders (public_id, user_id, email, name, phone, street, zip, city, country, delivery, payment_pref, message,
                 discount_code, subtotal_cents, discount_cents, total_cents)
               VALUES (@public_id, @user_id, @email, @name, @phone, @street, @zip, @city, @country, @delivery, @payment_pref, @message,
                 @discount_code, @subtotal_cents, @discount_cents, @total_cents)`
            )
            .run({ ...orderData, public_id: publicId });
          const orderId = info.lastInsertRowid;
          const insItem = db.prepare(
            `INSERT INTO order_items (order_id, sku, name, variant, unit_price_cents, qty, line_total_cents, bundle_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          );
          const items = summary.lines.map((l) => {
            const item = {
              sku: l.sku,
              name: l.name,
              variant: l.bundle.length ? l.bundleText : l.variantLabel || l.size || null,
              unit_price_cents: l.unitCents,
              qty: l.qty,
              line_total_cents: l.lineCents,
              bundle_json: l.bundle.length ? JSON.stringify(l.bundle.map((b) => ({ sku: b.sku, name: b.label }))) : null,
            };
            insItem.run(orderId, item.sku, item.name, item.variant, item.unit_price_cents, item.qty, item.line_total_cents, item.bundle_json);
            return item;
          });
          if (codeRow) {
            db.prepare('INSERT INTO discount_redemptions (code_id, email, order_id) VALUES (?, ?, ?)').run(codeRow.id, d.email, orderId);
          }
          return { orderId, publicId, items };
        });
      } catch (err) {
        if (err instanceof CheckoutConflict) {
          delete req.session.data.discountCode;
          return renderCheckout(req, res, {
            values,
            status: 409,
            formError: `${err.message} Der Rabattcode wurde entfernt – bitte prüfen Sie die Summe und senden Sie die Anfrage erneut.`,
          });
        }
        throw err;
      }

      const order = { ...orderData, public_id: saved.publicId };
      const shopUrl = config.apps.shop.baseUrl;
      const owner = mailer.ownerEmail();
      const mails = [];
      // Bestätigung an die eingegebene Adresse nur begrenzt oft pro Empfänger (Schutz vor Mail-Bombing über Gast-Anfragen)
      if (mailQuota('order-confirmation', d.email)) {
        // Persönliche Angaben nur, wenn ein angemeldetes Konto mit bestätigter Adresse an sich selbst bestellt.
        const personal = Boolean(req.user && req.user.emailVerified && String(req.user.email).toLowerCase() === String(d.email).toLowerCase());
        mails.push(mailer.send('orderConfirmation', d.email, { order, items: saved.items, shopUrl, personal }, owner ? { replyTo: owner } : {}));
      }
      if (owner) {
        mails.push(
          mailer.send('ownerNewOrder', owner, { order, items: saved.items, adminUrl: `${shopUrl}/admin/bestellungen/${saved.orderId}` }, { replyTo: d.email })
        );
      }
      const results = await Promise.allSettled(mails);
      for (const m of results) {
        if (m.status === 'rejected') console.error(`[kasse] Mail zu ${saved.publicId} fehlgeschlagen:`, m.reason && m.reason.message);
      }

      req.session.data.cart = [];
      delete req.session.data.discountCode;
      req.session.data.lastOrder = saved.publicId;
      req.session.data.lastOrderAt = Date.now();
      return res.redirect(303, '/bestellung/danke');
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------------------- Danke-Seite */
const THANKS_VISIBLE_MS = 30 * 60 * 1000;

router.get('/bestellung/danke', noIndex, noStore, (req, res) => {
  // Nur kurz nach dem Absenden sichtbar: Auf geteilten Geräten soll die nächste Person nicht
  // Name, E-Mail und Adresse einer früheren Gastbestellung sehen können.
  const at = Number(req.session.data.lastOrderAt) || 0;
  if (req.session.data.lastOrder && Date.now() - at > THANKS_VISIBLE_MS) {
    delete req.session.data.lastOrder;
    delete req.session.data.lastOrderAt;
  }
  const publicId = typeof req.session.data.lastOrder === 'string' ? req.session.data.lastOrder : null;
  const db = getDb();
  const order = publicId ? db.prepare('SELECT * FROM orders WHERE public_id = ?').get(publicId) : null;
  if (!order) return res.redirect(303, '/');
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  res.render('checkout/thanks.njk', {
    meta: buildMeta({ title: 'Vielen Dank für Ihre Bestellanfrage', noindex: true, path: '/bestellung/danke' }, req),
    order,
    items,
  });
});

module.exports = router;
