'use strict';
/**
 * Tests Corporate Hub (BUILD-CORPORATE): Seiten, SEO, Sicherheits-Header, Händleranfrage,
 * Feedback, Honeypot, CSRF, XSS, Ratenlimit, robots.txt/sitemap.xml, 404.
 *   cd hasret-nuts && node --test test/corporate.test.js
 */
const helpers = require('./helpers'); // zuerst laden (setzt NODE_ENV=test)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

const { startApp, client, lastMail } = helpers;

const PAGES = [
  ['/', 'Hasret Nuts – Sehnsucht, die man schmecken kann.'],
  ['/philosophie', 'Philosophie – was Hasret bedeutet · Hasret Nuts'],
  ['/messe-chronik', 'Messe-Chronik: Festiculture Paris & Lyon · Hasret Nuts'],
  ['/haendler', 'Für Händler: Spezialitäten fürs Sortiment · Hasret Nuts'],
  ['/feedback', 'Feedback & Fehler melden · Hasret Nuts'],
  ['/impressum', 'Impressum · Hasret Nuts'],
  ['/datenschutz', 'Datenschutzerklärung · Hasret Nuts'],
  ['/cookies', 'Cookie-Hinweise · Hasret Nuts'],
];

const VALID_INQUIRY = {
  firma: 'Feinkost Anadolu GmbH',
  name: 'Ayşe Yılmaz',
  email: 'Einkauf@Anadolu.example',
  telefon: '+49 731 123456',
  ort: '89073 Ulm',
  typ: 'supermarkt',
  sortiment: ['sarma-lokum', 'tursu'],
  nachricht: 'Wir interessieren uns für Sarma Lokum und Turşu.',
  datenschutz: 'on',
  website: '',
};

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function titleOf(html) {
  const m = /<title>([^<]*)<\/title>/.exec(html);
  return m ? decode(m[1]) : null;
}

function jsonLdOf(html) {
  const m = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
}

function countRows(db, table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

/* ====================================================================== */

describe('Corporate Hub – Seiten, Formulare, Sicherheit', () => {
  let app;
  before(async () => {
    app = await startApp('corporate');
  });
  after(async () => {
    await app.close();
  });

  it('liefert jede Seite mit Status 200 und eindeutigem, korrektem <title>', async () => {
    const c = client(app.baseUrl);
    const seen = new Set();
    for (const [path, title] of PAGES) {
      const res = await c.get(path);
      assert.equal(res.status, 200, `${path} → ${res.status}`);
      assert.match(res.headers.get('content-type'), /text\/html/);
      assert.equal(titleOf(res.text), title, `Titel von ${path}`);
      assert.ok(!seen.has(title), `Titel doppelt: ${title}`);
      seen.add(title);
      assert.match(res.text, /<html lang="de"/);
      assert.match(res.text, /<meta name="description" content="[^"]{80,}"/, `Beschreibung auf ${path}`);
      assert.equal((res.text.match(/<h1[\s>]/g) || []).length, 1, `genau eine H1 auf ${path}`);
    }
  });

  it('setzt die Sicherheits-Header inkl. CSP mit Nonce', async () => {
    const res = await client(app.baseUrl).get('/');
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'CSP fehlt');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    assert.match(csp, /script-src-attr 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-powered-by'), null);
    // Alle Inline-Skripte tragen die Nonce, keine Inline-Event-Handler
    const nonce = /'nonce-([^']+)'/.exec(csp)[1];
    const scripts = res.text.match(/<script\b[^>]*>/g) || [];
    assert.ok(scripts.length > 0);
    for (const tag of scripts) {
      if (/\bsrc=/.test(tag)) continue;
      assert.ok(tag.includes(`nonce="${nonce}"`), `Inline-Skript ohne Nonce: ${tag}`);
    }
    assert.doesNotMatch(res.text, /\son[a-z]+\s*=\s*["']/i, 'Inline-Event-Handler gefunden');
  });

  it('Startseite: Slogan, Intro, drehendes Logo, Shop-Link aus der Konfiguration – keine Preise', async () => {
    const res = await client(app.baseUrl).get('/');
    assert.match(res.text, /Sehnsucht, die man <em>schmecken<\/em> kann\./);
    assert.match(res.text, /data-hn-intro/, 'Eröffnungsanimation fehlt');
    assert.match(res.text, /hn-intro--corporate/);
    assert.match(res.text, /class="hn-logo hn-logo--color"/, 'Kopfzeilen-Logo fehlt');
    assert.match(res.text, /\/assets\/motion\/logo-spin\.css/);
    assert.match(res.text, /\[FOTO-PLATZHALTER: [^\]]+Perspektive: [^\]]+\]/, 'Foto-Platzhalter fehlen');
    assert.match(res.text, /data-photo="C-01"/);
    assert.ok(res.text.includes(`href="${app.config.apps.shop.baseUrl}/"`), 'Shop-Link fehlt');
    assert.match(res.text, /Für Endkunden: Zum Online-Shop/);
    assert.doesNotMatch(res.text, /€|EUR\b|In den Warenkorb/, 'Corporate Hub darf keine Preise zeigen');
    // fünf Produktgruppen
    for (const name of ['Premium Sarma Lokum', 'Hausgemachtes Turşu', 'Karadut Özü', 'Nüsse &amp; Knabberzeug', 'Trend-Süßwaren']) {
      assert.ok(res.text.includes(name), `Produktgruppe fehlt: ${name}`);
    }
    // Keine externen Schriften/Skripte
    assert.doesNotMatch(res.text, /fonts\.googleapis|fonts\.gstatic|https?:\/\/(?!127\.0\.0\.1|localhost|schema\.org|www\.w3\.org)[a-z0-9.-]+\/[^"]*\.(js|css)/i);
  });

  it('Händlerbereich: Sortiment für den Handel mit fünf Gruppen, ohne Preise', async () => {
    const res = await client(app.baseUrl).get('/haendler');
    assert.match(res.text, /id="sortiment"/);
    assert.equal((res.text.match(/class="range__item/g) || []).length, 5);
    assert.doesNotMatch(res.text, /€/);
    assert.match(res.text, /weder offizieller Partner noch Lizenznehmer/, 'Labubu-Markenhinweis fehlt');
  });

  it('JSON-LD: Organization + LocalBusiness ohne Platzhalter, BreadcrumbList nur auf Unterseiten', async () => {
    const c = client(app.baseUrl);
    const home = jsonLdOf((await c.get('/')).text);
    assert.ok(home, 'JSON-LD fehlt');
    const types = home['@graph'].map((n) => n['@type']);
    assert.ok(types.includes('Organization'));
    assert.ok(types.includes('LocalBusiness'));
    assert.ok(types.includes('WebSite'));
    assert.ok(!types.includes('BreadcrumbList'));
    const business = home['@graph'].find((n) => n['@type'] === 'LocalBusiness');
    assert.equal(business.areaServed, 'DE');
    assert.equal(business.address.addressLocality, 'Memmingen');
    assert.equal(business.address.streetAddress, undefined, 'keine erfundene Straße');
    assert.equal(business.telephone, undefined, 'keine erfundene Telefonnummer');
    assert.doesNotMatch(JSON.stringify(home), /\[[A-ZÄÖÜ][^\]]*\]/, 'Platzhalter im JSON-LD');

    const haendler = jsonLdOf((await c.get('/haendler')).text);
    const crumbs = haendler['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
    assert.ok(crumbs, 'BreadcrumbList fehlt');
    assert.equal(crumbs.itemListElement.length, 2);
    assert.equal(crumbs.itemListElement[1].name, 'Für Händler');
    const faq = haendler['@graph'].find((n) => n['@type'] === 'FAQPage');
    assert.ok(faq, 'FAQPage fehlt');
    for (const q of faq.mainEntity) assert.doesNotMatch(q.acceptedAnswer.text, /\[/, 'FAQ mit Platzhalter-Antwort');

    const philo = jsonLdOf((await c.get('/philosophie')).text);
    const about = philo['@graph'].find((n) => n['@type'] === 'AboutPage');
    assert.equal(about.mainEntity.name, 'Eyyüp Koca');
  });

  it('setzt auf Seiten ohne Formular kein Cookie, auf Formularseiten nur das Sitzungs-Cookie', async () => {
    const c = client(app.baseUrl);
    const home = await c.get('/');
    assert.equal(home.setCookies.length, 0, 'Startseite darf kein Cookie setzen');
    const form = await c.get('/haendler');
    assert.equal(form.setCookies.length, 1);
    const sc = form.setCookies[0];
    assert.equal(sc.name, 'hn_sid_corporate');
    assert.ok(sc.attributes.httponly);
    assert.equal(String(sc.attributes.samesite).toLowerCase(), 'lax');
    assert.match(form.headers.get('cache-control') || '', /no-store/);
    const cookies = await c.get('/cookies');
    assert.match(cookies.text, /<code>hn_sid_corporate<\/code>/);
    assert.match(cookies.text, /hn_intro_seen/);
    assert.match(cookies.text, /§ 25 Abs\. 2 Nr\. 2 TDDDG/);
  });

  it('weist POST ohne CSRF-Token mit 403 ab und speichert nichts', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', { ...VALID_INQUIRY, _csrf: undefined });
    assert.equal(res.status, 403);
    assert.match(res.text, /Formular/);
    const wrong = await c.post('/haendler/anfrage', { ...VALID_INQUIRY, _csrf: 'falsch' });
    assert.equal(wrong.status, 403);
    const fb = await c.post('/feedback', { art: 'feedback', nachricht: 'Hallo', _csrf: undefined });
    assert.equal(fb.status, 403);
    assert.equal(countRows(app.db, 'inquiries'), before);
  });

  it('gültige Händleranfrage: speichert, benachrichtigt den Inhaber und leitet weiter (PRG)', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    app.outbox.length = 0;
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', VALID_INQUIRY);
    assert.equal(res.status, 303);
    assert.equal(res.location, '/haendler#danke');
    assert.equal(countRows(app.db, 'inquiries'), before + 1);

    const row = app.db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 1').get();
    assert.equal(row.company, 'Feinkost Anadolu GmbH');
    assert.equal(row.contact_name, 'Ayşe Yılmaz');
    assert.equal(row.email, 'einkauf@anadolu.example');
    assert.equal(row.phone, '+49 731 123456');
    assert.equal(row.zip_city, '89073 Ulm');
    assert.equal(row.business_type, 'Internationaler Supermarkt');
    assert.deepEqual(JSON.parse(row.assortments_json), ['Premium Sarma Lokum', 'Hausgemachtes Turşu']);
    assert.equal(row.status, 'neu');

    const mail = lastMail(app.outbox, app.config.mail.ownerEmail);
    assert.ok(mail, 'Mail an den Inhaber fehlt');
    assert.match(mail.subject, /Neue Händleranfrage: Feinkost Anadolu GmbH/);
    assert.equal(mail.replyTo, 'einkauf@anadolu.example');
    assert.match(mail.text, /Premium Sarma Lokum, Hausgemachtes Turşu/);
    assert.match(mail.text, /\/admin\/anfragen/);

    // Erfolgsseite: einmalig, noindex
    const done = await c.get(res.location);
    assert.equal(done.status, 200);
    assert.match(done.text, /Vielen Dank für Ihre Anfrage\./);
    assert.doesNotMatch(done.text, /id="anfrage-form"/);
    assert.match(done.headers.get('x-robots-tag') || '', /noindex/);
    assert.match(done.text, /<meta name="robots" content="noindex, nofollow">/);
    const again = await c.get('/haendler');
    assert.match(again.text, /id="anfrage-form"/, 'Formular muss nach der Erfolgsmeldung wieder erscheinen');
    assert.doesNotMatch(again.text, /Vielen Dank für Ihre Anfrage\./);
  });

  it('ungültige Händleranfrage: 422 mit deutschen Fehlern, Werte bleiben erhalten, kein Datensatz', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    app.outbox.length = 0;
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', {
      firma: '',
      name: 'Ayşe Yılmaz',
      email: 'keine-mail',
      ort: 'Ulm',
      typ: 'raumschiff',
      sortiment: ['tursu', 'gibt-es-nicht'],
      nachricht: 'Bitte zurückrufen',
    });
    assert.equal(res.status, 422);
    assert.match(res.text, /Bitte prüfen Sie die markierten Felder\./);
    assert.match(res.text, /Bitte geben Sie den Namen Ihres Unternehmens ein\./);
    assert.match(res.text, /Bitte geben Sie eine gültige E-Mail-Adresse ein/);
    assert.match(res.text, /Bitte geben Sie Postleitzahl und Ort an/);
    assert.match(res.text, /Bitte wählen Sie die Art Ihres Geschäfts\./);
    assert.match(res.text, /Bitte bestätigen Sie die Datenschutzhinweise/);
    assert.match(res.text, /aria-invalid="true"/);
    assert.match(res.text, /id="f-name"[^>]*value="Ayşe Yılmaz"|value="Ayşe Yılmaz"[^>]*id="f-name"/);
    assert.match(res.text, />Bitte zurückrufen<\/textarea>/);
    assert.match(res.text, /value="tursu" checked/, 'gewählte Sortimente bleiben angehakt');
    assert.doesNotMatch(res.text, /value="sarma-lokum" checked/);
    assert.equal(countRows(app.db, 'inquiries'), before);
    assert.equal(app.outbox.length, 0);
  });

  it('lehnt Zeilenumbrüche in einzeiligen Feldern ab (Header-/E-Mail-Injection)', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', {
      ...VALID_INQUIRY,
      firma: 'Evil GmbH\r\nBcc: opfer@example.com',
      email: 'a@example.com\r\nBcc: b@example.com',
    });
    assert.equal(res.status, 422);
    assert.equal(countRows(app.db, 'inquiries'), before);
  });

  it('Honeypot befüllt: Erfolg wird vorgetäuscht, nichts gespeichert, keine Mail', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    app.outbox.length = 0;
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', { ...VALID_INQUIRY, website: 'https://spam.example' });
    assert.equal(res.status, 303);
    assert.equal(res.location, '/haendler#danke');
    assert.equal(countRows(app.db, 'inquiries'), before);
    assert.equal(app.outbox.length, 0);
    const page = await c.get(res.location);
    assert.match(page.text, /Vielen Dank für Ihre Anfrage\./);
  });

  it('XSS: Nachricht wird wörtlich gespeichert und nur escaped ausgegeben', async () => {
    const payload = '<script>alert("x")</script><img src=x onerror=alert(1)>{{ 7*7 }}';
    const c = client(app.baseUrl);
    await c.get('/haendler');
    app.outbox.length = 0;
    const ok = await c.post('/haendler/anfrage', { ...VALID_INQUIRY, nachricht: payload });
    assert.equal(ok.status, 303);
    const row = app.db.prepare('SELECT message FROM inquiries ORDER BY id DESC LIMIT 1').get();
    assert.equal(row.message, payload, 'muss wörtlich gespeichert werden');
    const mail = lastMail(app.outbox, app.config.mail.ownerEmail);
    assert.ok(!mail.html.includes('<script>alert'), 'HTML-Mail muss escaped sein');
    assert.ok(mail.html.includes('&lt;script&gt;'));

    // erneute Anzeige im Fehlerfall: escaped, nicht ausgeführt, nicht als Template ausgewertet
    await c.get('/haendler');
    const bad = await c.post('/haendler/anfrage', { ...VALID_INQUIRY, firma: '', nachricht: payload });
    assert.equal(bad.status, 422);
    assert.ok(!bad.text.includes('<script>alert("x")'), 'Payload darf nicht roh im HTML stehen');
    assert.ok(!bad.text.includes('<img src=x onerror'), 'Payload darf nicht roh im HTML stehen');
    assert.ok(bad.text.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
    assert.ok(bad.text.includes('{{ 7*7 }}'), 'Nutzereingaben dürfen nie als Template ausgewertet werden');
    assert.ok(!/>49</.test(bad.text));
  });

  it('Feedback: Seite vorbelegt (nur sichere Pfade derselben Website), noindex', async () => {
    const c = client(app.baseUrl);
    const fromQuery = await c.get('/feedback?von=%2Fmesse-chronik');
    assert.equal(fromQuery.status, 200);
    assert.match(fromQuery.text, /id="f-seite"[^>]*value="\/messe-chronik"/);
    assert.match(fromQuery.headers.get('x-robots-tag') || '', /noindex/);
    assert.match(fromQuery.text, /<meta name="robots" content="noindex, nofollow">/);

    const evil = await c.get('/feedback?von=%2F%2Fevil.example%2Fx');
    assert.match(evil.text, /id="f-seite"[^>]*value=""/);
    const absolute = await c.get('/feedback?von=https%3A%2F%2Fevil.example');
    assert.match(absolute.text, /id="f-seite"[^>]*value=""/);

    const ref = await c.get('/feedback', { headers: { referer: `${app.baseUrl}/haendler` } });
    assert.match(ref.text, /id="f-seite"[^>]*value="\/haendler"/);
    const foreign = await c.get('/feedback', { headers: { referer: 'https://evil.example/haendler' } });
    assert.match(foreign.text, /id="f-seite"[^>]*value=""/);
    const none = await c.get('/feedback');
    assert.match(none.text, /id="f-seite"[^>]*value=""/);
  });

  it('Feedback: Fehlermeldung mit Schritten und technischen Angaben (nur mit Häkchen) speichern + Mail', async () => {
    const c = client(app.baseUrl);
    await c.get('/feedback');
    app.outbox.length = 0;
    const res = await c.post('/feedback', {
      art: 'bug',
      nachricht: 'Der Button reagiert nicht.',
      seite: '/haendler',
      schritte: 'Formular ausgefüllt, gesendet.',
      erwartet: 'Eine Bestätigung.',
      technik: 'on',
      browser: 'Mozilla/5.0 Test · Fenster 390×844 px',
      email: 'kunde@example.com',
    });
    assert.equal(res.status, 303);
    assert.equal(res.location, '/feedback#danke');
    const row = app.db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 1').get();
    assert.equal(row.app, 'corporate');
    assert.equal(row.kind, 'bug');
    assert.equal(row.page_url, '/haendler');
    assert.equal(row.steps, 'Formular ausgefüllt, gesendet.');
    assert.equal(row.expected, 'Eine Bestätigung.');
    assert.equal(row.browser_info, 'Mozilla/5.0 Test · Fenster 390×844 px');
    assert.equal(row.email, 'kunde@example.com');
    const mail = lastMail(app.outbox, app.config.mail.ownerEmail);
    assert.ok(mail, 'Mail an den Inhaber fehlt');
    assert.match(mail.subject, /Fehlermeldung/);
    assert.equal(mail.replyTo, 'kunde@example.com');
    const done = await c.get(res.location);
    assert.match(done.text, /Vielen Dank für Ihre Nachricht!/);

    // Idee ohne Häkchen: Schritte und Browserangaben werden verworfen
    await c.get('/feedback');
    const idea = await c.post('/feedback', {
      art: 'idee',
      nachricht: 'Eine Karte der Messestände wäre schön.',
      schritte: 'sollte ignoriert werden',
      browser: 'darf nicht gespeichert werden',
    });
    assert.equal(idea.status, 303);
    const row2 = app.db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 1').get();
    assert.equal(row2.kind, 'idee');
    assert.equal(row2.steps, null);
    assert.equal(row2.browser_info, null);
    assert.equal(row2.email, null);
  });

  it('Feedback: ungültige Angaben → 422 mit deutschen Meldungen, kein Datensatz', async () => {
    const c = client(app.baseUrl);
    await c.get('/feedback');
    const before = countRows(app.db, 'feedback');
    const res = await c.post('/feedback', { art: 'spam', nachricht: '   ', email: 'nicht-gültig' });
    assert.equal(res.status, 422);
    assert.match(res.text, /Bitte wählen Sie aus, worum es geht\./);
    assert.match(res.text, /Bitte schreiben Sie uns, was Sie uns mitteilen möchten\./);
    assert.match(res.text, /Bitte geben Sie eine gültige E-Mail-Adresse ein/);
    assert.equal(countRows(app.db, 'feedback'), before);
  });

  it('robots.txt sperrt außerhalb der Produktion alles', async () => {
    const res = await client(app.baseUrl).get('/robots.txt');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/plain/);
    assert.equal(res.text, 'User-agent: *\nDisallow: /\n');
  });

  it('sitemap.xml listet alle öffentlichen Seiten mit lastmod – ohne Feedback', async () => {
    const res = await client(app.baseUrl).get('/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/xml/);
    assert.match(res.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    for (const p of ['/', '/philosophie', '/messe-chronik', '/haendler', '/impressum', '/datenschutz', '/cookies']) {
      assert.ok(res.text.includes(`<loc>${app.baseUrl}${p}</loc>`), `sitemap ohne ${p}`);
    }
    assert.ok(!res.text.includes('/feedback'), 'Feedback (noindex) gehört nicht in die Sitemap');
    assert.equal((res.text.match(/<url>/g) || []).length, 7);
    assert.equal((res.text.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length, 7);
    assert.match(res.text, /<priority>1\.0<\/priority>/);
  });

  it('zeigt für unbekannte Seiten eine deutsche 404-Seite (noindex)', async () => {
    const res = await client(app.baseUrl).get('/gibt-es-nicht');
    assert.equal(res.status, 404);
    assert.match(res.text, /Diese Seite haben wir leider/);
    assert.match(res.text, /Zur Startseite/);
    assert.match(res.headers.get('x-robots-tag') || '', /noindex/);
    const xss = await client(app.baseUrl).get('/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    assert.equal(xss.status, 404);
    assert.ok(!xss.text.includes('<script>alert(1)'));
  });

  it('liefert eigene CSS/JS-Dateien aus, ohne Inline-Handler im Skript', async () => {
    const c = client(app.baseUrl);
    const css = await c.get('/static/css/site.css');
    assert.equal(css.status, 200);
    assert.match(css.text, /--c-emerald:#0E4B3B/);
    assert.match(css.text, /prefers-reduced-motion: reduce/);
    const js = await c.get('/static/js/site.js');
    assert.equal(js.status, 200);
    assert.match(js.text, /threshold: 0\.15, rootMargin: '0px 0px -10% 0px'/);
    assert.match(js.text, /vh\(\) \* 0\.55/);
    assert.doesNotMatch(js.text, /\beval\(|new Function\(|innerHTML\s*=/);
  });
});

/* ====================================================================== */

describe('Corporate Hub – Indexierung erlaubt (Produktions-SEO)', () => {
  let app;
  before(async () => {
    app = await startApp('corporate', { env: { ALLOW_INDEXING: 'true' } });
  });
  after(async () => {
    await app.close();
  });

  it('robots.txt erlaubt alles und nennt die Sitemap', async () => {
    const res = await client(app.baseUrl).get('/robots.txt');
    assert.match(res.text, /^User-agent: \*\nAllow: \//);
    assert.ok(res.text.includes(`Sitemap: ${app.baseUrl}/sitemap.xml`));
    assert.doesNotMatch(res.text, /Disallow: \/\n/);
  });

  it('Seiten tragen Canonical, Open Graph und index-Robots; Feedback bleibt noindex', async () => {
    const c = client(app.baseUrl);
    const philo = await c.get('/philosophie');
    assert.match(philo.text, new RegExp(`<link rel="canonical" href="${app.baseUrl}/philosophie">`));
    assert.match(philo.text, /<meta name="robots" content="index, follow/);
    assert.match(philo.text, /<meta property="og:title" content="Philosophie – was Hasret bedeutet · Hasret Nuts">/);
    assert.ok(philo.text.includes(`<meta property="og:image" content="${app.baseUrl}/assets/logo/og-default.png">`));
    assert.match(philo.text, /<link rel="icon" href="\/assets\/logo\/favicon\.svg"/);
    const fb = await c.get('/feedback');
    assert.match(fb.text, /<meta name="robots" content="noindex, nofollow">/);
    assert.doesNotMatch(fb.text, /rel="canonical"/);
  });
});

/* ====================================================================== */

describe('Corporate Hub – Ratenlimit für Formulare', () => {
  let app;
  before(async () => {
    app = await startApp('corporate', { env: { RATE_LIMIT_FORMS_MAX: '2' } });
  });
  after(async () => {
    await app.close();
  });

  it('antwortet nach Überschreiten des Limits mit 429 (deutsch) und speichert nichts mehr', async () => {
    const c = client(app.baseUrl);
    await c.get('/haendler');
    assert.equal((await c.post('/haendler/anfrage', VALID_INQUIRY)).status, 303);
    await c.get('/haendler');
    assert.equal((await c.post('/haendler/anfrage', VALID_INQUIRY)).status, 303);
    await c.get('/haendler');
    const before = countRows(app.db, 'inquiries');
    const res = await c.post('/haendler/anfrage', VALID_INQUIRY);
    assert.equal(res.status, 429);
    assert.match(res.text, /Sie haben in kurzer Zeit mehrere Anfragen gesendet/);
    assert.ok(res.headers.get('ratelimit') || res.headers.get('ratelimit-policy'), 'Standard-RateLimit-Header fehlen');
    assert.equal(countRows(app.db, 'inquiries'), before);
    // Feedback teilt sich das Formular-Limit
    await c.get('/feedback');
    const fb = await c.post('/feedback', { art: 'feedback', nachricht: 'Hallo' });
    assert.equal(fb.status, 429);
  });
});
