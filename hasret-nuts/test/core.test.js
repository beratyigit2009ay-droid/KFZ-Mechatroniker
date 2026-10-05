'use strict';
/**
 * Kern-Tests (FOUNDATION-CORE): Sicherheit, Sitzungen, Validierung, SEO, Mail, Katalog.
 *   cd hasret-nuts && node --test test/core.test.js
 */
const helpers = require('./helpers'); // zuerst laden (setzt NODE_ENV=test)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const config = require('../shared/config');
const { createBaseApp } = require('../shared/app-base');
const { notFound, errorHandler } = require('../shared/errors');
const security = require('../shared/security');
const auth = require('../shared/auth');
const { parse, schemas, z, optional, refinements } = require('../shared/validate');
const { jsonLdString, formatEuro, formatDate } = require('../shared/views');
const seo = require('../shared/seo');
const mailer = require('../shared/mailer');
const catalog = require('../shared/catalog');

const { startApp, startServer, client } = helpers;
const FIXTURES = path.join(__dirname, 'fixtures');
const CATALOG_ENV = {
  CATALOG_PATH: path.join(FIXTURES, 'catalog.json'),
  ALLERGENS_PATH: path.join(FIXTURES, 'allergens.json'),
  OFFERS_PATH: path.join(FIXTURES, 'offers.json'),
};
const PROD_ENV = {
  NODE_ENV: 'production',
  CORPORATE_BASE_URL: 'https://www.hasret-nuts.example',
  SHOP_BASE_URL: 'https://shop.hasret-nuts.example',
  SMTP_HOST: 'smtp.example.invalid',
  MAIL_FROM: 'Hasret Nuts <shop@hasret-nuts.example>',
  OWNER_EMAIL: 'inhaber@hasret-nuts.example',
  LOG_SALT: crypto.randomBytes(24).toString('hex'),
  TRUST_PROXY: '1',
};
const STRONG_PW = 'Sehnsucht-Memmingen-2026';

function sha256(v) {
  return crypto.createHash('sha256').update(v).digest('hex');
}

/** Test-App auf Basis von createBaseApp mit Hilfsrouten. */
function coreAppFactory() {
  const app = createBaseApp({ name: 'shop', appDir: path.join(FIXTURES, 'core-app') });
  app.get('/plain', (req, res) => res.render('plain.njk'));
  app.get('/meta-auto', async (req, res) => {
    await new Promise((r) => setTimeout(r, 5)); // Kontext bleibt über async hinweg erhalten
    res.render('plain.njk', { meta: seo.buildMeta({ title: 'Allergene', description: 'Übersicht der 14 Hauptallergene.' }) });
  });
  app.get('/form', (req, res) => res.render('form.njk'));
  app.post('/form', (req, res) => res.type('text').send(`ok:${req.body.value ?? ''}`));
  app.get('/csrf.json', (req, res) => res.json({ csrfToken: req.csrfToken() }));
  app.post('/api/echo', (req, res) => res.json({ ok: true, value: req.body.value ?? null }));
  app.post('/limited', security.rateLimits.forms, (req, res) => res.type('text').send('ok'));
  app.get('/login-as/:id', async (req, res) => {
    await req.regenerateSession({ keepData: true, userId: Number(req.params.id) });
    res.type('text').send('ok');
  });
  app.get('/unsafe-login/:id', (req, res) => {
    req.session.userId = Number(req.params.id); // ohne regenerateSession → Sicherheitsnetz greift
    res.type('text').send('ok');
  });
  app.post('/logout', async (req, res) => {
    await req.regenerateSession({ keepData: false });
    res.redirect(303, '/');
  });
  app.get('/whoami', (req, res) => res.json({ user: req.user, hasSession: Boolean(req.session.id) }));
  app.get('/set', (req, res) => {
    req.session.data.note = req.query.v;
    res.type('text').send('ok');
  });
  app.get('/get', (req, res) => res.json(req.session.data));
  app.get('/flash-set', (req, res) => {
    req.flash('success', 'Ihre Angaben wurden gespeichert.');
    res.redirect(303, '/flash-show');
  });
  app.get('/flash-show', (req, res) => res.render('flash.njk'));
  app.get('/boom', () => {
    throw new Error('geheimer Stacktrace-Inhalt');
  });
  app.get('/private', security.requireAuth, (req, res) => res.type('text').send('privat'));
  app.get('/admin-only', security.requireAdmin, (req, res) => res.type('text').send('admin'));
  app.get('/go', (req, res) => res.redirect(302, security.safeRedirectPath(req.query.next)));
  app.post('/hp', security.honeypot('website', { redirectTo: '/danke' }), (req, res) => res.type('text').send('echt'));
  app.get('/jsonld', (req, res) => res.render('jsonld.njk', { data: { '@type': 'Product', name: '</script><script>alert(1)</script>' } }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

/* ====================================================================== Einheiten */

describe('Passwort-Hashing (scrypt)', () => {
  it('Round-Trip: richtiges Passwort ok, falsches abgelehnt', async () => {
    const hash = await auth.hashPassword(STRONG_PW);
    assert.match(hash, /^scrypt\$65536\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    const parts = hash.split('$');
    assert.equal(Buffer.from(parts[4], 'base64').length, 16, '16-Byte-Salt');
    assert.equal(Buffer.from(parts[5], 'base64').length, 64, '64-Byte-Schlüssel');
    assert.equal(await auth.verifyPassword(STRONG_PW, hash), true);
    assert.equal(await auth.verifyPassword(`${STRONG_PW}x`, hash), false);
    assert.equal(await auth.verifyPassword('', hash), false);
    assert.notEqual(await auth.hashPassword(STRONG_PW), hash, 'jeder Hash hat ein eigenes Salt');
  });

  it('erkennt Manipulationen an Hash, Salt und Parametern', async () => {
    const hash = await auth.hashPassword(STRONG_PW);
    const parts = hash.split('$');
    const flip = (b64) => {
      const buf = Buffer.from(b64, 'base64');
      buf[0] ^= 0xff;
      return buf.toString('base64');
    };
    const tamperedHash = [...parts.slice(0, 5), flip(parts[5])].join('$');
    const tamperedSalt = [...parts.slice(0, 4), flip(parts[4]), parts[5]].join('$');
    const hugeN = ['scrypt', String(2 ** 30), ...parts.slice(2)].join('$');
    const weakN = ['scrypt', '1024', ...parts.slice(2)].join('$');
    for (const bad of [tamperedHash, tamperedSalt, hugeN, weakN, 'scrypt$x', '', null, 'bcrypt$2b$10$abc', `${hash}$extra`]) {
      assert.equal(await auth.verifyPassword(STRONG_PW, bad), false, `abgelehnt: ${String(bad).slice(0, 30)}`);
    }
  });
});

describe('safeRedirectPath (Open-Redirect-Schutz)', () => {
  it('lehnt fremde und gefährliche Ziele ab', () => {
    const bad = [
      '//evil.com',
      'https://evil.com',
      'http://evil.com/konto',
      '/\\evil.com',
      '\\\\evil.com',
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,hi',
      '/%2F%2Fevil.com',
      '/%5Cevil.com',
      // Punkt-Segmente, die new URL() zu "//evil.com" auflöst
      '/.//evil.com',
      '/%2e//evil.com',
      '/%2e%2e//evil.com',
      '/x/..//evil.com',
      '/a/.././/evil.com',
      ' /konto',
      '/konto\r\nSet-Cookie: x=1',
      '',
      null,
      undefined,
      42,
      `/${'a'.repeat(3000)}`,
    ];
    for (const b of bad) assert.equal(security.safeRedirectPath(b), '/', `abgelehnt: ${JSON.stringify(b)}`);
    assert.equal(security.safeRedirectPath('//evil.com', '/konto'), '/konto', 'eigener Fallback');
  });

  it('erlaubt relative Pfade derselben Website', () => {
    assert.equal(security.safeRedirectPath('/konto'), '/konto');
    assert.equal(security.safeRedirectPath('/produkt/sarma-lokum?variante=pistazie#details'), '/produkt/sarma-lokum?variante=pistazie#details');
    assert.equal(security.safeRedirectPath('/suche?q=n%C3%BCsse'), '/suche?q=n%C3%BCsse');
  });
});

describe('Eingabeprüfung (validate.js)', () => {
  const Contact = z.object({ name: schemas.name, email: schemas.email, phone: optional(schemas.phone), message: schemas.text(500) });

  it('lehnt CR/LF in Namen und E-Mail-Adressen ab (Header-Injection)', () => {
    const r1 = parse(Contact, { name: 'Max Mustermann\r\nBcc: opfer@example.com', email: 'max@example.com', message: 'Hallo' });
    assert.equal(r1.ok, false);
    assert.ok(r1.errors.name);
    const r2 = parse(Contact, { name: 'Max', email: 'max@example.com\r\nBcc: opfer@example.com', message: 'Hallo' });
    assert.equal(r2.ok, false);
    assert.ok(r2.errors.email);
    const r3 = parse(Contact, { name: 'Max', email: 'max@example.com\n', message: 'Hallo' });
    assert.equal(r3.ok, false, 'auch abschließendes LF wird abgelehnt');
    const r4 = parse(schemas.company, 'Hasret GmbH\nX-Header: 1');
    assert.equal(r4.ok, false);
  });

  it('akzeptiert gültige Eingaben und normalisiert sie', () => {
    const r = parse(Contact, {
      name: '  Eyyüp   Koca ',
      email: ' Info@Hasret-Nuts.DE ',
      phone: '',
      message: 'Zeile 1\r\nZeile 2',
      _csrf: 'x',
      website: '',
    });
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.deepEqual(r.data, { name: 'Eyyüp Koca', email: 'info@hasret-nuts.de', phone: undefined, message: 'Zeile 1\nZeile 2' });
    assert.equal(parse(schemas.name, 'Şükrü Ağaoğlu-Çelik').ok, true, 'türkische Buchstaben erlaubt');
  });

  it('liefert deutsche Fehlermeldungen je Feld', () => {
    const r = parse(Contact, {});
    assert.equal(r.ok, false);
    assert.match(r.errors.name, /Namen/);
    assert.match(r.errors.email, /E-Mail/);
    assert.match(r.errors.message, /ausfüllen|Feld/);
    assert.equal(r.errors.phone, undefined, 'optionales Feld');
  });

  it('Passwortregeln: Länge, häufige Passwörter, nicht gleich E-Mail', () => {
    assert.equal(parse(schemas.password, 'kurz').ok, false);
    assert.equal(parse(schemas.password, 'Passwort123').ok, false, 'häufiges Passwort');
    assert.equal(parse(schemas.password, 'aaaaaaaaaaaa').ok, false, 'Wiederholung');
    assert.equal(parse(schemas.password, 'x'.repeat(129)).ok, false);
    assert.equal(parse(schemas.password, STRONG_PW).ok, true);
    const Reg = z
      .object({ email: schemas.email, password: schemas.password })
      .superRefine(refinements.passwordNotEmail());
    const r = parse(Reg, { email: 'langername@example.com', password: 'langername@example.com' });
    assert.equal(r.ok, false);
    assert.match(r.errors.password, /E-Mail/);
  });

  it('PLZ, Menge, Rabattcode, Textlänge', () => {
    assert.equal(parse(schemas.zip, '87700').ok, true);
    assert.equal(parse(schemas.zip, '6020').ok, true, 'Österreich');
    assert.equal(parse(schemas.zip, '8770').ok, true);
    assert.equal(parse(schemas.zip, '877000').ok, false);
    assert.equal(parse(schemas.quantity, '3').data, 3);
    assert.equal(parse(schemas.quantity, '0').ok, false);
    assert.equal(parse(schemas.quantity, '100').ok, false);
    assert.equal(parse(schemas.quantity, '1e2').ok, false);
    assert.equal(parse(schemas.code, ' messe-2026 ').data, 'MESSE-2026');
    assert.equal(parse(schemas.code, "X' OR 1=1").ok, false);
    assert.equal(parse(schemas.text(10), 'a'.repeat(11)).ok, false);
    assert.equal(parse(schemas.text(10), 'ab\u0000c').ok, false, 'Steuerzeichen');
  });
});

describe('Template-Filter und SEO-Helfer', () => {
  it('jsonld escaped </script>, <, >, &, U+2028/2029', () => {
    const out = jsonLdString({ name: '</script><script>alert(1)</script>', x: 'a&b', ls: '\u2028\u2029' });
    assert.ok(!out.includes('</script>'));
    assert.ok(!out.includes('<'));
    assert.ok(!out.includes('&'));
    assert.ok(out.includes('\\u003c/script\\u003e'));
    assert.ok(out.includes('\\u2028') && out.includes('\\u2029'));
    assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>', x: 'a&b', ls: '\u2028\u2029' });
  });

  it('euro und date im deutschen Format', () => {
    assert.equal(formatEuro(800), '8,00\u00a0€');
    assert.equal(formatEuro(250), '2,50\u00a0€');
    assert.equal(formatEuro(123456), '1.234,56\u00a0€');
    assert.equal(formatEuro(0), '0,00\u00a0€');
    assert.equal(formatEuro(null), '');
    assert.equal(formatDate('2026-10-03T15:05:00.000Z'), '03.10.2026');
    assert.equal(formatDate('2026-10-03T15:05:00.000Z', 'datetime'), '03.10.2026, 17:05');
    assert.equal(formatDate('2026-10-03T15:05:00.000Z', 'long'), '3. Oktober 2026');
    assert.equal(formatDate('kein Datum'), '');
  });

  it('robotsTxt sperrt außerhalb der Produktion alles', () => {
    assert.equal(config.isProd, false);
    assert.equal(seo.robotsTxt({ baseUrl: 'http://localhost:3002', disallow: ['/konto'] }), 'User-agent: *\nDisallow: /\n');
    const prod = seo.robotsTxt({ baseUrl: 'https://shop.example', disallow: ['/konto', '/admin'], allowIndexing: true });
    assert.match(prod, /Disallow: \/konto/);
    assert.match(prod, /Disallow: \/admin/);
    assert.match(prod, /Sitemap: https:\/\/shop\.example\/sitemap\.xml/);
  });

  it('buildMeta: Titel, Canonical, noindex außerhalb der Produktion', () => {
    const m = seo.buildMeta({ app: 'corporate', title: 'Philosophie', description: 'Text', path: '/philosophie' });
    assert.equal(m.title, 'Philosophie · Hasret Nuts');
    assert.equal(m.canonical, `${config.apps.corporate.baseUrl}/philosophie`);
    assert.equal(m.noindex, true, 'nicht-Produktion → noindex');
    assert.match(m.image, /^https?:\/\/.+\/assets\/logo\/og-default\.png$/);
    assert.throws(() => seo.buildMeta({ title: 'x' }), /App unbekannt/);
  });

  it('sitemapXml escaped URLs', () => {
    const xml = seo.sitemapXml([{ loc: '/suche?a=1&b=<2>', lastmod: '2026-10-03', changefreq: 'weekly', priority: 0.8 }], {
      baseUrl: 'https://shop.example',
    });
    assert.match(xml, /<loc>https:\/\/shop\.example\/suche\?a=1&amp;b=&lt;2&gt;<\/loc>/);
    assert.match(xml, /<lastmod>2026-10-03<\/lastmod>/);
    assert.match(xml, /<priority>0\.8<\/priority>/);
  });
});

describe('Konfiguration', () => {
  it('bricht in Produktion ohne HTTPS/SMTP/MAIL_FROM/LOG_SALT ab', () => {
    const keys = ['NODE_ENV', 'CORPORATE_BASE_URL', 'SHOP_BASE_URL', 'SMTP_HOST', 'MAIL_FROM', 'OWNER_EMAIL', 'LOG_SALT'];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    try {
      Object.assign(process.env, { NODE_ENV: 'production', CORPORATE_BASE_URL: 'http://www.example', SHOP_BASE_URL: 'https://shop.example' });
      delete process.env.SMTP_HOST;
      delete process.env.MAIL_FROM;
      delete process.env.LOG_SALT;
      assert.throws(() => config.reload(), (err) => {
        assert.match(err.message, /CORPORATE_BASE_URL/);
        assert.match(err.message, /SMTP_HOST/);
        assert.match(err.message, /MAIL_FROM/);
        assert.match(err.message, /LOG_SALT/);
        return true;
      });
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      config.reload();
    }
    assert.equal(config.isTest, true);
  });
});

/* ============================================================ App-Integration */

describe('Basis-App (createBaseApp) im Testbetrieb', () => {
  let app;
  before(async () => {
    app = await startServer(coreAppFactory, { env: { ...CATALOG_ENV, RATE_LIMIT_FORMS_MAX: '2' } });
  });
  after(() => app && app.close());

  it('setzt Sicherheits-Header inkl. CSP-Nonce', async () => {
    const c = client(app.baseUrl);
    const res = await c.get('/form');
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy');
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)[1];
    assert.ok(res.text.includes(`<script nonce="${nonce}">`), 'Nonce im Script-Tag');
    for (const part of [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "script-src-attr 'none'",
      `style-src-elem 'self' 'nonce-${nonce}'`,
      "style-src-attr 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "object-src 'none'",
    ]) {
      assert.ok(csp.includes(part), `CSP enthält ${part}`);
    }
    assert.ok(!csp.includes('upgrade-insecure-requests'), 'nur in Produktion');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('strict-transport-security'), null, 'HSTS nur in Produktion');
    const res2 = await c.get('/form');
    const nonce2 = /'nonce-([A-Za-z0-9+/=]+)'/.exec(res2.headers.get('content-security-policy'))[1];
    assert.notEqual(nonce, nonce2, 'neue Nonce pro Anfrage');
  });

  it('legt Sitzungen erst bei Bedarf an; Cookie-Flags HttpOnly + SameSite=Lax; DB speichert nur den Hash', async () => {
    const c = client(app.baseUrl);
    const plain = await c.get('/plain');
    assert.equal(plain.setCookies.length, 0, 'keine Sitzung für reine Seitenaufrufe');
    const res = await c.get('/form');
    const cookie = res.setCookies.find((s) => s.name === 'hn_sid_shop');
    assert.ok(cookie, 'Sitzungs-Cookie gesetzt');
    assert.equal(cookie.attributes.httponly, true);
    assert.equal(String(cookie.attributes.samesite).toLowerCase(), 'lax');
    assert.equal(cookie.attributes.path, '/');
    assert.equal(cookie.attributes.secure, undefined, 'Secure nur in Produktion');
    assert.equal(Number(cookie.attributes['max-age']), 14 * 24 * 3600);
    assert.match(cookie.value, /^[A-Za-z0-9_-]{43}$/);
    const rows = app.db.prepare('SELECT id FROM sessions').all().map((r) => r.id);
    assert.ok(rows.includes(sha256(cookie.value)), 'SHA-256 des Tokens gespeichert');
    assert.ok(!rows.includes(cookie.value), 'Roh-Token nie gespeichert');
    const dump = JSON.stringify(app.db.prepare('SELECT * FROM sessions').all());
    assert.ok(!dump.includes(cookie.value));
  });

  it('speichert Sitzungsdaten und zeigt Flash-Meldungen genau einmal', async () => {
    const c = client(app.baseUrl);
    await c.get('/set?v=Pistazie');
    assert.deepEqual((await c.get('/get')).json(), { note: 'Pistazie' });
    const redirect = await c.get('/flash-set');
    assert.equal(redirect.status, 303);
    const shown = await c.get('/flash-show');
    assert.match(shown.text, /Ihre Angaben wurden gespeichert\./);
    assert.match(shown.text, /role="status"/);
    const again = await c.get('/flash-show');
    assert.ok(!again.text.includes('Ihre Angaben wurden gespeichert'));
  });

  it('CSRF: ohne/mit falschem Token 403, mit richtigem Token erfolgreich', async () => {
    const c = client(app.baseUrl);
    const anon = await c.post('/form', { value: 'x' });
    assert.equal(anon.status, 403, 'ohne Sitzung/Token');
    await c.get('/form');
    assert.ok(c.csrfToken, 'Token aus <input name="_csrf">');
    const missing = await c.post('/form', { value: 'x', _csrf: '' });
    assert.equal(missing.status, 403);
    assert.match(missing.text, /Sitzung ist abgelaufen|nicht mehr gültig/);
    const wrong = await c.post('/form', { value: 'x', _csrf: 'A'.repeat(43) });
    assert.equal(wrong.status, 403);
    const ok = await c.post('/form', { value: 'Nüsse' });
    assert.equal(ok.status, 200);
    assert.equal(ok.text, 'ok:Nüsse');
    const json = await c.postJson('/api/echo', { value: 1 });
    assert.equal(json.status, 200, 'Header x-csrf-token');
    const jsonBad = await c.postJson('/api/echo', { value: 1 }, { headers: { 'x-csrf-token': 'falsch' } });
    assert.equal(jsonBad.status, 403);
    assert.equal(jsonBad.json().error, 'csrf');
    const cross = await c.post('/form', { value: 'x' }, { headers: { 'sec-fetch-site': 'cross-site' } });
    assert.equal(cross.status, 403, 'Cross-Site-Anfrage trotz Token abgewiesen');
    const events = app.db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE type = 'csrf_failure'").get().n;
    assert.ok(events >= 4, 'CSRF-Fehler protokolliert');
    const ipHashes = app.db.prepare('SELECT ip_hash FROM security_events').all();
    assert.ok(ipHashes.every((r) => /^[a-f0-9]{32}$/.test(r.ip_hash)), 'nur IP-Hashes, keine rohen IPs');
  });

  it('Sitzungs-Regeneration: neues Cookie, altes Token sofort ungültig', async () => {
    const user = await auth.createUser({ email: 'regen@example.com', password: STRONG_PW, name: 'Regen Test' });
    const c = client(app.baseUrl);
    await c.get('/set?v=Warenkorb');
    const before = c.jar.get('hn_sid_shop');
    assert.ok(before);
    const login = await c.get(`/login-as/${user.id}`);
    assert.equal(login.status, 200);
    const after = c.jar.get('hn_sid_shop');
    assert.ok(after && after !== before, 'Cookie gewechselt');
    const me = (await c.get('/whoami')).json();
    assert.equal(me.user.id, user.id);
    assert.equal(me.user.email, 'regen@example.com');
    assert.equal(me.user.password_hash, undefined, 'kein Hash in req.user');
    assert.deepEqual((await c.get('/get')).json(), { note: 'Warenkorb' }, 'keepData behält Warenkorb');
    const old = client(app.baseUrl);
    old.setCookie('hn_sid_shop', before);
    const oldMe = (await old.get('/whoami')).json();
    assert.equal(oldMe.user, null, 'altes Token gilt nicht mehr');
    assert.equal(oldMe.hasSession, false);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(sha256(before)).n, 0);
    await c.get('/form');
    const out = await c.post('/logout', {});
    assert.equal(out.status, 303);
    assert.equal((await c.get('/whoami')).json().user, null, 'abgemeldet');
  });

  it('Sicherheitsnetz: Login ohne regenerateSession() erneuert das Token trotzdem', async () => {
    const user = await auth.createUser({ email: 'fixation@example.com', password: STRONG_PW });
    const c = client(app.baseUrl);
    await c.get('/set?v=x');
    const before = c.jar.get('hn_sid_shop');
    await c.get(`/unsafe-login/${user.id}`);
    const after = c.jar.get('hn_sid_shop');
    assert.ok(after && after !== before, 'Token gewechselt');
    assert.equal((await c.get('/whoami')).json().user.id, user.id);
    const old = client(app.baseUrl);
    old.setCookie('hn_sid_shop', before);
    assert.equal((await old.get('/whoami')).json().user, null, 'fixiertes Token ist wertlos');
  });

  it('Passwortänderung beendet alle Sitzungen des Nutzers', async () => {
    const user = await auth.createUser({ email: 'pwchange@example.com', password: STRONG_PW });
    const a = client(app.baseUrl);
    const b = client(app.baseUrl);
    await a.get(`/login-as/${user.id}`);
    await b.get(`/login-as/${user.id}`);
    assert.equal((await a.get('/whoami')).json().user.id, user.id);
    await auth.updatePassword(user.id, 'Ganz-neues-Passwort-2026');
    assert.equal((await a.get('/whoami')).json().user, null);
    assert.equal((await b.get('/whoami')).json().user, null);
    const row = auth.findUserById(user.id);
    assert.equal(await auth.verifyPassword('Ganz-neues-Passwort-2026', row.password_hash), true);
  });

  it('Admin-Sitzungen laufen nach 30 Minuten Inaktivität ab', async () => {
    const admin = await auth.createUser({ email: 'admin-idle@example.com', password: STRONG_PW, role: 'admin' });
    const c = client(app.baseUrl);
    await c.get(`/login-as/${admin.id}`);
    assert.equal((await c.get('/admin-only')).status, 200);
    app.db.prepare('UPDATE sessions SET last_seen_at = ? WHERE user_id = ?').run(new Date(Date.now() - 31 * 60 * 1000).toISOString(), admin.id);
    const res = await c.get('/admin-only');
    assert.equal(res.status, 302, 'zur Anmeldung');
  });

  it('requireAuth/requireAdmin schützen private Seiten', async () => {
    const c = client(app.baseUrl);
    const anon = await c.get('/private?tab=bestellungen');
    assert.equal(anon.status, 302);
    assert.equal(anon.location, '/konto/anmelden?next=%2Fprivate%3Ftab%3Dbestellungen');
    assert.equal(anon.headers.get('cache-control'), 'no-store');
    assert.equal(anon.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal((await c.get('/admin-only')).status, 302);
    const customer = await auth.createUser({ email: 'kunde@example.com', password: STRONG_PW });
    await c.get(`/login-as/${customer.id}`);
    assert.equal((await c.get('/private')).text, 'privat');
    const forbidden = await c.get('/admin-only');
    assert.equal(forbidden.status, 403);
    assert.match(forbidden.text, /Berechtigung/);
    const admin = await auth.createUser({ email: 'chef@example.com', password: STRONG_PW, role: 'admin' });
    await c.get(`/login-as/${admin.id}`);
    assert.equal((await c.get('/admin-only')).text, 'admin');
  });

  it('Weiterleitungen nur auf eigene Pfade (kein Open Redirect)', async () => {
    const c = client(app.baseUrl);
    assert.equal((await c.get('/go?next=%2F%2Fevil.com')).location, '/');
    assert.equal((await c.get('/go?next=https%3A%2F%2Fevil.com')).location, '/');
    assert.equal((await c.get('/go?next=%2Fkonto')).location, '/konto');
  });

  it('Ratenlimit: 429 mit deutscher Seite nach Überschreiten', async () => {
    const c = client(app.baseUrl);
    await c.get('/form');
    assert.equal((await c.post('/limited', {})).status, 200);
    assert.equal((await c.post('/limited', {})).status, 200);
    const blocked = await c.post('/limited', {});
    assert.equal(blocked.status, 429);
    assert.match(blocked.text, /<html lang="de">/);
    assert.match(blocked.text, /sehr viele Anfragen/);
    assert.ok(blocked.headers.get('ratelimit') || blocked.headers.get('ratelimit-policy'), 'Standard-Header');
    assert.ok(blocked.headers.get('retry-after'));
  });

  it('Honeypot: befülltes Feld → vorgetäuschter Erfolg ohne Verarbeitung', async () => {
    const c = client(app.baseUrl);
    await c.get('/form');
    const bot = await c.post('/hp', { website: 'https://spam.example', message: 'Spam' });
    assert.equal(bot.status, 303);
    assert.equal(bot.location, '/danke');
    const human = await c.post('/hp', { website: '', message: 'Hallo' });
    assert.equal(human.text, 'echt');
  });

  it('jsonld-Filter im Template verhindert Script-Ausbruch; Ausgabe wird escaped', async () => {
    const res = await (client(app.baseUrl)).get('/jsonld');
    assert.ok(!res.text.includes('</script><script>alert(1)'), 'kein Ausbruch');
    assert.ok(res.text.includes('\\u003c/script\\u003e\\u003cscript\\u003ealert(1)'));
    assert.ok(res.text.includes('&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;'), 'Autoescape in HTML');
    assert.match(res.text, /<p class="price">8,00\u00a0€<\/p>/);
    assert.match(res.text, /<p class="big">1\.234,56\s€<\/p>/);
    assert.match(res.text, /<p class="date">03\.10\.2026<\/p>/);
  });

  it('zu große Formulardaten → 413 (deutsche Seite)', async () => {
    const c = client(app.baseUrl);
    await c.get('/form');
    const res = await c.post('/form', { value: 'x'.repeat(30 * 1024) });
    assert.equal(res.status, 413);
    assert.match(res.text, /zu umfangreich/);
  });

  it('SQL-Injection-Zeichenketten werden wörtlich gespeichert (vorbereitete Statements)', async () => {
    const evil = "Robert'); DROP TABLE users;--";
    const u = await auth.createUser({ email: "o'brien+test@example.com", password: STRONG_PW, name: evil });
    assert.equal(auth.findUserById(u.id).name, evil);
    assert.equal(auth.findUserByEmail("o'brien+test@example.com").id, u.id);
    assert.equal(auth.findUserByEmail("' OR '1'='1"), null);
    assert.equal(auth.findUserByEmail("o'brien+test@example.com' --"), null);
    const msg = "'; DELETE FROM feedback; --";
    app.db.prepare('INSERT INTO feedback (app, kind, message) VALUES (?, ?, ?)').run('shop', 'bug', msg);
    app.db.prepare('INSERT INTO feedback (app, kind, message) VALUES (?, ?, ?)').run('shop', 'idee', '1 OR 1=1');
    const rows = app.db.prepare('SELECT message FROM feedback ORDER BY id').all();
    assert.deepEqual(rows.map((r) => r.message), [msg, '1 OR 1=1']);
    const tables = app.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
    for (const t of ['users', 'sessions', 'orders', 'feedback', 'discount_codes']) assert.ok(tables.includes(t));
    await assert.rejects(auth.createUser({ email: "O'Brien+Test@example.com", password: STRONG_PW }), (e) => e.code === 'EMAIL_TAKEN');
  });

  it('Einmal-Tokens: nur Hash gespeichert, einmalig, mit Ablauf und Typprüfung', async () => {
    const u = await auth.createUser({ email: 'token@example.com', password: STRONG_PW });
    const raw = auth.createToken(u.id, 'verify_email', 60);
    assert.match(raw, /^[A-Za-z0-9_-]{43}$/);
    const row = app.db.prepare('SELECT * FROM auth_tokens WHERE user_id = ?').get(u.id);
    assert.equal(row.token_hash, sha256(raw));
    assert.ok(!JSON.stringify(app.db.prepare('SELECT * FROM auth_tokens').all()).includes(raw), 'Roh-Token nicht in der DB');
    assert.deepEqual(auth.peekToken(raw, 'verify_email'), { userId: u.id, email: null }, 'peek verbraucht nicht');
    assert.equal(auth.consumeToken(raw, 'reset_password'), null, 'falscher Typ');
    assert.equal(auth.consumeToken(raw, 'verify_email'), u.id);
    assert.equal(auth.consumeToken(raw, 'verify_email'), null, 'nur einmal verwendbar');
    assert.equal(auth.peekToken(raw, 'verify_email'), null);

    const expired = auth.createToken(u.id, 'reset_password', 30);
    app.db.prepare('UPDATE auth_tokens SET expires_at = ? WHERE token_hash = ?').run(new Date(Date.now() - 1000).toISOString(), sha256(expired));
    assert.equal(auth.consumeToken(expired, 'reset_password'), null, 'abgelaufen');

    const first = auth.createToken(u.id, 'reset_password', 30);
    const second = auth.createToken(u.id, 'reset_password', 30);
    assert.equal(auth.consumeToken(first, 'reset_password'), null, 'älteres Token entwertet');
    assert.equal(auth.consumeToken(second, 'reset_password'), u.id);
    assert.equal(auth.recentTokenCount({ userId: u.id, type: 'reset_password', withinMinutes: 60 }), 3);

    const nl = auth.createToken(null, 'newsletter', 60 * 72, { email: 'News@Example.com' });
    assert.equal(auth.consumeToken(nl, 'newsletter'), null, 'ohne Nutzer → consumeTokenRecord verwenden');
    const nl2 = auth.createToken(null, 'newsletter', 60, { email: 'leser@example.com' });
    assert.deepEqual(auth.consumeTokenRecord(nl2, 'newsletter'), { userId: null, email: 'leser@example.com' });
    for (const junk of ['', 'abc', null, `${raw}x`, '../../etc/passwd']) assert.equal(auth.consumeToken(junk, 'verify_email'), null);
  });

  it('Login-Drosselung: 5 Fehlversuche → 15 Minuten Sperre', async () => {
    const u = await auth.createUser({ email: 'lock@example.com', password: STRONG_PW });
    for (let i = 0; i < 4; i += 1) {
      const r = await auth.authenticate('lock@example.com', 'falsch-falsch-falsch');
      assert.deepEqual(r, { ok: false, reason: 'invalid' });
    }
    const fifth = await auth.authenticate('lock@example.com', 'falsch-falsch-falsch');
    assert.equal(fifth.reason, 'locked');
    assert.equal(auth.isLocked(u.id), true);
    const locked = await auth.authenticate('LOCK@example.com', STRONG_PW);
    assert.deepEqual(locked, { ok: false, reason: 'locked' }, 'auch richtiges Passwort während Sperre abgelehnt');
    auth.resetLoginFailures(u.id);
    const ok = await auth.authenticate('lock@example.com', STRONG_PW);
    assert.equal(ok.ok, true);
    assert.equal(ok.user.id, u.id);
    const unknown = await auth.authenticate('gibt-es-nicht@example.com', STRONG_PW);
    assert.deepEqual(unknown, { ok: false, reason: 'invalid' }, 'gleiche Antwort für unbekannte Adressen');
  });

  it('Konto löschen: Bestellungen bleiben, user_id wird NULL', async () => {
    const u = await auth.createUser({ email: 'delete@example.com', password: STRONG_PW });
    const info = app.db
      .prepare(
        `INSERT INTO orders (public_id, user_id, email, name, delivery, subtotal_cents, discount_cents, total_cents)
         VALUES ('HN-2026-9999', ?, 'delete@example.com', 'Lösch Test', 'abholung', 800, 0, 800)`
      )
      .run(u.id);
    app.db
      .prepare('INSERT INTO order_items (order_id, sku, name, unit_price_cents, qty, line_total_cents) VALUES (?, ?, ?, ?, ?, ?)')
      .run(info.lastInsertRowid, 'test-lokum-pistazie', 'Test Lokum', 800, 1, 800);
    auth.createToken(u.id, 'verify_email', 60);
    assert.equal(auth.deleteUser(u.id), true);
    assert.equal(auth.findUserById(u.id), null);
    const order = app.db.prepare("SELECT * FROM orders WHERE public_id = 'HN-2026-9999'").get();
    assert.equal(order.user_id, null);
    assert.equal(order.name, 'Lösch Test');
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE order_id = ?').get(order.id).n, 1);
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id = ?').get(u.id).n, 0);
  });

  it('Katalog: Preise nur serverseitig, Allergenfilter, Bundle-Prüfung', () => {
    assert.equal(catalog.priceCentsFor('test-lokum-pistazie'), 800);
    assert.equal(catalog.priceCentsFor('gibt-es-nicht'), null);
    assert.equal(catalog.getVariant('test-bundle-3er').product.slug, 'test-bundle');
    assert.equal(catalog.getProduct('test-lokum').name, 'Test Lokum');
    assert.equal(catalog.getCategory('nuesse-knabberzeug').name, 'Nüsse & Knabberzeug');
    assert.equal(catalog.getProducts({ category: 'traditionelle-suesswaren' }).length, 2);
    assert.deepEqual(catalog.productAllergens(catalog.getProduct('test-lokum')), {
      contains: ['schalenfruechte'],
      mayContain: ['erdnuesse', 'milch'],
    });
    assert.deepEqual(
      catalog.getProducts({ excludeAllergens: ['schalenfruechte'] }).map((p) => p.slug),
      ['test-leblebi'],
      'Bundle erbt Allergene des Bezugsprodukts'
    );
    assert.deepEqual(
      catalog.getProducts({ excludeAllergens: 'milch', includeTraces: true }).map((p) => p.slug),
      ['test-leblebi']
    );
    assert.equal(catalog.getProducts({ excludeAllergens: 'milch' }).length, 3, 'ohne Spuren-Option');
    assert.equal(catalog.allergenLabel('schalenfruechte'), 'Schalenfrüchte');
    assert.equal(catalog.getAllergens().length, 14);
    assert.equal(catalog.validateBundleSelection('test-bundle-3er', ['test-lokum-pistazie', 'test-lokum-kokos', 'test-lokum-pistazie']).ok, true);
    assert.equal(catalog.validateBundleSelection('test-bundle-3er', ['test-lokum-pistazie']).ok, false);
    assert.equal(catalog.validateBundleSelection('test-bundle-3er', ['test-lokum-pistazie', 'test-leblebi-200', 'test-lokum-kokos']).ok, false);
    assert.equal(catalog.getOffers().codes.length, 2);
    assert.equal(catalog.formatEuro(2000), '20,00\u00a0€');
  });

  it('buildMeta erkennt die App im Anfrage-Kontext; seo-head rendert Meta-Tags', async () => {
    const res = await client(app.baseUrl).get('/meta-auto?x=1');
    assert.match(res.text, /<title>Allergene · Hasret Nuts Shop<\/title>/);
    assert.match(res.text, /<meta name="description" content="Übersicht der 14 Hauptallergene\.">/);
    assert.match(res.text, /<meta name="robots" content="noindex, nofollow">/);
    assert.ok(!res.text.includes('rel="canonical"'), 'kein Canonical bei noindex');
    assert.match(res.text, new RegExp(`<meta property="og:url" content="${app.baseUrl}/meta-auto">`));
    const plain = await client(app.baseUrl).get('/plain');
    assert.match(plain.text, /<title>Hasret Nuts Shop – Spezialitäten aus Memmingen<\/title>/, 'Standard-Meta aus res.locals');
  });

  it('404 als deutsche Seite', async () => {
    const res = await client(app.baseUrl).get('/gibt-es-nicht');
    assert.equal(res.status, 404);
    assert.match(res.text, /Seite nicht gefunden/);
    assert.match(res.text, /noindex/);
  });
});

describe('Mailer (Header-Injection-Schutz, Vorlagen)', () => {
  before(() => {
    mailer.outbox.length = 0;
  });

  it('entfernt CR/LF aus dem Betreff und validiert Adressen streng', async () => {
    await mailer.sendMail({ to: 'kunde@example.com', subject: 'Ihre Anfrage\r\nBcc: opfer@example.com', text: 'Hallo' });
    const m = mailer.outbox.at(-1);
    assert.equal(m.subject, 'Ihre Anfrage Bcc: opfer@example.com');
    assert.ok(!/[\r\n]/.test(m.subject));
    assert.deepEqual(m.toList, ['kunde@example.com']);
    for (const to of ['kunde@example.com\r\nBcc: opfer@example.com', 'a@example.com, b@example.com', '"x" <a@example.com>', 'kein-at-zeichen', '']) {
      await assert.rejects(mailer.sendMail({ to, subject: 'x', text: 'y' }), (e) => e.code === 'MAIL_INVALID', `abgelehnt: ${to}`);
    }
    await assert.rejects(
      mailer.sendMail({ to: 'kunde@example.com', subject: 'x', text: 'y', replyTo: 'a@example.com\nBcc: b@example.com' }),
      (e) => e.code === 'MAIL_INVALID'
    );
  });

  it('Vorlagen: deutsch, Signatur, HTML escaped', async () => {
    const order = {
      public_id: 'HN-2026-0001',
      name: '<script>alert(1)</script>',
      email: 'kunde@example.com',
      delivery: 'versand',
      street: 'Musterstraße 1',
      zip: '87700',
      city: 'Memmingen',
      subtotal_cents: 2400,
      discount_cents: 240,
      discount_code: 'TEST10',
      total_cents: 2160,
      message: 'Bitte <b>schnell</b>',
    };
    const items = [
      { name: 'Premium Sarma Lokum', variant: 'Pistazie', qty: 3, unit_price_cents: 800, line_total_cents: 2400, bundle_json: null },
    ];
    const t = mailer.templates.orderConfirmation({ order, items, shopUrl: 'http://localhost:3002' });
    assert.match(t.subject, /HN-2026-0001/);
    assert.match(t.text, /unverbindliche Bestellanfrage/);
    assert.match(t.text, /24,00\u00a0€/);
    assert.match(t.text, /21,60\u00a0€/);
    assert.match(t.text, /Hasret Nuts · Inhaber Eyyüp Koca · Memmingen/);
    assert.ok(!t.html.includes('<script>alert(1)'));
    assert.ok(t.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!t.html.includes('<b>schnell</b>'));
    for (const name of [
      'verifyEmail',
      'resetPassword',
      'passwordChanged',
      'accountDeleted',
      'orderConfirmation',
      'ownerNewOrder',
      'ownerNewInquiry',
      'ownerNewFeedback',
      'newsletterConfirm',
    ]) {
      const tpl = mailer.templates[name]({ name: 'Eyyüp', url: 'https://shop.example/x?token=abc', order, items, inquiry: { company: 'Markt GmbH' }, feedback: { kind: 'bug', app: 'shop', message: 'Fehler' } });
      assert.ok(tpl.subject && tpl.text && tpl.html, name);
      assert.ok(!/[\r\n]/.test(tpl.subject), `${name}: Betreff einzeilig`);
      assert.match(tpl.text, /Hasret Nuts · Inhaber Eyyüp Koca · Memmingen/, `${name}: Signatur`);
    }
    const bad = mailer.templates.verifyEmail({ name: 'X', url: 'javascript:alert(1)' });
    assert.ok(!bad.html.includes('javascript:'), 'nur http(s)-Links');
    await mailer.send('verifyEmail', 'neu@example.com', { name: 'Neu', url: 'https://shop.example/konto/bestaetigen?token=abc' });
    assert.equal(helpers.extractToken(helpers.lastMail(mailer.outbox, 'neu@example.com').text), 'abc');
  });
});

describe('Produktionsmodus', () => {
  let app;
  before(async () => {
    app = await startServer(coreAppFactory, { env: { ...PROD_ENV, ...CATALOG_ENV } });
  });
  after(() => app && app.close());

  it('500 ohne Stacktrace oder Fehlermeldung', async () => {
    const original = console.error;
    console.error = () => {};
    let res;
    try {
      res = await client(app.baseUrl).get('/boom');
    } finally {
      console.error = original;
    }
    assert.equal(res.status, 500);
    assert.match(res.text, /Es ist ein Fehler aufgetreten/);
    assert.match(res.text, /Fehlerkennung: [a-f0-9]{8}/);
    assert.ok(!res.text.includes('geheimer'), 'keine Fehlermeldung');
    assert.ok(!/at [\w.<>]+ \(|core\.test\.js|node_modules/.test(res.text), 'kein Stacktrace');
  });

  it('404 ohne Stacktrace', async () => {
    const res = await client(app.baseUrl).get('/gibt-es-nicht');
    assert.equal(res.status, 404);
    assert.match(res.text, /Seite nicht gefunden/);
    assert.ok(!/at [\w.<>]+ \(|node_modules/.test(res.text));
  });

  it('Sitzungs-Cookie mit __Host-Präfix und Secure; HSTS; upgrade-insecure-requests', async () => {
    const res = await client(app.baseUrl).get('/form');
    const cookie = res.setCookies.find((s) => s.name === '__Host-hn_sid_shop');
    assert.ok(cookie, '__Host-Cookie');
    assert.equal(cookie.attributes.secure, true);
    assert.equal(cookie.attributes.httponly, true);
    assert.equal(String(cookie.attributes.samesite).toLowerCase(), 'lax');
    assert.equal(cookie.attributes.path, '/');
    assert.equal(cookie.attributes.domain, undefined);
    assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
    assert.match(res.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  });

  it('robots.txt/Meta erlauben Indexierung nur in Produktion', () => {
    assert.equal(config.isProd, true);
    assert.match(seo.robotsTxt({ baseUrl: config.apps.shop.baseUrl, disallow: ['/konto'] }), /Sitemap: https:\/\/shop\.hasret-nuts\.example\/sitemap\.xml/);
    const m = seo.buildMeta({ app: 'shop', title: 'Allergene', path: '/allergene' });
    assert.equal(m.noindex, false);
    assert.equal(m.canonical, 'https://shop.hasret-nuts.example/allergene');
    assert.equal(m.title, 'Allergene · Hasret Nuts Shop');
  });
});

describe('Echte Apps starten (Platzhalter bzw. Inhalte der BUILD-Agenten)', () => {
  it('Corporate: Startseite, Sicherheits-Header, Schriften', async () => {
    const app = await startApp('corporate');
    try {
      const c = client(app.baseUrl);
      const home = await c.get('/');
      assert.equal(home.status, 200);
      assert.match(home.headers.get('content-type'), /text\/html/);
      assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
      const fonts = await c.get('/assets/css/fonts.css');
      assert.equal(fonts.status, 200);
      assert.match(fonts.text, /font-family: 'Cormorant Garamond'/);
      assert.ok(!fonts.text.includes('fonts.googleapis.com'), 'keine Google-Fonts-Anfragen');
      assert.equal((await c.get('/assets/../shared/config.js')).status, 404);
    } finally {
      await app.close();
    }
  });

  it('Shop: Startseite; /admin und /konto sind geschützt', async () => {
    const app = await startApp('shop');
    try {
      const c = client(app.baseUrl);
      const home = await c.get('/');
      assert.equal(home.status, 200);
      const admin = await c.get('/admin/bestellungen');
      assert.equal(admin.status, 302);
      assert.equal(admin.location, '/konto/anmelden?next=%2Fadmin%2Fbestellungen');
      const konto = await c.get('/konto');
      assert.equal(konto.status, 302);
      assert.equal(konto.location, '/konto/anmelden?next=%2Fkonto');
      assert.equal((await c.get('/konto/loeschen')).status, 302);
      assert.equal((await c.get('/konto/passwort')).status, 302);
      for (const open of ['/konto/anmelden', '/konto/registrieren', '/konto/passwort-vergessen', '/konto/passwort-zuruecksetzen?token=x']) {
        const r = await c.get(open);
        assert.ok(!(r.status === 302 && String(r.location).startsWith('/konto/anmelden?next=')), `${open} ist öffentlich`);
      }
    } finally {
      await app.close();
    }
  });
});
