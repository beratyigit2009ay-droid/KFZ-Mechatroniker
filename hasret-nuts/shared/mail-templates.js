'use strict';
/**
 * E-Mail-Vorlagen (FOUNDATION-CORE) – deutsch, förmlich ("Sie"), Klartext + schlichtes HTML.
 * Jede Vorlage: (data) -> { subject, text, html }. Alle Nutzereingaben werden im HTML escaped.
 * Datenfelder akzeptieren DB-Spaltennamen (snake_case) UND camelCase.
 */

const SIGNATURE_TEXT = 'Hasret Nuts · Inhaber Eyyüp Koca · Memmingen';
const C = {
  emerald: '#0E4B3B',
  gold: '#C9A96E',
  goldText: '#8A6A32',
  pearl: '#F6F4EF',
  ink: '#1B2A25',
  muted: '#3D4844',
  line: '#ECE8DF',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Nur http(s)-URLs in Links zulassen. */
function safeUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

function pick(obj, ...keys) {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

function euro(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  const negative = n < 0;
  const abs = Math.round(Math.abs(n));
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = String(abs % 100).padStart(2, '0');
  return `${negative ? '−' : ''}${euros},${rest}\u00a0€`;
}

function oneLine(value, max = 200) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function greeting(name) {
  const n = oneLine(name, 100);
  return n ? `Guten Tag ${n},` : 'Guten Tag,';
}

function paragraphsHtml(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function button(url, label) {
  const href = safeUrl(url);
  if (!href) return '';
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:${C.emerald};color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;letter-spacing:.04em">${escapeHtml(label)}</a></p>
<p style="margin:0 0 16px;font-size:13px;color:${C.muted}">Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:<br><span style="word-break:break-all;color:${C.goldText}">${escapeHtml(href)}</span></p>`;
}

function layout({ heading, preheader = '', bodyHtml }) {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${C.pearl};color:${C.ink}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.pearl}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-top:3px solid ${C.gold}">
<tr><td style="padding:32px 36px 8px;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:${C.goldText}">Hasret Nuts</td></tr>
<tr><td style="padding:8px 36px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:${C.emerald}">${escapeHtml(heading)}</td></tr>
<tr><td style="padding:24px 36px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${C.ink}">${bodyHtml}</td></tr>
<tr><td style="padding:16px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line}">${escapeHtml(SIGNATURE_TEXT)}</td></tr>
</table></td></tr></table></body></html>`;
}

function textMail(lines) {
  return `${lines.filter((l) => l !== null && l !== undefined).join('\n')}\n\nMit freundlichen Grüßen\nHasret Nuts\n\n—\n${SIGNATURE_TEXT}\n`;
}

/* ------------------------------------------------------------- Bestell-Hilfen */

function normalizeOrder(o = {}) {
  return {
    publicId: pick(o, 'publicId', 'public_id') || '',
    name: pick(o, 'name') || '',
    email: pick(o, 'email') || '',
    phone: pick(o, 'phone') || '',
    street: pick(o, 'street') || '',
    zip: pick(o, 'zip') || '',
    city: pick(o, 'city') || '',
    country: pick(o, 'country') || 'DE',
    delivery: pick(o, 'delivery') || '',
    paymentPref: pick(o, 'paymentPref', 'payment_pref') || '',
    message: pick(o, 'message') || '',
    discountCode: pick(o, 'discountCode', 'discount_code') || '',
    subtotalCents: Number(pick(o, 'subtotalCents', 'subtotal_cents') || 0),
    discountCents: Number(pick(o, 'discountCents', 'discount_cents') || 0),
    totalCents: Number(pick(o, 'totalCents', 'total_cents') || 0),
  };
}

function normalizeItems(items = []) {
  return (items || []).map((it) => {
    let bundle = pick(it, 'bundle', 'bundleNames');
    const bundleJson = pick(it, 'bundle_json', 'bundleJson');
    if (!bundle && bundleJson) {
      try {
        bundle = JSON.parse(bundleJson);
      } catch {
        bundle = null;
      }
    }
    return {
      name: pick(it, 'name') || '',
      variant: pick(it, 'variant', 'label') || '',
      qty: Number(pick(it, 'qty', 'quantity') || 1),
      unitCents: Number(pick(it, 'unitPriceCents', 'unit_price_cents') || 0),
      lineCents: Number(pick(it, 'lineTotalCents', 'line_total_cents') || 0),
      bundle: Array.isArray(bundle) ? bundle.map((b) => (typeof b === 'string' ? b : pick(b, 'name', 'label', 'sku') || '')) : null,
    };
  });
}

const DELIVERY_LABEL = { versand: 'Versand', abholung: 'Abholung (nach Absprache)' };

function itemsText(items) {
  return items
    .map((it) => {
      const title = it.variant ? `${it.name} – ${it.variant}` : it.name;
      let line = `  ${it.qty} × ${oneLine(title)}  (je ${euro(it.unitCents)})  ${euro(it.lineCents)}`;
      if (it.bundle && it.bundle.length) line += `\n      Auswahl: ${it.bundle.map((b) => oneLine(b, 80)).join(', ')}`;
      return line;
    })
    .join('\n');
}

function itemsHtml(items) {
  const rows = items
    .map((it) => {
      const title = it.variant ? `${it.name} – ${it.variant}` : it.name;
      const bundle = it.bundle && it.bundle.length
        ? `<br><span style="font-size:13px;color:${C.muted}">Auswahl: ${escapeHtml(it.bundle.join(', '))}</span>`
        : '';
      return `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line}">${escapeHtml(it.qty)} × ${escapeHtml(title)}${bundle}<br><span style="font-size:13px;color:${C.muted}">je ${escapeHtml(euro(it.unitCents))}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};white-space:nowrap">${escapeHtml(euro(it.lineCents))}</td></tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 16px;font-size:15px">${rows}</table>`;
}

function totalsText(o) {
  const lines = [`Zwischensumme: ${euro(o.subtotalCents)}`];
  if (o.discountCents > 0) lines.push(`Rabatt${o.discountCode ? ` (${oneLine(o.discountCode, 40)})` : ''}: −${euro(o.discountCents)}`);
  lines.push(`Summe (vorläufig, zzgl. eventueller Versandkosten): ${euro(o.totalCents)}`);
  return lines.join('\n');
}

function totalsHtml(o) {
  const row = (label, value, strong) =>
    `<tr><td style="padding:4px 0${strong ? ';font-weight:bold' : ''}">${escapeHtml(label)}</td><td align="right" style="padding:4px 0;white-space:nowrap${strong ? ';font-weight:bold' : ''}">${escapeHtml(value)}</td></tr>`;
  let rows = row('Zwischensumme', euro(o.subtotalCents));
  if (o.discountCents > 0) rows += row(`Rabatt${o.discountCode ? ` (${o.discountCode})` : ''}`, `−${euro(o.discountCents)}`);
  rows += row('Summe (vorläufig)', euro(o.totalCents), true);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;font-size:15px">${rows}</table>
<p style="margin:0 0 16px;font-size:13px;color:${C.muted}">zzgl. eventueller Versandkosten – der verbindliche Gesamtbetrag folgt mit unserer Bestätigung.</p>`;
}

function addressText(o) {
  if (o.delivery !== 'versand') return null;
  return [o.street, `${o.zip} ${o.city}`.trim(), o.country && o.country !== 'DE' ? o.country : null]
    .filter(Boolean)
    .map((l) => oneLine(l))
    .join(', ');
}

/* ------------------------------------------------------------------- Vorlagen */

const templates = {
  /** data: { name, url, ttlHours = 24 } */
  verifyEmail({ name, url, ttlHours = 24 } = {}) {
    const subject = 'Bitte bestätigen Sie Ihre E-Mail-Adresse – Hasret Nuts';
    const intro = 'vielen Dank für Ihre Registrierung bei Hasret Nuts. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Kundenkonto zu aktivieren.';
    const note = `Der Link ist ${ttlHours} Stunden gültig und kann nur einmal verwendet werden. Falls Sie sich nicht bei uns registriert haben, können Sie diese E-Mail einfach ignorieren – es wird dann kein Konto aktiviert.`;
    return {
      subject,
      text: textMail([greeting(name), '', intro, '', safeUrl(url), '', note]),
      html: layout({
        heading: 'E-Mail-Adresse bestätigen',
        preheader: 'Ein Klick, und Ihr Kundenkonto ist aktiv.',
        bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting(name))}</p>${paragraphsHtml(intro)}${button(url, 'E-Mail-Adresse bestätigen')}${paragraphsHtml(note)}`,
      }),
    };
  },

  /** data: { name, url, ttlMinutes = 60 } */
  resetPassword({ name, url, ttlMinutes = 60 } = {}) {
    const subject = 'Ihr Link zum Zurücksetzen des Passworts – Hasret Nuts';
    const intro = 'für Ihr Kundenkonto bei Hasret Nuts wurde das Zurücksetzen des Passworts angefordert. Über den folgenden Link können Sie ein neues Passwort festlegen.';
    const note = `Der Link ist ${ttlMinutes} Minuten gültig und kann nur einmal verwendet werden. Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail bitte – Ihr bisheriges Passwort bleibt unverändert.`;
    return {
      subject,
      text: textMail([greeting(name), '', intro, '', safeUrl(url), '', note]),
      html: layout({
        heading: 'Neues Passwort festlegen',
        preheader: 'Ihr persönlicher Link zum Zurücksetzen des Passworts.',
        bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting(name))}</p>${paragraphsHtml(intro)}${button(url, 'Neues Passwort festlegen')}${paragraphsHtml(note)}`,
      }),
    };
  },

  /** data: { name, forgotUrl } */
  passwordChanged({ name, forgotUrl } = {}) {
    const subject = 'Ihr Passwort wurde geändert – Hasret Nuts';
    const intro = 'das Passwort Ihres Kundenkontos bei Hasret Nuts wurde soeben geändert. Aus Sicherheitsgründen wurden alle bestehenden Anmeldungen beendet.';
    const note = 'Falls Sie diese Änderung nicht selbst vorgenommen haben, setzen Sie Ihr Passwort bitte umgehend über den folgenden Link zurück und antworten Sie uns kurz auf diese E-Mail.';
    const url = safeUrl(forgotUrl);
    return {
      subject,
      text: textMail([greeting(name), '', intro, '', note, url ? '' : null, url || null]),
      html: layout({
        heading: 'Passwort geändert',
        preheader: 'Sicherheitshinweis zu Ihrem Kundenkonto.',
        bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting(name))}</p>${paragraphsHtml(intro)}${paragraphsHtml(note)}${url ? button(url, 'Passwort zurücksetzen') : ''}`,
      }),
    };
  },

  /** data: { name } */
  accountDeleted({ name } = {}) {
    const subject = 'Ihr Kundenkonto wurde gelöscht – Hasret Nuts';
    const intro = 'wie gewünscht haben wir Ihr Kundenkonto bei Hasret Nuts gelöscht. Ihre Anmeldedaten sind entfernt; eine Anmeldung ist nicht mehr möglich.';
    const note = 'Bereits gestellte Bestellanfragen bewahren wir im Rahmen der gesetzlichen Aufbewahrungspflichten auf – sie sind nicht mehr mit einem Konto verknüpft. Wir danken Ihnen für Ihr Vertrauen und würden uns freuen, Sie wieder bei uns begrüßen zu dürfen.';
    return {
      subject,
      text: textMail([greeting(name), '', intro, '', note]),
      html: layout({
        heading: 'Kundenkonto gelöscht',
        preheader: 'Bestätigung der Löschung Ihres Kundenkontos.',
        bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting(name))}</p>${paragraphsHtml(intro)}${paragraphsHtml(note)}`,
      }),
    };
  },

  /** data: { order, items, shopUrl } – order/items wie in den Tabellen orders/order_items */
  orderConfirmation({ order, items, shopUrl } = {}) {
    const o = normalizeOrder(order);
    const its = normalizeItems(items);
    const subject = `Ihre Bestellanfrage ${oneLine(o.publicId, 40)} – Hasret Nuts`;
    const intro = `vielen Dank für Ihre Bestellanfrage bei Hasret Nuts. Wir haben sie unter der Nummer ${o.publicId} erhalten.`;
    const notice = 'Bitte beachten Sie: Dies ist eine unverbindliche Bestellanfrage – noch keine verbindliche Bestellung und keine Zahlungsaufforderung. Eyyüp Koca prüft Ihre Anfrage persönlich und bestätigt Ihnen Verfügbarkeit, Gesamtbetrag (inklusive eventueller Versandkosten) und Zahlungsweise per E-Mail. Erst mit dieser Bestätigung kommt ein Kaufvertrag zustande.';
    const addr = addressText(o);
    const details = [
      `Lieferung: ${DELIVERY_LABEL[o.delivery] || oneLine(o.delivery)}${addr ? ` an ${addr}` : ''}`,
      o.paymentPref ? `Gewünschte Zahlungsart: ${oneLine(o.paymentPref)}` : null,
      o.phone ? `Telefon: ${oneLine(o.phone, 40)}` : null,
    ].filter(Boolean);
    const url = safeUrl(shopUrl);
    const text = textMail([
      greeting(o.name),
      '',
      intro,
      '',
      notice,
      '',
      'Ihre Auswahl:',
      itemsText(its),
      '',
      totalsText(o),
      '',
      ...details,
      // Freitext des Formulars wird bewusst NICHT an die eingegebene Adresse gespiegelt (sonst ließe sich
      // die Shop-Mail mit fremdem Text an beliebige Empfänger schicken). Er geht nur an den Inhaber.
      o.message ? '\nIhre Nachricht haben wir an Eyyüp Koca weitergeleitet.' : null,
      url ? `\n${url}` : null,
    ]);
    const html = layout({
      heading: 'Ihre Bestellanfrage',
      preheader: `Bestellanfrage ${o.publicId} – wir melden uns persönlich bei Ihnen.`,
      bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting(o.name))}</p>${paragraphsHtml(intro)}
<p style="margin:0 0 16px;padding:14px 16px;background:${C.pearl};border-left:3px solid ${C.gold};font-size:14px">${escapeHtml(notice)}</p>
<p style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${C.emerald}">Ihre Auswahl</p>
${itemsHtml(its)}${totalsHtml(o)}
${details.map((d) => `<p style="margin:0 0 6px;font-size:14px">${escapeHtml(d)}</p>`).join('')}
${o.message ? '<p style="margin:16px 0 0;font-size:14px">Ihre Nachricht haben wir an Eyyüp Koca weitergeleitet.</p>' : ''}`,
    });
    return { subject, text, html };
  },

  /** data: { order, items, adminUrl } */
  ownerNewOrder({ order, items, adminUrl } = {}) {
    const o = normalizeOrder(order);
    const its = normalizeItems(items);
    const subject = `Neue Bestellanfrage ${oneLine(o.publicId, 40)} von ${oneLine(o.name, 80)}`;
    const addr = addressText(o);
    const lines = [
      `Bestellanfrage: ${o.publicId}`,
      `Name: ${oneLine(o.name)}`,
      `E-Mail: ${oneLine(o.email)}`,
      o.phone ? `Telefon: ${oneLine(o.phone, 40)}` : null,
      `Lieferung: ${DELIVERY_LABEL[o.delivery] || oneLine(o.delivery)}${addr ? ` an ${addr}` : ''}`,
      o.paymentPref ? `Zahlungswunsch: ${oneLine(o.paymentPref)}` : null,
    ].filter(Boolean);
    const url = safeUrl(adminUrl);
    const text = `Neue unverbindliche Bestellanfrage im Shop:\n\n${lines.join('\n')}\n\nPositionen:\n${itemsText(its)}\n\n${totalsText(o)}${
      o.message ? `\n\nNachricht des Kunden:\n${String(o.message).slice(0, 4000)}` : ''
    }\n\nBitte Verfügbarkeit prüfen und dem Kunden den verbindlichen Gesamtbetrag per E-Mail bestätigen.${url ? `\n\nIm Verwaltungsbereich öffnen: ${url}` : ''}\n\n—\n${SIGNATURE_TEXT}\n`;
    const html = layout({
      heading: `Neue Bestellanfrage ${o.publicId}`,
      preheader: `${o.name} – ${euro(o.totalCents)}`,
      bodyHtml: `${lines.map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`).join('')}${itemsHtml(its)}${totalsHtml(o)}${
        o.message ? `<p style="margin:16px 0 4px;font-weight:bold">Nachricht des Kunden</p>${paragraphsHtml(String(o.message).slice(0, 4000))}` : ''
      }${url ? button(url, 'Im Verwaltungsbereich öffnen') : ''}`,
    });
    return { subject, text, html };
  },

  /** data: { inquiry: { company, contact_name|contactName, email, phone, zip_city|zipCity, business_type|businessType, assortments: [] | assortments_json, message }, adminUrl } */
  ownerNewInquiry({ inquiry, adminUrl } = {}) {
    const q = inquiry || {};
    let assortments = pick(q, 'assortments');
    if (!assortments && pick(q, 'assortments_json', 'assortmentsJson')) {
      try {
        assortments = JSON.parse(pick(q, 'assortments_json', 'assortmentsJson'));
      } catch {
        assortments = [];
      }
    }
    const company = pick(q, 'company') || '';
    const lines = [
      `Unternehmen: ${oneLine(company)}`,
      `Ansprechpartner: ${oneLine(pick(q, 'contactName', 'contact_name'))}`,
      `E-Mail: ${oneLine(pick(q, 'email'))}`,
      pick(q, 'phone') ? `Telefon: ${oneLine(pick(q, 'phone'), 40)}` : null,
      pick(q, 'zipCity', 'zip_city') ? `PLZ / Ort: ${oneLine(pick(q, 'zipCity', 'zip_city'))}` : null,
      pick(q, 'businessType', 'business_type') ? `Geschäftsart: ${oneLine(pick(q, 'businessType', 'business_type'))}` : null,
      Array.isArray(assortments) && assortments.length ? `Interesse an: ${assortments.map((a) => oneLine(a, 80)).join(', ')}` : null,
    ].filter(Boolean);
    const message = pick(q, 'message') || '';
    const url = safeUrl(adminUrl);
    const subject = `Neue Händleranfrage: ${oneLine(company, 100)}`;
    const text = `Neue Anfrage über den B2B-Händlerbereich:\n\n${lines.join('\n')}${
      message ? `\n\nNachricht:\n${String(message).slice(0, 4000)}` : ''
    }${url ? `\n\nIm Verwaltungsbereich öffnen: ${url}` : ''}\n\n—\n${SIGNATURE_TEXT}\n`;
    const html = layout({
      heading: 'Neue Händleranfrage',
      preheader: company,
      bodyHtml: `${lines.map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`).join('')}${
        message ? `<p style="margin:16px 0 4px;font-weight:bold">Nachricht</p>${paragraphsHtml(String(message).slice(0, 4000))}` : ''
      }${url ? button(url, 'Im Verwaltungsbereich öffnen') : ''}`,
    });
    return { subject, text, html };
  },

  /** data: { feedback: { app, kind, page_url|pageUrl, message, steps, expected, browser_info|browserInfo, email }, adminUrl } */
  ownerNewFeedback({ feedback, adminUrl } = {}) {
    const f = feedback || {};
    const kindLabel = { feedback: 'Feedback', bug: 'Fehlermeldung', idee: 'Idee' }[pick(f, 'kind')] || 'Feedback';
    const appLabel = { corporate: 'Website', shop: 'Online-Shop' }[pick(f, 'app')] || 'Website';
    const lines = [
      `Art: ${kindLabel}`,
      `Plattform: ${appLabel}`,
      pick(f, 'pageUrl', 'page_url') ? `Seite: ${oneLine(pick(f, 'pageUrl', 'page_url'), 300)}` : null,
      pick(f, 'email') ? `Rückmeldung an: ${oneLine(pick(f, 'email'))}` : 'Rückmeldung an: (keine E-Mail angegeben)',
      pick(f, 'browserInfo', 'browser_info') ? `Browser: ${oneLine(pick(f, 'browserInfo', 'browser_info'), 300)}` : null,
    ].filter(Boolean);
    const blocks = [
      ['Nachricht', pick(f, 'message')],
      ['Schritte zum Nachvollziehen', pick(f, 'steps')],
      ['Erwartetes Verhalten', pick(f, 'expected')],
    ].filter(([, v]) => v);
    const url = safeUrl(adminUrl);
    const subject = `Neue Rückmeldung: ${kindLabel} – ${appLabel}`;
    const text = `${lines.join('\n')}\n\n${blocks.map(([k, v]) => `${k}:\n${String(v).slice(0, 4000)}`).join('\n\n')}${
      url ? `\n\nIm Verwaltungsbereich öffnen: ${url}` : ''
    }\n\n—\n${SIGNATURE_TEXT}\n`;
    const html = layout({
      heading: `Neue Rückmeldung: ${kindLabel}`,
      preheader: appLabel,
      bodyHtml: `${lines.map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`).join('')}${blocks
        .map(([k, v]) => `<p style="margin:16px 0 4px;font-weight:bold">${escapeHtml(k)}</p>${paragraphsHtml(String(v).slice(0, 4000))}`)
        .join('')}${url ? button(url, 'Im Verwaltungsbereich öffnen') : ''}`,
    });
    return { subject, text, html };
  },

  /** data: { url, ttlHours = 72 } */
  newsletterConfirm({ url, ttlHours = 72 } = {}) {
    const subject = 'Bitte bestätigen Sie Ihre Newsletter-Anmeldung – Hasret Nuts';
    const intro = 'für diese E-Mail-Adresse wurde eine Anmeldung zum Newsletter von Hasret Nuts angefordert. Bitte bestätigen Sie die Anmeldung über den folgenden Link.';
    const note = `Ohne Ihre Bestätigung erhalten Sie keine weiteren E-Mails von uns. Der Link ist ${ttlHours} Stunden gültig. Eine Abmeldung ist jederzeit möglich. Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail bitte.`;
    return {
      subject,
      text: textMail(['Guten Tag,', '', intro, '', safeUrl(url), '', note]),
      html: layout({
        heading: 'Newsletter-Anmeldung bestätigen',
        preheader: 'Nur noch ein Klick zur Bestätigung.',
        bodyHtml: `<p style="margin:0 0 16px">Guten Tag,</p>${paragraphsHtml(intro)}${button(url, 'Anmeldung bestätigen')}${paragraphsHtml(note)}`,
      }),
    };
  },
};

module.exports = { templates, escapeHtml, euro, SIGNATURE_TEXT, layout, safeUrl };
