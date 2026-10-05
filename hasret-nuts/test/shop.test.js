'use strict';
/**
 * Tests des Online-Shops (BUILD-SHOP): Seiten, Preise, Warenkorb, Bundle, Rabattcodes,
 * Bestellanfrage, Sicherheit (CSRF, XSS, SQL-Injection), SEO, Allergen-Filter, JSON-LD,
 * Newsletter-Double-Opt-in und Feedback.
 *   node --test test/shop.test.js
 */
const helpers = require('./helpers'); // zuerst laden (setzt NODE_ENV=test)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../shared/catalog');
const { formatEuro } = require('../shared/views');

const { startApp, client, lastMail, extractToken, pathOf } = helpers;

/** Preis als Regex (geschütztes Leerzeichen vor €). */
function priceRe(cents) {
  return new RegExp(formatEuro(cents).replace(' ', '\\s').replace('.', '\\.').replace('€', '€'));
}

function resultsSection(html) {
  const start = html.indexOf('data-results');
  const end = html.indexOf('legal-line', start);
  return html.slice(start, end > start ? end : undefined);
}

function insertCodes(db) {
  const ins = db.prepare(`INSERT INTO discount_codes (code, type, value, min_subtotal_cents, starts_at, ends_at, max_uses, once_per_email, active, description)
    VALUES (@code, @type, @value, @min, @starts, @ends, @max, @once, @active, @desc)`);
  const rows = [
    { code: 'WILLKOMMEN10', type: 'percent', value: 10, min: 2000, starts: null, ends: null, max: null, once: 1, active: 1, desc: 'Willkommen' },
    { code: 'MESSE2026', type: 'fixed', value: 500, min: 3000, starts: null, ends: null, max: null, once: 0, active: 1, desc: 'Messe' },
    { code: 'ABGELAUFEN5', type: 'fixed', value: 500, min: 0, starts: null, ends: '2020-01-01T00:00:00.000Z', max: null, once: 0, active: 1, desc: 'alt' },
    { code: 'LIMIT1', type: 'percent', value: 5, min: 0, starts: null, ends: null, max: 1, once: 0, active: 1, desc: 'limitiert' },
  ];
  for (const r of rows) ins.run(r);
}

async function addToCart(c, form, path = '/produkt/leblebi') {
  await c.get(path); // CSRF-Token + Sitzung
  return c.post('/warenkorb/hinzufuegen', form);
}

const CHECKOUT_FORM = {
  name: 'Ayşe Yılmaz',
  email: 'kundin@example.com',
  phone: '+49 8331 123456',
  delivery: 'versand',
  street: 'Maximilianstraße 5',
  zip: '87700',
  city: 'Memmingen',
  country: 'DE',
  payment: 'ueberweisung',
  message: 'Bitte gut verpacken.',
  privacy: 'on',
  agb: 'on',
};

/* =================================================================== Haupt-App */
describe('Shop', () => {
  let app;
  before(async () => {
    app = await startApp('shop', { env: { ALLOW_INDEXING: 'true' } });
    insertCodes(app.db);
  });
  after(async () => {
    if (app) await app.close();
  });

  it('liefert alle öffentlichen Seiten mit Status 200 und passenden Titeln', async () => {
    const c = client(app.baseUrl);
    const pages = [
      ['/', /Hasret Nuts Shop/],
      ['/kategorie/traditionelle-suesswaren', /Sarma Lokum/],
      ['/kategorie/feinkost', /Turşu/],
      ['/kategorie/nuesse-knabberzeug', /Pistazien/],
      ['/kategorie/trend-suesswaren', /Labubu/],
      ['/angebote', /Angebote/],
      ['/allergene', /Allergene auf einen Blick/],
      ['/suche?q=lokum', /Suche/],
      ['/warenkorb', /Warenkorb/],
      ['/feedback', /Feedback/],
      ['/impressum', /Impressum/],
      ['/datenschutz', /Datenschutz/],
      ['/agb', /Geschäftsbedingungen/],
      ['/widerruf', /Widerruf/],
      ['/versand-zahlung', /Versand/],
      ['/cookies', /Cookie/],
    ];
    for (const p of catalog.getProducts()) pages.push([`/produkt/${p.slug}`, new RegExp(p.name.split(' ')[0])]);
    for (const [path, re] of pages) {
      const r = await c.get(path);
      assert.equal(r.status, 200, `${path} → ${r.status}`);
      const title = (/<title>([^<]*)<\/title>/.exec(r.text) || [])[1] || '';
      assert.match(title, re, `${path}: Titel "${title}"`);
      assert.match(r.text, /<html lang="de"/);
      assert.ok(!/<script>(?!\s*$)/.test(r.text.replace(/<script nonce=[^>]+>/g, '')), `${path}: Inline-Skript ohne Nonce`);
    }
    const nf = await c.get('/produkt/gibt-es-nicht');
    assert.equal(nf.status, 404);
  });

  it('zeigt auf jeder Produktseite die Preise aus catalog.json', async () => {
    const c = client(app.baseUrl);
    for (const p of catalog.getProducts()) {
      const r = await c.get(`/produkt/${p.slug}`);
      for (const v of p.variants) {
        assert.match(r.text, priceRe(v.priceCents), `${p.slug}/${v.sku}: Preis ${formatEuro(v.priceCents)} fehlt`);
      }
    }
    const home = await c.get('/');
    assert.match(home.text, /ab 7,00\s€/, 'Startseite: „ab“-Preis für Sarma Lokum');
    assert.match(home.text, /12,50\s€ \/ kg|19,50\s€ \/ kg/, 'Grundpreis wird aus weightG berechnet');
  });

  it('legt per Formular in den Warenkorb und berechnet die Zwischensumme serverseitig', async () => {
    const c = client(app.baseUrl);
    let r = await addToCart(c, { sku: 'leblebi-200g', qty: '2', next: '/warenkorb' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/warenkorb');
    r = await addToCart(c, { sku: 'sarma-lokum-pistazie', qty: '1' }, '/produkt/premium-sarma-lokum');
    assert.equal(r.status, 303);
    const cart = await c.get('/warenkorb');
    assert.equal(cart.status, 200);
    assert.match(cart.text, /Leblebi/);
    assert.match(cart.text, /Pistazie/);
    assert.match(cart.text, /13,00\s€/, '2 × 2,50 € + 8,00 € = 13,00 €');
    const api = await c.get('/api/warenkorb');
    assert.deepEqual(api.json(), { count: 3, subtotalCents: 1300 });
    // Menge ändern und entfernen
    const key = /name="key" value="([^"]+)"/.exec(cart.text)[1];
    r = await c.post('/warenkorb/aendern', { key, step: 'inc' });
    assert.equal(r.status, 303);
    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 4, subtotalCents: 1550 });
    await c.get('/warenkorb');
    r = await c.post('/warenkorb/entfernen', { key });
    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 1, subtotalCents: 800 });
    // Header-Zähler
    const page = await c.get('/');
    assert.match(page.text, /aria-label="Warenkorb, 1 Artikel"/);
  });

  it('ignoriert manipulierte Preise und weist unbekannte SKUs zurück', async () => {
    const c = client(app.baseUrl);
    await addToCart(c, { sku: 'pistazien-200g', qty: '1', price: '1', priceCents: '1', unit_price_cents: '1', name: 'Gratis', subtotal: '0' });
    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 1, subtotalCents: 390 });
    let r = await addToCart(c, { sku: 'gefaelschte-sku', qty: '1' });
    assert.equal(r.status, 303);
    r = await c.post('/warenkorb/hinzufuegen', { sku: ['pistazien-200g', 'leblebi-200g'], qty: '1' });
    r = await c.post('/warenkorb/hinzufuegen', { sku: '../../etc/passwd', qty: '1' });
    r = await c.post('/warenkorb/hinzufuegen', { sku: 'pistazien-200g', qty: '-5' });
    r = await c.post('/warenkorb/hinzufuegen', { sku: 'pistazien-200g', qty: '1000' });
    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 1, subtotalCents: 390 }, 'Warenkorb unverändert');
    const json = await c.request('POST', '/warenkorb/hinzufuegen', {
      body: new URLSearchParams({ sku: 'gibts-nicht', qty: '1', _csrf: c.csrfToken }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    });
    assert.equal(json.status, 422);
    assert.equal(json.json().ok, false);
    // JSON-Erfolg (Fly-to-Cart)
    const ok = await c.request('POST', '/warenkorb/hinzufuegen', {
      body: new URLSearchParams({ sku: 'erdnuesse-200g', qty: '2', priceCents: '1', _csrf: c.csrfToken }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    });
    assert.equal(ok.status, 200);
    assert.deepEqual({ ok: ok.json().ok, count: ok.json().count, subtotalCents: ok.json().subtotalCents }, { ok: true, count: 3, subtotalCents: 390 + 440 });
  });

  it('verlangt beim Messe-Bundle genau drei gültige Sorten (Duplikate erlaubt)', async () => {
    const c = client(app.baseUrl);
    await c.get('/produkt/sarma-lokum-messe-bundle');
    const post = (bundle) =>
      c.request('POST', '/warenkorb/hinzufuegen', {
        body: (() => {
          const p = new URLSearchParams({ sku: 'sarma-lokum-messe-bundle', qty: '1', _csrf: c.csrfToken });
          for (const b of bundle) p.append('bundle', b);
          return p.toString();
        })(),
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      });
    let r = await post(['sarma-lokum-pistazie', 'sarma-lokum-rose']);
    assert.equal(r.status, 422, 'nur zwei Sorten');
    r = await post(['sarma-lokum-pistazie', 'sarma-lokum-rose', 'sarma-lokum-kokos', 'sarma-lokum-rose']);
    assert.equal(r.status, 422, 'vier Sorten');
    r = await post(['sarma-lokum-pistazie', 'sarma-lokum-rose', 'leblebi-200g']);
    assert.equal(r.status, 422, 'fremdes Produkt im Bundle');
    r = await post(['sarma-lokum-pistazie', 'sarma-lokum-rose', '']);
    assert.equal(r.status, 422, 'leere Auswahl');
    r = await post(['sarma-lokum-pistazie', 'sarma-lokum-pistazie', 'sarma-lokum-kokos']);
    assert.equal(r.status, 200);
    assert.equal(r.json().subtotalCents, 2000, 'Bundle-Preis aus dem Katalog');
    const cart = await c.get('/warenkorb');
    assert.match(cart.text, /Pistazie · Pistazie · Kokos/);
    assert.match(cart.text, /20,00\s€/);
    // Ohne JavaScript: Fehler → zurück zur Produktseite
    const bad = await c.post('/warenkorb/hinzufuegen', { sku: 'sarma-lokum-messe-bundle', bundle: ['sarma-lokum-rose'], back: '/produkt/sarma-lokum-messe-bundle' });
    assert.equal(bad.status, 303);
    assert.equal(bad.location, '/produkt/sarma-lokum-messe-bundle');
  });

  it('wendet gültige Rabattcodes an und meldet ungültige allgemein', async () => {
    const c = client(app.baseUrl);
    await addToCart(c, { sku: 'karadut-ozu-gross', qty: '2' }, '/produkt/karadut-ozu'); // 24,00 €
    await c.get('/warenkorb');
    let r = await c.post('/warenkorb/rabatt', { code: 'gibtsnicht' });
    assert.equal(r.status, 303);
    let page = await c.get('/warenkorb');
    assert.match(page.text, /nicht gültig oder derzeit nicht einlösbar/);
    const generic = /nicht gültig oder derzeit nicht einlösbar/;
    r = await c.post('/warenkorb/rabatt', { code: 'ABGELAUFEN5' });
    page = await c.get('/warenkorb');
    assert.match(page.text, generic, 'abgelaufener Code → gleiche allgemeine Meldung');
    r = await c.post('/warenkorb/rabatt', { code: 'willkommen10' });
    page = await c.get('/warenkorb');
    assert.match(page.text, /Der Code WILLKOMMEN10 wurde angewendet/);
    assert.match(page.text, /−2,40\s€/, '10 % von 24,00 €');
    assert.match(page.text, /21,60\s€/);
    // entfernen
    r = await c.post('/warenkorb/rabatt/entfernen', {});
    page = await c.get('/warenkorb');
    assert.doesNotMatch(page.text, /−2,40/);
    // JSON-Variante
    const j = await c.request('POST', '/warenkorb/rabatt', {
      body: new URLSearchParams({ code: 'MESSE2026', _csrf: c.csrfToken }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    });
    assert.equal(j.status, 422, 'MESSE2026 erst ab 30 €');
    assert.match(j.json().error, /ab einem Warenwert von 30,00\s€/);
  });

  it('erzwingt den Mindestbestellwert und entfernt den Code, wenn der Warenwert sinkt', async () => {
    const c = client(app.baseUrl);
    await addToCart(c, { sku: 'leblebi-200g', qty: '2' }); // 5,00 €
    await c.get('/warenkorb');
    await c.post('/warenkorb/rabatt', { code: 'WILLKOMMEN10' });
    let page = await c.get('/warenkorb');
    assert.match(page.text, /gilt ab einem Warenwert von 20,00\s€\. Es fehlen noch 15,00\s€/);
    await addToCart(c, { sku: 'karadut-ozu-gross', qty: '2' }, '/produkt/karadut-ozu'); // + 24,00 €
    await c.get('/warenkorb');
    await c.post('/warenkorb/rabatt', { code: 'WILLKOMMEN10' });
    page = await c.get('/warenkorb');
    assert.match(page.text, /−2,90\s€/);
    const key = /name="key" value="(karadut-ozu-gross)"/.exec(page.text)[1];
    await c.post('/warenkorb/entfernen', { key });
    page = await c.get('/warenkorb');
    assert.match(page.text, /unter 20,00\s€ – der Code WILLKOMMEN10 wurde deshalb entfernt/);
  });

  it('legt eine Bestellanfrage mit Serverpreisen an, versendet zwei Mails und leert den Warenkorb', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    await addToCart(c, { sku: 'tursu-lila-gemuese', qty: '2', price: '1' }, '/produkt/hausgemachte-tursu'); // 17,80
    await c.get('/produkt/sarma-lokum-messe-bundle');
    await c.post('/warenkorb/hinzufuegen', { sku: 'sarma-lokum-messe-bundle', bundle: ['sarma-lokum-rose', 'sarma-lokum-kokos', 'sarma-lokum-haselnuss'] }); // 20,00
    await c.get('/warenkorb');
    await c.post('/warenkorb/rabatt', { code: 'WILLKOMMEN10' });
    const kasse = await c.get('/kasse');
    assert.equal(kasse.status, 200);
    assert.match(kasse.text, /Bestellung unverbindlich anfragen/);
    assert.match(kasse.text, /37,80\s€/);
    const r = await c.post('/kasse', { ...CHECKOUT_FORM, total: '1', subtotal_cents: '1' });
    assert.equal(r.status, 303, r.text.slice(0, 300));
    assert.equal(r.location, '/bestellung/danke');

    const order = app.db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    assert.match(order.public_id, new RegExp(`^HN-${new Date().getFullYear()}-0001$`));
    assert.equal(order.subtotal_cents, 3780);
    assert.equal(order.discount_cents, 378);
    assert.equal(order.total_cents, 3402);
    assert.equal(order.discount_code, 'WILLKOMMEN10');
    assert.equal(order.delivery, 'versand');
    assert.equal(order.status, 'neu');
    const items = app.db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
    assert.equal(items.length, 2);
    assert.deepEqual(items.map((i) => [i.sku, i.unit_price_cents, i.qty, i.line_total_cents]), [
      ['tursu-lila-gemuese', 890, 2, 1780],
      ['sarma-lokum-messe-bundle', 2000, 1, 2000],
    ]);
    assert.deepEqual(JSON.parse(items[1].bundle_json).map((b) => b.sku), ['sarma-lokum-rose', 'sarma-lokum-kokos', 'sarma-lokum-haselnuss']);
    const code = app.db.prepare("SELECT * FROM discount_codes WHERE code = 'WILLKOMMEN10'").get();
    assert.equal(code.uses, 1);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM discount_redemptions WHERE code_id = ?').get(code.id).n, 1);

    assert.equal(app.outbox.length, 2);
    const customer = lastMail(app.outbox, 'kundin@example.com');
    assert.ok(customer, 'Bestätigung an die Kundin');
    assert.match(customer.subject, /Bestellanfrage HN-/);
    assert.match(customer.text, /unverbindliche Bestellanfrage/);
    const owner = lastMail(app.outbox, app.config.mail.ownerEmail);
    assert.ok(owner, 'Benachrichtigung an den Inhaber');
    assert.match(owner.text, /Turşu|Ev Yapımı/);

    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 0, subtotalCents: 0 });
    const thanks = await c.get('/bestellung/danke');
    assert.equal(thanks.status, 200);
    assert.match(thanks.text, new RegExp(order.public_id));
    assert.match(thanks.headers.get('x-robots-tag') || '', /noindex/);

    // Zweite Bestellung: WILLKOMMEN10 gilt nur einmal pro E-Mail-Adresse
    await addToCart(c, { sku: 'karadut-ozu-gross', qty: '2' }, '/produkt/karadut-ozu');
    await c.get('/warenkorb');
    await c.post('/warenkorb/rabatt', { code: 'WILLKOMMEN10' });
    await c.get('/kasse');
    const again = await c.post('/kasse', { ...CHECKOUT_FORM });
    assert.equal(again.status, 409);
    assert.match(again.text, /mit Ihrer E-Mail-Adresse bereits eingelöst/);
    const retry = await c.post('/kasse', { ...CHECKOUT_FORM });
    assert.equal(retry.status, 303, 'ohne Rabatt erneut absendbar');
    const second = app.db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    assert.match(second.public_id, /-0002$/);
    assert.equal(second.discount_cents, 0);
    assert.equal(second.total_cents, 2400);
  });

  it('prüft Pflichtfelder der Kasse und erlaubt Abholung ohne Adresse', async () => {
    const c = client(app.baseUrl);
    await addToCart(c, { sku: 'leblebi-200g', qty: '1' });
    await c.get('/kasse');
    let r = await c.post('/kasse', { name: 'A', email: 'kaputt', delivery: 'versand', payment: 'bar' });
    assert.equal(r.status, 422);
    assert.match(r.text, /Bitte prüfen Sie die markierten Felder/);
    assert.match(r.text, /gültige E-Mail-Adresse/);
    assert.match(r.text, /Straße und Hausnummer/);
    assert.match(r.text, /Barzahlung ist nur bei Abholung/);
    assert.match(r.text, /Datenschutzerklärung zur Kenntnis/);
    r = await c.post('/kasse', { name: 'Eda Kaya', email: 'eda@example.com', delivery: 'abholung', payment: 'bar', privacy: 'on', agb: 'on' });
    assert.equal(r.status, 303);
    const o = app.db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    assert.equal(o.delivery, 'abholung');
    assert.equal(o.street, null);
    assert.equal(o.payment_pref, 'Barzahlung bei Abholung');
    // Leerer Warenkorb → zurück zum Warenkorb
    const empty = await c.get('/kasse');
    assert.equal(empty.status, 303);
    assert.equal(empty.location, '/warenkorb');
  });

  it('lehnt zustandsändernde Anfragen ohne gültiges CSRF-Token ab (403)', async () => {
    const fresh = client(app.baseUrl);
    let r = await fresh.post('/warenkorb/hinzufuegen', { sku: 'leblebi-200g', qty: '1' });
    assert.equal(r.status, 403);
    const c = client(app.baseUrl);
    await c.get('/produkt/leblebi');
    r = await c.post('/warenkorb/hinzufuegen', { sku: 'leblebi-200g', qty: '1', _csrf: 'falsch' });
    assert.equal(r.status, 403);
    r = await c.post('/kasse', { ...CHECKOUT_FORM, _csrf: '' });
    assert.equal(r.status, 403);
    r = await c.post('/newsletter', { email: 'x@example.com', _csrf: 'nope' });
    assert.equal(r.status, 403);
    assert.deepEqual((await c.get('/api/warenkorb')).json(), { count: 0, subtotalCents: 0 });
  });

  it('escaped Suchbegriffe (XSS) und findet Produkte trotz Sonderzeichen', async () => {
    const c = client(app.baseUrl);
    const evil = '<script>alert(1)</script>"><img src=x onerror=alert(2)>';
    const r = await c.get(`/suche?q=${encodeURIComponent(evil)}`);
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('<script>alert(1)'), 'Skript nicht unescaped');
    assert.ok(!r.text.includes('<img src=x'), 'Attribut-Injection nicht möglich');
    assert.match(r.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
    const tursu = await c.get('/suche?q=tursu');
    assert.match(tursu.text, /<mark>Turşu<\/mark>/, '„tursu“ findet und markiert „Turşu“');
    const ozu = await c.get('/suche?q=%C3%B6z%C3%BC');
    assert.match(ozu.text, /Karadut/);
    const json = await c.get('/suche?q=pistaz', { headers: { accept: 'application/json' } });
    const data = json.json();
    assert.ok(data.count >= 1);
    assert.ok(data.results.some((x) => x.href === '/produkt/pistazien'));
  });

  it('behandelt SQL-Injection-artige Eingaben als harmlose Daten', async () => {
    const c = client(app.baseUrl);
    const inj = "' OR 1=1; DROP TABLE orders; --";
    let r = await c.get(`/suche?q=${encodeURIComponent(inj)}`);
    assert.equal(r.status, 200);
    await addToCart(c, { sku: 'leblebi-200g', qty: '1' });
    await c.get('/warenkorb');
    r = await c.post('/warenkorb/rabatt', { code: "' OR '1'='1" });
    const page = await c.get('/warenkorb');
    assert.match(page.text, /nicht gültig oder derzeit nicht einlösbar/);
    r = await c.post('/warenkorb/hinzufuegen', { sku: "leblebi-200g' OR '1'='1", qty: '1' });
    await c.get('/feedback');
    r = await c.post('/feedback', { kind: 'feedback', message: inj });
    assert.equal(r.status, 303);
    const fb = app.db.prepare('SELECT message FROM feedback ORDER BY id DESC LIMIT 1').get();
    assert.equal(fb.message, inj);
    assert.ok(app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n >= 0, 'Tabelle orders existiert weiterhin');
    r = await c.get(`/kategorie/nuesse-knabberzeug?ohne=${encodeURIComponent(inj)}&sortierung=${encodeURIComponent(inj)}`);
    assert.equal(r.status, 200);
  });

  it('liefert robots.txt und sitemap.xml mit den richtigen Inhalten', async () => {
    const c = client(app.baseUrl);
    const robots = await c.get('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('content-type'), /text\/plain/);
    for (const p of ['/konto', '/admin', '/warenkorb', '/kasse', '/bestellung', '/api', '/suche']) {
      assert.match(robots.text, new RegExp(`^Disallow: ${p}$`, 'm'), `Disallow ${p}`);
    }
    assert.match(robots.text, new RegExp(`^Sitemap: ${app.baseUrl}/sitemap.xml$`, 'm'));
    const sm = await c.get('/sitemap.xml');
    assert.equal(sm.status, 200);
    assert.match(sm.headers.get('content-type'), /xml/);
    assert.match(sm.text, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    for (const loc of ['/', '/kategorie/feinkost', '/produkt/premium-sarma-lokum', '/produkt/labubu-schokolade', '/allergene', '/angebote', '/impressum', '/datenschutz', '/cookies']) {
      assert.ok(sm.text.includes(`<loc>${app.baseUrl}${loc}</loc>`), `Sitemap enthält ${loc}`);
    }
    assert.match(sm.text, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    assert.ok(!sm.text.includes('/warenkorb') && !sm.text.includes('/kasse'), 'keine privaten Seiten');
  });

  it('blendet Produkte mit ausgeschlossenen Allergenen aus (Kategorie und Übersicht)', async () => {
    const c = client(app.baseUrl);
    const all = resultsSection((await c.get('/kategorie/nuesse-knabberzeug')).text);
    assert.ok(all.includes('/produkt/pistazien') && all.includes('/produkt/erdnuesse') && all.includes('/produkt/leblebi'));
    const noNuts = resultsSection((await c.get('/kategorie/nuesse-knabberzeug?ohne=schalenfruechte')).text);
    assert.ok(!noNuts.includes('/produkt/pistazien'), 'Pistazien (Schalenfrüchte) ausgeblendet');
    assert.ok(noNuts.includes('/produkt/leblebi'));
    assert.ok(noNuts.includes('/produkt/erdnuesse'));
    const both = resultsSection((await c.get('/kategorie/nuesse-knabberzeug?ohne=schalenfruechte&ohne=erdnuesse')).text);
    assert.ok(!both.includes('/produkt/erdnuesse') && !both.includes('/produkt/pistazien'));
    assert.match(both, /2 Produkte/);
    // Spurenhinweise: Labubu-Schokolade „kann Spuren von Schalenfrüchten enthalten“
    const trend = resultsSection((await c.get('/kategorie/trend-suesswaren?ohne=schalenfruechte')).text);
    assert.ok(trend.includes('/produkt/labubu-schokolade'));
    const trendTraces = resultsSection((await c.get('/kategorie/trend-suesswaren?ohne=schalenfruechte&spuren=1')).text);
    assert.ok(!trendTraces.includes('/produkt/labubu-schokolade'));
    // Preisfilter + Sortierung
    const cheap = resultsSection((await c.get('/kategorie/nuesse-knabberzeug?preis=bis5&sortierung=preis-ab')).text);
    assert.ok(cheap.indexOf('/produkt/pistazien') < cheap.indexOf('/produkt/erdnuesse'), 'Preis absteigend');
    // Allergen-Übersicht
    const ov = await c.get('/allergene?ohne=milch');
    assert.match(ov.text, /vorläufig – vom Inhaber anhand der Etiketten zu bestätigen/);
    const result = ov.text.slice(ov.text.indexOf('af__result'), ov.text.indexOf('allergen-matrix'));
    assert.ok(!result.includes('/produkt/labubu-schokolade'), 'Labubu enthält Milch');
    assert.ok(result.includes('/produkt/leblebi'));
    assert.match(ov.text, /<caption id="mx-caption">/);
  });

  it('bettet strukturierte Daten (Product mit Preis, BreadcrumbList) ein – ohne Bewertungen', async () => {
    const c = client(app.baseUrl);
    const blocks = (html) => [...html.matchAll(/<script type="application\/ld\+json" nonce="[^"]+">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const single = blocks((await c.get('/produkt/pistazien')).text);
    const prod = single.find((b) => b['@type'] === 'Product');
    assert.ok(prod, 'Product vorhanden');
    assert.equal(prod.offers['@type'], 'Offer');
    assert.equal(prod.offers.price, '3.90');
    assert.equal(prod.offers.priceCurrency, 'EUR');
    assert.equal(prod.offers.availability, 'https://schema.org/InStock');
    assert.ok(!('aggregateRating' in prod) && !('review' in prod));
    assert.ok(single.some((b) => b['@type'] === 'BreadcrumbList'));
    const multi = blocks((await c.get('/produkt/premium-sarma-lokum')).text).find((b) => b['@type'] === 'Product');
    assert.equal(multi.offers['@type'], 'AggregateOffer');
    assert.equal(multi.offers.lowPrice, '7.00');
    assert.equal(multi.offers.highPrice, '8.00');
    assert.equal(multi.offers.offerCount, 4);
    const home = blocks((await c.get('/')).text);
    assert.ok(home.some((b) => b['@graph'] && b['@graph'].some((g) => g['@type'] === 'OnlineStore')));
    const prodPage = await c.get('/produkt/labubu-schokolade');
    assert.match(prodPage.text, /<link rel="canonical" href="[^"]+\/produkt\/labubu-schokolade">/);
    assert.match(prodPage.text, /weder offizieller Partner noch Lizenznehmer/);
  });

  it('zeigt Allergene, den Vorläufig-Hinweis und Foto-Platzhalter auf der Produktseite', async () => {
    const c = client(app.baseUrl);
    const r = await c.get('/produkt/labubu-schokolade');
    assert.match(r.text, /Enthält:<\/span> <strong>Milch \(einschließlich Laktose\), Sojabohnen<\/strong>/);
    assert.match(r.text, /Kann Spuren enthalten von:<\/span> Schalenfrüchte/);
    assert.match(r.text, /vorläufig – vom Inhaber anhand der Etiketten zu bestätigen/);
    assert.match(r.text, /href="\/allergene"/);
    assert.match(r.text, /\[FOTO-PLATZHALTER:/);
    assert.match(r.text, /Foto S-P09-A/);
  });

  it('Newsletter: Double-Opt-in mit Bestätigungsseite (GET verbraucht kein Token)', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    await c.get('/');
    const r = await c.post('/newsletter', { email: 'Abo@Example.com' });
    assert.equal(r.status, 303);
    const mail = lastMail(app.outbox, 'abo@example.com');
    assert.ok(mail, 'Bestätigungsmail');
    const token = extractToken(mail.text);
    assert.ok(token);
    const link = mail.text.match(/https?:\/\/\S+bestaetigen\?token=\S+/)[0];
    const get1 = await c.get(pathOf(link));
    assert.equal(get1.status, 200);
    assert.match(get1.text, /Anmeldung bestätigen/);
    const get2 = await c.get(pathOf(link));
    assert.match(get2.text, /Anmeldung bestätigen/, 'GET hat das Token nicht verbraucht');
    let row = app.db.prepare("SELECT * FROM newsletter WHERE email = 'abo@example.com'").get();
    assert.equal(row.confirmed_at, null);
    const post = await c.post('/newsletter/bestaetigen', { token });
    assert.equal(post.status, 200);
    assert.match(post.text, /Ihre Anmeldung ist bestätigt/);
    row = app.db.prepare("SELECT * FROM newsletter WHERE email = 'abo@example.com'").get();
    assert.ok(row.confirmed_at);
    const reuse = await c.post('/newsletter/bestaetigen', { token });
    assert.equal(reuse.status, 410);
    // Gleiche Antwort für bereits bestätigte Adresse, aber keine weitere Mail
    const n = app.outbox.length;
    const again = await c.request('POST', '/newsletter', {
      body: new URLSearchParams({ email: 'abo@example.com', _csrf: c.csrfToken }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    });
    assert.equal(again.status, 200);
    assert.match(again.json().message, /Fast geschafft/);
    assert.equal(app.outbox.length, n);
    // Abmelden
    await c.get('/newsletter/abmelden');
    const un = await c.post('/newsletter/abmelden', { email: 'abo@example.com' });
    assert.equal(un.status, 303);
    assert.ok(app.db.prepare("SELECT unsubscribed_at FROM newsletter WHERE email = 'abo@example.com'").get().unsubscribed_at);
  });

  it('speichert Feedback und Fehlermeldungen und benachrichtigt den Inhaber', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    const page = await c.get('/feedback?seite=%2Fprodukt%2Fleblebi');
    assert.match(page.text, /value="[^"]*\/produkt\/leblebi"/);
    let r = await c.post('/feedback', { kind: 'bug', message: '', email: 'kaputt' });
    assert.equal(r.status, 422);
    assert.match(r.text, /Bitte schreiben Sie uns Ihre Nachricht/);
    r = await c.post('/feedback', {
      kind: 'bug',
      message: 'Der Button reagiert nicht.',
      steps: 'Sorte gewählt, Button geklickt',
      expected: 'Artikel im Warenkorb',
      page_url: '/produkt/leblebi',
      tech: 'on',
      screen: '390x844@3',
      email: 'tester@example.com',
    });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/feedback?gesendet=1');
    const row = app.db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 1').get();
    assert.equal(row.app, 'shop');
    assert.equal(row.kind, 'bug');
    assert.equal(row.steps, 'Sorte gewählt, Button geklickt');
    assert.match(row.browser_info, /Bildschirm 390x844@3/);
    const mail = lastMail(app.outbox, app.config.mail.ownerEmail);
    assert.ok(mail);
    assert.match(mail.subject, /Fehlermeldung – Online-Shop/);
    const done = await c.get('/feedback?gesendet=1');
    assert.match(done.text, /Vielen Dank für Ihre Nachricht/);
    // Honeypot: Erfolg vortäuschen, nichts speichern
    const before = app.db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n;
    await c.get('/feedback');
    r = await c.post('/feedback', { kind: 'feedback', message: 'Spam', website: 'http://spam.example' });
    assert.equal(r.status, 303);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM feedback').get().n, before);
  });

  it('zeigt öffentliche Codes auf /angebote, aber nie den Newsletter-Code', async () => {
    const c = client(app.baseUrl);
    const r = await c.get('/angebote');
    assert.match(r.text, /WILLKOMMEN10/);
    assert.match(r.text, /MESSE2026/);
    assert.ok(!r.text.includes('SEHNSUCHT15'), 'SEHNSUCHT15 bleibt exklusiv');
    assert.match(r.text, /Code kopieren/);
    assert.match(r.text, /20,00\s€/, 'Bundle-Preis aus dem Katalog');
    assert.match(r.text, /1,00\s€ bis 4,00\s€/, 'Ersparnis berechnet');
  });

  it('beantwortet Warenkorb-Aktionen per JSON (Fly-to-Cart) mit Serverpreisen', async () => {
    const c = client(app.baseUrl);
    await c.get('/produkt/leblebi');
    let r = await c.postJson('/warenkorb/hinzufuegen', { sku: 'leblebi-200g', qty: 2, priceCents: 1 });
    assert.equal(r.status, 200);
    let data = r.json();
    assert.equal(data.ok, true);
    assert.equal(data.count, 2);
    assert.equal(data.subtotalCents, 500, '2 × 2,50 € aus dem Katalog');
    assert.match(data.message, /Leblebi/);
    r = await c.postJson('/warenkorb/hinzufuegen', { sku: 'gibt-es-nicht', qty: 1 });
    assert.ok(r.status >= 400 && r.status < 500);
    assert.equal(r.json().ok, false);
    r = await c.postJson('/warenkorb/hinzufuegen', { sku: 'sarma-lokum-messe-bundle', bundle: ['sarma-lokum-rose'] });
    assert.equal(r.status, 422);
    assert.equal(r.json().ok, false);
    const api = await c.get('/api/warenkorb');
    assert.match(api.headers.get('content-type'), /application\/json/);
    assert.match(api.headers.get('cache-control') || '', /no-store/);
    assert.deepEqual(api.json(), { count: 2, subtotalCents: 500 });
    const det = (await c.get('/api/warenkorb?details=1')).json();
    assert.equal(det.count, 2);
    assert.equal(det.lines.length, 1);
    assert.equal(det.lines[0].key, 'leblebi-200g');
    assert.equal(det.lines[0].qty, 2);
    assert.match(det.lines[0].line, /5,00\s€/);
    assert.match(det.subtotal, /5,00\s€/);
    assert.equal(det.discount, null);
    assert.equal(det.lines[0].href, '/produkt/leblebi');
    // Ohne gültiges Token auch per JSON kein Zugriff
    r = await c.postJson('/warenkorb/hinzufuegen', { sku: 'leblebi-200g' }, { headers: { 'x-csrf-token': 'falsch' } });
    assert.equal(r.status, 403);
  });

  it('legt bei ausgefülltem Honeypot keine Bestellung an', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    await addToCart(c, { sku: 'pistazien-200g', qty: '1' }, '/produkt/pistazien');
    await c.get('/kasse');
    const before = app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
    const r = await c.post('/kasse', { ...CHECKOUT_FORM, email: 'bot@example.com', website: 'https://spam.example' });
    assert.equal(r.status, 303);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, before);
    assert.equal(app.outbox.length, 0, 'keine Mails an Bots');
  });

  it('spiegelt den Freitext des Formulars nicht an die eingegebene Adresse', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    const victim = 'opfer@victim.example';
    const message = 'WICHTIG: Bitte zahlen Sie vorab unter https://zahlung.evil.example/pay?id=4711';
    await addToCart(c, { sku: 'leblebi-200g', qty: '1' }, '/produkt/leblebi');
    await c.get('/kasse');
    const r = await c.post('/kasse', { ...CHECKOUT_FORM, name: 'Kundenservice Hasret Nuts', email: victim, message });
    assert.equal(r.status, 303);
    const toVictim = app.outbox.filter((m) => m.toList.some((a) => a.toLowerCase() === victim));
    assert.equal(toVictim.length, 1);
    for (const m of toVictim) {
      assert.doesNotMatch(m.text, /evil\.example/, 'Freitext nicht in der Bestätigung (Text)');
      assert.doesNotMatch(m.html, /evil\.example/, 'Freitext nicht in der Bestätigung (HTML)');
      assert.match(m.text, /an Eyyüp Koca weitergeleitet/);
    }
    const toOwner = app.outbox.filter((m) => m.toList.some((a) => a.toLowerCase() === app.config.mail.ownerEmail.toLowerCase()));
    assert.equal(toOwner.length, 1);
    assert.match(toOwner[0].text, /zahlung\.evil\.example/, 'der Inhaber sieht die Nachricht weiterhin');
  });

  it('belegt die Kasse für angemeldete Kundinnen vor und verknüpft die Bestellung mit dem Konto', async () => {
    const auth = require('../shared/auth');
    const user = await auth.createUser({ email: 'stammkundin@example.com', password: 'Sehnsucht-Pistazie-2026', name: 'Elif Demir', emailVerified: true });
    const c = client(app.baseUrl);
    await c.get('/konto/anmelden');
    const login = await c.post('/konto/anmelden', { email: 'stammkundin@example.com', password: 'Sehnsucht-Pistazie-2026' });
    assert.equal(login.status, 303, 'Anmeldung erfolgreich');
    await addToCart(c, { sku: 'erdnuesse-200g', qty: '3' }, '/produkt/erdnuesse');
    const kasse = await c.get('/kasse');
    assert.equal(kasse.status, 200);
    assert.match(kasse.text, /value="stammkundin@example\.com"/);
    assert.match(kasse.text, /value="Elif Demir"/);
    const r = await c.post('/kasse', { ...CHECKOUT_FORM, name: 'Elif Demir', email: 'stammkundin@example.com' });
    assert.equal(r.status, 303);
    const order = app.db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    assert.equal(order.user_id, user.id);
    assert.equal(order.total_cents, 660, '3 × 2,20 €');
  });

  it('ersetzt Foto-Platzhalter durch echte Bilder, sobald im Katalog ein eigener Bildpfad steht', async () => {
    const c = client(app.baseUrl);
    const p = catalog.getProduct('pistazien');
    const packshot = p.photos.packshot;
    const original = packshot.src;
    try {
      packshot.src = '/static/img/produkte/S-P07-A.jpg';
      let r = await c.get('/produkt/pistazien');
      assert.match(r.text, /<img src="\/static\/img\/produkte\/S-P07-A\.jpg" alt="[^"]*" loading="(lazy|eager)" decoding="async">/);
      const ld = [...r.text.matchAll(/<script type="application\/ld\+json" nonce="[^"]+">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((b) => b['@type'] === 'Product');
      assert.ok(ld.image[0].endsWith('/static/img/produkte/S-P07-A.jpg'), 'JSON-LD nutzt das echte Produktfoto');
      assert.equal(ld.brand.name, 'Hasret Nuts');
      for (const bad of ['//evil.example/x.jpg', 'https://evil.example/x.jpg', 'javascript:alert(1)', '/static/../shared/config.js', '/static/x.jpg" onerror="alert(1)']) {
        packshot.src = bad;
        r = await c.get('/produkt/pistazien');
        assert.ok(!r.text.includes('evil.example') && !r.text.includes('javascript:alert') && !r.text.includes('onerror'), `unsicherer Pfad ignoriert: ${bad}`);
        assert.match(r.text, /FOTO-PLATZHALTER/);
      }
    } finally {
      if (original === undefined) delete packshot.src;
      else packshot.src = original;
    }
  });

  it('enthält keine gesundheitsbezogenen Angaben, keine Bewertungen und keine Google-Fonts-Aufrufe', async () => {
    const c = client(app.baseUrl);
    const paths = ['/', '/angebote', '/allergene', ...catalog.getCategories().map((k) => `/kategorie/${k.slug}`), ...catalog.getProducts().map((p) => `/produkt/${p.slug}`)];
    const forbidden = /\b(gesund\w*|Superfood|stärkt|reich an Vitamin\w*|Immunsystem|entgiftet|heilend)\b/i;
    for (const p of paths) {
      const r = await c.get(p);
      assert.equal(r.status, 200, p);
      const visible = r.text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
      const hit = visible.match(forbidden);
      assert.ok(!hit, `${p}: unzulässige Angabe „${hit && hit[0]}“`);
      assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(r.text), `${p}: keine Google-Fonts`);
      assert.ok(!/aggregateRating|ratingValue|reviewCount/.test(r.text), `${p}: keine Bewertungen`);
      assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(r.text), `${p}: keine Inline-Event-Handler`);
      for (const m of r.text.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>/g)) {
        assert.match(m[1], /nonce="[^"]+"/, `${p}: Inline-Skript ohne Nonce`);
      }
    }
  });
});

/* ======================================================= Ratenlimit Rabattcodes */
describe('Shop – Schutz vor Code-Raten und Indexierung außerhalb der Produktion', () => {
  let app;
  before(async () => {
    app = await startApp('shop', { env: { RATE_LIMIT_DISCOUNT_MAX: '3' } });
  });
  after(async () => {
    if (app) await app.close();
  });

  it('begrenzt Rabattcode-Versuche (429 nach dem Limit)', async () => {
    const c = client(app.baseUrl);
    await addToCart(c, { sku: 'leblebi-200g', qty: '1' });
    await c.get('/warenkorb');
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await c.post('/warenkorb/rabatt', { code: `RATEN${i}AA` });
      statuses.push(r.status);
    }
    assert.deepEqual(statuses.slice(0, 3), [303, 303, 303]);
    assert.equal(statuses[3], 429);
    assert.equal(statuses[4], 429);
  });

  it('sperrt robots.txt und setzt noindex, solange ALLOW_INDEXING nicht aktiv ist', async () => {
    const c = client(app.baseUrl);
    const robots = await c.get('/robots.txt');
    assert.equal(robots.text, 'User-agent: *\nDisallow: /\n');
    const home = await c.get('/');
    assert.match(home.text, /<meta name="robots" content="noindex, nofollow">/);
  });
});

/* ======================================================= Mail-Kontingent Bestellbestätigung */
describe('Shop – Bestellbestätigungen pro Empfänger begrenzt', () => {
  let app;
  before(async () => {
    app = await startApp('shop', { env: { RATE_LIMIT_MAIL_PER_ADDRESS_MAX: '3' } });
  });
  after(async () => {
    if (app) await app.close();
  });

  it('sendet höchstens 3 Bestätigungen pro Adresse, der Inhaber erhält jede Anfrage', async () => {
    const c = client(app.baseUrl);
    app.outbox.length = 0;
    const victim = 'opfer@victim.example';
    for (let i = 0; i < 4; i += 1) {
      await addToCart(c, { sku: 'leblebi-200g', qty: '1' });
      await c.get('/kasse');
      const r = await c.post('/kasse', { ...CHECKOUT_FORM, email: victim });
      assert.equal(r.status, 303, `Anfrage ${i + 1}`);
    }
    const to = (addr) => app.outbox.filter((m) => m.toList.some((a) => a.toLowerCase() === addr.toLowerCase()));
    assert.equal(to(victim).length, 3);
    assert.equal(to(app.config.mail.ownerEmail).length, 4);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, 4, 'Anfragen werden trotzdem gespeichert');
  });
});
