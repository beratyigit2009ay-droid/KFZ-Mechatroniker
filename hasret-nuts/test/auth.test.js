'use strict';
/**
 * Tests für Kundenkonto, Anmeldung und Verwaltung (BUILD-AUTH):
 * Registrierung → Bestätigung → Anmeldung → Abmeldung, neutrale Antworten (keine Konten-Ausspähung),
 * Kontosperre, Passwort vergessen/zurücksetzen, Passwort ändern, Konto löschen, Zugriffsschutz
 * (IDOR, Admin), offene Weiterleitungen, CSRF, Cookie-Flags, Injection.
 *   node --test test/auth.test.js
 */
const helpers = require('./helpers'); // zuerst laden (setzt NODE_ENV=test)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../shared/auth');
const { nowIso } = require('../shared/db');

const { startApp, client, lastMail, extractToken, pathOf } = helpers;

const PW = 'Mandelblüte-im-Herbst-42';
const PW2 = 'Pistazien-Sonnenaufgang-7';

let srv;
let seq = 0;
const uniqueEmail = (tag = 'kunde') => `${tag}.${Date.now().toString(36)}.${++seq}@example.com`;

/** Seiteninhalt ohne wechselnde Werte (Nonce, CSRF-Token) – für Vergleiche neutraler Antworten. */
function normalize(html) {
  return html.replace(/nonce="[^"]*"/g, 'nonce=""').replace(/(name="_csrf" value=|name="csrf-token" content=)"[^"]*"/g, '$1""');
}

function sessionCookie(res) {
  return res.setCookies.find((sc) => sc.name.startsWith('hn_sid_shop') || sc.name.startsWith('__Host-hn_sid_shop'));
}

async function register(c, { email, password = PW, name = 'Ayşe Demir' }) {
  await c.get('/konto/registrieren');
  return c.post('/konto/registrieren', { name, email, password, passwordConfirm: password, privacy: 'on' });
}

async function verifyFromMail(c, email) {
  const mail = lastMail(srv.outbox, email);
  assert.ok(mail, `Bestätigungsmail an ${email} fehlt`);
  const token = extractToken(mail.text);
  assert.ok(token, 'Token im Mailtext fehlt');
  await c.get(`/konto/bestaetigen?token=${token}`);
  return c.post('/konto/bestaetigen', { token });
}

async function login(c, email, password = PW, extra = {}) {
  await c.get('/konto/anmelden');
  return c.post('/konto/anmelden', { email, password, ...extra });
}

/** Verifiziertes Konto direkt anlegen und mit dem Client anmelden. */
async function verifiedUser(c, { email = uniqueEmail(), password = PW, name = 'Mehmet Yılmaz', role = 'customer' } = {}) {
  const user = await auth.createUser({ email, password, name, role, emailVerified: true });
  const res = await login(c, email, password);
  assert.equal(res.status, 303, 'Anmeldung fehlgeschlagen');
  return user;
}

let orderSeq = 0;
function insertOrder({ userId = null, email = 'gast@example.com', name = 'Gast Kunde', status = 'neu' } = {}) {
  const db = srv.db;
  const publicId = `HN-2026-${String(9000 + ++orderSeq).padStart(4, '0')}`;
  const info = db
    .prepare(
      `INSERT INTO orders (public_id, user_id, email, name, phone, street, zip, city, country, delivery, payment_pref, message,
                           discount_code, subtotal_cents, discount_cents, total_cents, status)
       VALUES (?, ?, ?, ?, NULL, 'Musterweg 1', '87700', 'Memmingen', 'DE', 'versand', 'Überweisung', 'Bitte gut verpacken', NULL, 1550, 0, 1550, ?)`
    )
    .run(publicId, userId, email, name, status);
  db.prepare(
    `INSERT INTO order_items (order_id, sku, name, variant, unit_price_cents, qty, line_total_cents, bundle_json)
     VALUES (?, 'sarma-lokum-pistazie', 'Premium Sarma Lokum', 'Pistazie', 800, 1, 800, NULL),
            (?, 'sarma-lokum-rose', 'Premium Sarma Lokum', 'Rose', 750, 1, 750, NULL)`
  ).run(info.lastInsertRowid, info.lastInsertRowid);
  return { id: Number(info.lastInsertRowid), publicId };
}

// Mail-Kontingent pro Adresse wie in Produktion (3/h); alle übrigen Limits großzügig (Testmodus).
const APP_ENV = { RATE_LIMIT_MAIL_PER_ADDRESS_MAX: '3' };

before(async () => {
  srv = await startApp('shop', { env: APP_ENV });
});

after(async () => {
  if (srv) await srv.close();
});

/* ======================================================================= */

describe('Registrierung, Bestätigung, Anmeldung, Abmeldung', () => {
  it('kompletter Ablauf: Mail → GET verbraucht nichts → POST bestätigt → angemeldet → Abmelden', async () => {
    const c = client(srv.baseUrl);
    const email = uniqueEmail('flow');

    const reg = await register(c, { email, name: 'Ayşe Demir' });
    assert.equal(reg.status, 303);
    assert.equal(reg.location, '/konto/bestaetigen');

    const pending = await c.get('/konto/bestaetigen');
    assert.equal(pending.status, 200);
    assert.match(pending.text, /Bitte bestätigen Sie Ihre/);
    assert.match(pending.text, /action="\/konto\/bestaetigung-erneut"/);

    const user = auth.findUserByEmail(email);
    assert.ok(user, 'Nutzer wurde angelegt');
    assert.equal(user.email_verified_at, null, 'zunächst unbestätigt');
    assert.notEqual(user.password_hash, PW);
    assert.match(user.password_hash, /^scrypt\$/);

    const mail = lastMail(srv.outbox, email);
    assert.ok(mail);
    assert.match(mail.subject, /bestätig/i);
    const token = extractToken(mail.text);
    assert.ok(token);
    assert.ok(mail.text.includes(`${srv.baseUrl}/konto/bestaetigen?token=${token}`), 'Link zeigt auf die Shop-URL');

    // Vor der Bestätigung: /konto nicht erreichbar
    assert.equal((await c.get('/konto')).status, 302);

    // GET (z. B. Link-Scanner) zweimal: zeigt nur den Button, verbraucht das Token nicht
    const g1 = await c.get(`/konto/bestaetigen?token=${token}`);
    assert.equal(g1.status, 200);
    assert.match(g1.text, /E-Mail-Adresse jetzt bestätigen/);
    assert.match(g1.text, /<form[^>]+method="post"[^>]+action="\/konto\/bestaetigen"/);
    assert.equal(g1.headers.get('referrer-policy'), 'no-referrer');
    assert.match(g1.headers.get('cache-control') || '', /no-store/);
    const g2 = await c.get(`/konto/bestaetigen?token=${token}`);
    assert.equal(g2.status, 200);
    assert.equal(auth.findUserByEmail(email).email_verified_at, null, 'GET bestätigt nicht');

    // POST verbraucht das Token, bestätigt, meldet an (neue Sitzungs-ID)
    const before = c.jar.get('hn_sid_shop');
    const post = await c.post('/konto/bestaetigen', { token });
    assert.equal(post.status, 303);
    assert.equal(post.location, '/konto');
    assert.notEqual(c.jar.get('hn_sid_shop'), before, 'Sitzung wurde erneuert (Fixation-Schutz)');
    assert.ok(auth.findUserByEmail(email).email_verified_at, 'jetzt bestätigt');

    const konto = await c.get('/konto');
    assert.equal(konto.status, 200);
    assert.match(konto.text, /Ayşe Demir/);
    assert.match(konto.text, /E-Mail bestätigt/);
    assert.match(konto.text, /Ihre E-Mail-Adresse ist bestätigt/, 'Flash-Meldung');
    assert.match(konto.headers.get('x-robots-tag') || '', /noindex/);
    assert.match(konto.headers.get('cache-control') || '', /no-store/);
    assert.match(konto.text, /href="\/konto"[^>]*aria-label="Mein Konto/, 'Header zeigt „Mein Konto“');

    // Token ist verbraucht
    const again = await c.post('/konto/bestaetigen', { token });
    assert.equal(again.status, 400);
    assert.match(again.text, /nicht mehr gültig/);

    // Abmelden (POST + CSRF) → Sitzung serverseitig weg
    const sidBeforeLogout = c.jar.get('hn_sid_shop');
    const out = await c.post('/konto/abmelden', {});
    assert.equal(out.status, 303);
    assert.equal(out.location, '/');
    const gone = srv.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(user.id).n;
    assert.equal(gone, 0, 'keine Sitzung des Nutzers mehr in der DB');
    const afterLogout = await c.get('/konto');
    assert.equal(afterLogout.status, 302);
    assert.equal(afterLogout.location, '/konto/anmelden?next=%2Fkonto');

    // Alter Cookie bleibt wirkungslos
    const replay = client(srv.baseUrl);
    replay.setCookie('hn_sid_shop', sidBeforeLogout);
    assert.equal((await replay.get('/konto')).status, 302);
  });

  it('Header: abgemeldet „Anmelden“, angemeldet „Mein Konto“, Admin zusätzlich „Verwaltung“', async () => {
    const anon = client(srv.baseUrl);
    const home = await anon.get('/konto/anmelden');
    assert.match(home.text, /href="\/konto\/anmelden"[^>]*aria-label="Anmelden"/);
    assert.doesNotMatch(home.text, /aria-label="Verwaltung"/);

    const cust = client(srv.baseUrl);
    await verifiedUser(cust);
    const p1 = await cust.get('/konto/bestellungen');
    assert.match(p1.text, /aria-label="Mein Konto/);
    assert.doesNotMatch(p1.text, /aria-label="Verwaltung"/);

    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    const p2 = await adm.get('/konto');
    assert.match(p2.text, /href="\/admin"[^>]*aria-label="Verwaltung"/);
  });

  it('Anmeldung mit falschem Passwort oder unbekannter Adresse: dieselbe neutrale Meldung', async () => {
    const email = uniqueEmail('wrong');
    await auth.createUser({ email, password: PW, name: 'Test', emailVerified: true });
    const c = client(srv.baseUrl);
    const r1 = await login(c, email, 'falsches-passwort-123');
    const r2 = await login(c, uniqueEmail('nobody'), 'falsches-passwort-123');
    for (const r of [r1, r2]) {
      assert.equal(r.status, 422);
      assert.match(r.text, /E-Mail oder Passwort ist nicht korrekt\./);
      assert.doesNotMatch(r.text, /gesperrt|existiert nicht|unbekannt/i);
    }
    assert.equal((await c.get('/konto')).status, 302, 'nicht angemeldet');
    const failures = srv.db.prepare("SELECT COUNT(*) AS n FROM security_events WHERE type = 'login_failure'").get().n;
    assert.ok(failures >= 2, 'Fehlversuche werden protokolliert');
    const raw = srv.db.prepare('SELECT ip_hash FROM security_events WHERE ip_hash IS NOT NULL LIMIT 1').get();
    assert.ok(raw && /^[a-f0-9]{16,}$/.test(raw.ip_hash) && !raw.ip_hash.includes('127.0.0.1'), 'nur gehashte IP');
  });

  it('5 Fehlversuche sperren das Konto für dieses Gerät – auch das richtige Passwort wird dann neutral abgelehnt', async () => {
    const email = uniqueEmail('lock');
    await auth.createUser({ email, password: PW, name: 'Gesperrt', emailVerified: true });
    const c = client(srv.baseUrl);
    for (let i = 0; i < 5; i++) {
      const r = await login(c, email, `falsch-${i}-passwort`);
      assert.equal(r.status, 422);
    }
    const row = auth.findUserByEmail(email);
    const lock = srv.db.prepare('SELECT locked_until FROM login_attempts WHERE user_id = ?').get(row.id);
    assert.ok(lock && lock.locked_until > nowIso(), 'Sperre für Konto + Gerät gesetzt');
    assert.equal(row.locked_until, null, 'kein kontoweites Sperren durch einen einzelnen Absender');
    const ok = await login(c, email, PW);
    assert.equal(ok.status, 422);
    assert.match(ok.text, /E-Mail oder Passwort ist nicht korrekt\./);
    assert.equal((await c.get('/konto')).status, 302);

    // Nach Ablauf der Sperre klappt es wieder
    srv.db.prepare('UPDATE login_attempts SET locked_until = ? WHERE user_id = ?').run(nowIso(-1000), row.id);
    const later = await login(c, email, PW);
    assert.equal(later.status, 303);
  });

  it('Pre-Hijacking: fremd vorab registrierte Adresse – die echte Inhaberin übernimmt, der Angreifer verliert den Zugriff', async () => {
    const email = uniqueEmail('prehijack');
    const attacker = client(srv.baseUrl);
    await register(attacker, { email, password: 'Angreifer-Kennwort-42', name: 'Angreifer' });
    const victim = client(srv.baseUrl);
    const reg = await register(victim, { email, password: 'Opfer-eigenes-Pw-456', name: 'Echte Inhaberin' });
    assert.equal(reg.status, 303);
    assert.equal(auth.findUserByEmail(email).name, 'Echte Inhaberin', 'neue Registrierung ersetzt das unbestätigte Konto');
    const mails = srv.outbox.filter((m) => m.toList.includes(email));
    const lastToken = extractToken(mails[mails.length - 1].text);
    const firstToken = extractToken(mails[0].text);
    assert.notEqual(firstToken, lastToken);
    assert.equal((await attacker.post('/konto/bestaetigen', { token: firstToken })).status, 400, 'alter Link des Angreifers ist entwertet');
    await victim.get(`/konto/bestaetigen?token=${lastToken}`);
    const ok = await victim.post('/konto/bestaetigen', { token: lastToken });
    assert.equal(ok.location, '/konto', 'die Inhaberin ist in ihrer eigenen Sitzung angemeldet');
    assert.equal((await login(client(srv.baseUrl), email, 'Angreifer-Kennwort-42')).status, 422, 'Passwort des Angreifers gilt nicht');
    assert.equal((await login(client(srv.baseUrl), email, 'Opfer-eigenes-Pw-456')).status, 303);
    for (const m of mails) assert.doesNotMatch(m.text, /Angreifer|Echte Inhaberin/, 'Mails an unbestätigte Adressen ohne eingegebenen Namen');
  });

  it('Bestätigungslink in fremder Sitzung: bestätigt, meldet aber niemanden an und übernimmt keine Sitzung', async () => {
    const email = uniqueEmail('foreignlink');
    const owner = client(srv.baseUrl);
    await register(owner, { email });
    const token = extractToken(lastMail(srv.outbox, email).text);
    const other = client(srv.baseUrl);
    const someone = await verifiedUser(other, { email: uniqueEmail('someone'), name: 'Jemand Anderes' });
    const page = await other.get(`/konto/bestaetigen?token=${token}`);
    assert.ok(page.text.includes(email), 'Bestätigungsseite nennt die Adresse');
    const post = await other.post('/konto/bestaetigen', { token });
    assert.equal(post.status, 303);
    assert.equal(post.location, '/konto/anmelden');
    assert.ok(auth.findUserByEmail(email).email_verified_at, 'Adresse ist bestätigt');
    const konto = await other.get('/konto');
    assert.match(konto.text, /Jemand Anderes/, 'die laufende Sitzung gehört weiterhin dem eigenen Konto');
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(auth.findUserByEmail(email).id).n, 0);
    assert.ok(someone.id);
  });

  it('unbestätigte Konten können sich nicht anmelden (Hinweis + Erneut senden, keine Sitzung)', async () => {
    const c = client(srv.baseUrl);
    const email = uniqueEmail('unverified');
    await register(c, { email });
    const r = await login(c, email, PW);
    assert.equal(r.status, 403);
    assert.match(r.text, /noch <em>nicht bestätigt<\/em>|noch nicht bestätigt/);
    assert.match(r.text, /action="\/konto\/bestaetigung-erneut"/);
    assert.equal((await c.get('/konto')).status, 302, 'keine Sitzung');

    // Erneut senden: neutrale Antwort, neue Mail an die Adresse
    const before = srv.outbox.length;
    const resend = await c.post('/konto/bestaetigung-erneut', { email });
    assert.equal(resend.status, 303);
    assert.equal(srv.outbox.length, before + 1);
    const page = await c.get('/konto/bestaetigen');
    assert.match(page.text, /Falls zu dieser Adresse ein noch nicht bestätigtes Konto besteht/);

    // Unbekannte Adresse: gleiche Antwort, keine Mail
    const before2 = srv.outbox.length;
    const resend2 = await c.post('/konto/bestaetigung-erneut', { email: uniqueEmail('niemand') });
    assert.equal(resend2.status, 303);
    assert.equal(resend2.location, resend.location);
    assert.equal(srv.outbox.length, before2);
  });

  it('Registrierung mit bereits registrierter Adresse: gleiche Antwort, Hinweis-Mail statt zweitem Konto', async () => {
    const email = uniqueEmail('exists');
    await auth.createUser({ email, password: PW, name: 'Erstes Konto', emailVerified: true });
    const countBefore = srv.db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

    const fresh = client(srv.baseUrl);
    const rNew = await register(fresh, { email: uniqueEmail('neu') });
    const dup = client(srv.baseUrl);
    const rDup = await register(dup, { email: email.toUpperCase(), password: PW2, name: 'Angreifer' });

    assert.equal(rDup.status, rNew.status);
    assert.equal(rDup.location, rNew.location);
    const pNew = await fresh.get('/konto/bestaetigen');
    const pDup = await dup.get('/konto/bestaetigen');
    assert.equal(pDup.status, pNew.status);
    assert.match(pDup.text, /Bitte bestätigen Sie Ihre/);

    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, countBefore + 1, 'nur das neue Konto kam hinzu');
    const mail = lastMail(srv.outbox, email);
    assert.ok(mail);
    assert.match(mail.subject, /bereits ein Kundenkonto/);
    assert.doesNotMatch(mail.text, /token=/, 'keine Tokens in der Hinweis-Mail');
    // Altes Passwort bleibt gültig
    assert.ok(await auth.verifyPassword(PW, auth.findUserByEmail(email).password_hash));
  });

  it('Registrierung validiert Eingaben (Passwortregeln, Wiederholung, Einwilligung) und füllt Passwörter nie vor', async () => {
    const c = client(srv.baseUrl);
    await c.get('/konto/registrieren');
    const r = await c.post('/konto/registrieren', { name: 'A', email: 'kein-mail', password: 'kurz', passwordConfirm: 'anders' });
    assert.equal(r.status, 422);
    assert.match(r.text, /error-summary/);
    assert.match(r.text, /mindestens 10 Zeichen/);
    assert.match(r.text, /Datenschutzerklärung zur Kenntnis/);
    assert.doesNotMatch(r.text, /value="kurz"/);

    const email = uniqueEmail('same');
    const r2 = await c.post('/konto/registrieren', { name: 'Gleich', email, password: email, passwordConfirm: email, privacy: 'on' });
    assert.equal(r2.status, 422, 'Passwort darf nicht der E-Mail entsprechen');
    assert.equal(auth.findUserByEmail(email), null);
  });

  it('Honeypot: Bot-Registrierung täuscht Erfolg vor, legt aber nichts an', async () => {
    const c = client(srv.baseUrl);
    const email = uniqueEmail('bot');
    await c.get('/konto/registrieren');
    const r = await c.post('/konto/registrieren', { name: 'Bot', email, password: PW, passwordConfirm: PW, privacy: 'on', website: 'http://spam.example' });
    assert.equal(r.status, 303);
    assert.equal(r.location, '/konto/bestaetigen');
    assert.equal(auth.findUserByEmail(email), null);
    assert.ok(!lastMail(srv.outbox, email), 'keine Mail');
  });
});

/* ======================================================================= */

describe('Passwort vergessen & zurücksetzen', () => {
  it('immer dieselbe Antwort – egal ob die Adresse existiert', async () => {
    const email = uniqueEmail('forgot');
    await auth.createUser({ email, password: PW, name: 'Vergesslich', emailVerified: true });
    const c = client(srv.baseUrl);
    await c.get('/konto/passwort-vergessen');

    const before = srv.outbox.length;
    const known = await c.post('/konto/passwort-vergessen', { email });
    const knownPage = await c.get('/konto/passwort-vergessen');
    assert.equal(srv.outbox.length, before + 1, 'Mail nur für bestehendes Konto');

    const unknown = await c.post('/konto/passwort-vergessen', { email: uniqueEmail('gibtsnicht') });
    const unknownPage = await c.get('/konto/passwort-vergessen');
    assert.equal(srv.outbox.length, before + 1, 'keine Mail für unbekannte Adresse');

    assert.equal(known.status, 303);
    assert.equal(unknown.status, known.status);
    assert.equal(unknown.location, known.location);
    assert.equal(normalize(unknownPage.text), normalize(knownPage.text), 'Seiten identisch');
    assert.match(knownPage.text, /Falls zu dieser E-Mail-Adresse ein Kundenkonto besteht/);
  });

  it('höchstens 3 Reset-Mails pro Stunde und Adresse (Antwort bleibt gleich)', async () => {
    const email = uniqueEmail('quota');
    await auth.createUser({ email, password: PW, name: 'Quote', emailVerified: true });
    const c = client(srv.baseUrl);
    await c.get('/konto/passwort-vergessen');
    for (let i = 0; i < 5; i++) {
      const r = await c.post('/konto/passwort-vergessen', { email });
      assert.equal(r.status, 303);
    }
    const sent = srv.outbox.filter((m) => m.toList.includes(email)).length;
    assert.equal(sent, 3);
  });

  it('Reset-Token: einmalig, läuft ab; alle alten Sitzungen werden beendet', async () => {
    const email = uniqueEmail('reset');
    const sessionA = client(srv.baseUrl);
    const user = await verifiedUser(sessionA, { email });
    assert.equal((await sessionA.get('/konto')).status, 200);

    const b = client(srv.baseUrl);
    await b.get('/konto/passwort-vergessen');
    await b.post('/konto/passwort-vergessen', { email });
    const mail = lastMail(srv.outbox, email);
    assert.match(mail.subject, /Passwort/);
    const token = extractToken(mail.text);
    assert.ok(token);

    const form = await b.get(`/konto/passwort-zuruecksetzen?token=${token}`);
    assert.equal(form.status, 200);
    assert.match(form.text, /name="token" value="/);
    assert.equal(form.headers.get('referrer-policy'), 'no-referrer');

    // Tippfehler entwerten den Link nicht
    const typo = await b.post('/konto/passwort-zuruecksetzen', { token, password: PW2, passwordConfirm: 'anders' });
    assert.equal(typo.status, 422);

    const ok = await b.post('/konto/passwort-zuruecksetzen', { token, password: PW2, passwordConfirm: PW2 });
    assert.equal(ok.status, 303);
    assert.equal(ok.location, '/konto');
    assert.equal((await b.get('/konto')).status, 200, 'frisch angemeldet');
    assert.match(lastMail(srv.outbox, email).subject, /geändert/i, 'passwordChanged-Mail');

    // Alte Sitzung A ist ungültig
    assert.equal((await sessionA.get('/konto')).status, 302);
    // Altes Passwort ungültig, neues gültig
    assert.equal((await login(client(srv.baseUrl), email, PW)).status, 422);
    assert.equal((await login(client(srv.baseUrl), email, PW2)).status, 303);

    // Einmalig
    const reuse = await client(srv.baseUrl).get(`/konto/passwort-zuruecksetzen?token=${token}`);
    assert.equal(reuse.status, 400);
    const c2 = client(srv.baseUrl);
    await c2.get('/konto/passwort-vergessen');
    const reusePost = await c2.post('/konto/passwort-zuruecksetzen', { token, password: 'Noch-ein-anderes-Passwort-9', passwordConfirm: 'Noch-ein-anderes-Passwort-9' });
    assert.equal(reusePost.status, 400);

    // Ablauf: Token in der DB zurückdatieren
    srv.db.prepare('UPDATE users SET updated_at = updated_at WHERE id = ?').run(user.id);
    const t2 = auth.createToken(user.id, 'reset_password', 60);
    srv.db.prepare("UPDATE auth_tokens SET expires_at = ? WHERE user_id = ? AND type = 'reset_password' AND used_at IS NULL").run(nowIso(-60000), user.id);
    const expired = await c2.get(`/konto/passwort-zuruecksetzen?token=${t2}`);
    assert.equal(expired.status, 400);
    assert.match(expired.text, /nicht mehr gültig/);
    const expiredPost = await c2.post('/konto/passwort-zuruecksetzen', { token: t2, password: 'Noch-ein-anderes-Passwort-9', passwordConfirm: 'Noch-ein-anderes-Passwort-9' });
    assert.equal(expiredPost.status, 400);
    assert.ok(await auth.verifyPassword(PW2, auth.findUserById(user.id).password_hash), 'Passwort unverändert');
  });

  it('Bestätigungs-Token läuft nach Ablauf ab', async () => {
    const c = client(srv.baseUrl);
    const email = uniqueEmail('verifyexp');
    await register(c, { email });
    const token = extractToken(lastMail(srv.outbox, email).text);
    const user = auth.findUserByEmail(email);
    srv.db.prepare("UPDATE auth_tokens SET expires_at = ? WHERE user_id = ? AND type = 'verify_email'").run(nowIso(-1000), user.id);
    assert.equal((await c.get(`/konto/bestaetigen?token=${token}`)).status, 400);
    assert.equal((await c.post('/konto/bestaetigen', { token })).status, 400);
    assert.equal(auth.findUserById(user.id).email_verified_at, null);
  });
});

/* ======================================================================= */

describe('Kundenkonto', () => {
  it('Passwort ändern erfordert das aktuelle Passwort und beendet andere Sitzungen', async () => {
    const email = uniqueEmail('change');
    const c = client(srv.baseUrl);
    const other = client(srv.baseUrl);
    await verifiedUser(c, { email });
    await login(other, email, PW);
    assert.equal((await other.get('/konto')).status, 200);

    await c.get('/konto/passwort');
    const wrong = await c.post('/konto/passwort', { currentPassword: 'nicht-das-richtige', password: PW2, passwordConfirm: PW2 });
    assert.equal(wrong.status, 422);
    assert.match(wrong.text, /aktuelle Passwort ist nicht korrekt/);

    const missing = await c.post('/konto/passwort', { password: PW2, passwordConfirm: PW2 });
    assert.equal(missing.status, 422);

    const ok = await c.post('/konto/passwort', { currentPassword: PW, password: PW2, passwordConfirm: PW2 });
    assert.equal(ok.status, 303);
    assert.equal((await c.get('/konto')).status, 200, 'dieses Gerät bleibt angemeldet');
    assert.equal((await other.get('/konto')).status, 302, 'anderes Gerät abgemeldet');
    assert.ok(await auth.verifyPassword(PW2, auth.findUserByEmail(email).password_hash));
    assert.match(lastMail(srv.outbox, email).subject, /geändert/i);
  });

  it('Name ändern (validiert, escaped)', async () => {
    const c = client(srv.baseUrl);
    await verifiedUser(c);
    await c.get('/konto');
    const bad = await c.post('/konto/name', { name: 'X' });
    assert.equal(bad.status, 422);
    const html = await c.post('/konto/name', { name: 'Fatma <b>Koç</b>' });
    assert.equal(html.status, 422, 'spitze Klammern im Namen werden abgelehnt');
    assert.doesNotMatch(html.text, /Fatma <b>Koç<\/b>/);
    const ok = await c.post('/konto/name', { name: 'Fatma Koç-Yıldız' });
    assert.equal(ok.status, 303);
    const page = await c.get('/konto');
    assert.match(page.text, /Fatma Koç-Yıldız/);
  });

  it('eigene Bestellanfragen: Liste + Detail; fremde Bestellungen → 404 (kein IDOR)', async () => {
    const alice = client(srv.baseUrl);
    const a = await verifiedUser(alice, { name: 'Alice' });
    const bob = client(srv.baseUrl);
    const b = await verifiedUser(bob, { name: 'Bob' });
    const oa = insertOrder({ userId: a.id, email: a.email, name: 'Alice' });
    const ob = insertOrder({ userId: b.id, email: b.email, name: 'Bob' });
    const guest = insertOrder({ userId: null });

    const list = await alice.get('/konto/bestellungen');
    assert.equal(list.status, 200);
    assert.ok(list.text.includes(oa.publicId));
    assert.ok(!list.text.includes(ob.publicId));
    assert.ok(!list.text.includes(guest.publicId));

    const own = await alice.get(`/konto/bestellungen/${oa.publicId}`);
    assert.equal(own.status, 200);
    assert.match(own.text, /Premium Sarma Lokum/);
    assert.match(own.text, /15,50\s€/);

    assert.equal((await alice.get(`/konto/bestellungen/${ob.publicId}`)).status, 404, 'fremde Bestellung');
    assert.equal((await alice.get(`/konto/bestellungen/${guest.publicId}`)).status, 404, 'Gastbestellung');
    assert.equal((await alice.get("/konto/bestellungen/HN-2026-1' OR '1'='1")).status, 404);
    assert.equal((await alice.get('/konto/bestellungen?seite=-1')).status, 200);
    assert.equal((await alice.get('/konto/bestellungen?seite=99999999999')).status, 200);
    // Anonym → Login
    const anon = await client(srv.baseUrl).get(`/konto/bestellungen/${oa.publicId}`);
    assert.equal(anon.status, 302);
    assert.match(anon.location, /^\/konto\/anmelden\?next=/);
  });

  it('Konto löschen: Passwort + Bestätigung nötig; Nutzer weg, Sitzungen tot, Bestellungen bleiben (user_id NULL)', async () => {
    const email = uniqueEmail('delete');
    const c = client(srv.baseUrl);
    const other = client(srv.baseUrl);
    const user = await verifiedUser(c, { email, name: 'Lösch Mich' });
    await login(other, email, PW);
    const order = insertOrder({ userId: user.id, email, name: 'Lösch Mich' });

    const page = await c.get('/konto/loeschen');
    assert.equal(page.status, 200);
    assert.match(page.text, /endgültig/);

    const wrong = await c.post('/konto/loeschen', { currentPassword: 'falsches-passwort', confirm: 'on' });
    assert.equal(wrong.status, 422);
    assert.match(wrong.text, /Passwort ist nicht korrekt/);
    const noConfirm = await c.post('/konto/loeschen', { currentPassword: PW });
    assert.equal(noConfirm.status, 422);
    assert.ok(auth.findUserById(user.id), 'noch vorhanden');

    const ok = await c.post('/konto/loeschen', { currentPassword: PW, confirm: 'on' });
    assert.equal(ok.status, 303);
    assert.equal(ok.location, '/');
    assert.equal(auth.findUserById(user.id), null, 'Nutzer gelöscht');
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(user.id).n, 0);
    assert.equal((await c.get('/konto')).status, 302);
    assert.equal((await other.get('/konto')).status, 302, 'Sitzung auf anderem Gerät beendet');
    const kept = srv.db.prepare('SELECT user_id, email, total_cents FROM orders WHERE id = ?').get(order.id);
    assert.ok(kept, 'Bestellung bleibt');
    assert.equal(kept.user_id, null);
    assert.equal(kept.email, email);
    assert.equal(kept.total_cents, 1550);
    assert.match(lastMail(srv.outbox, email).subject, /gelöscht/i, 'accountDeleted-Mail');
    assert.equal((await login(client(srv.baseUrl), email, PW)).status, 422);
  });

  it('Administratorkonten lassen sich nicht über die Website löschen', async () => {
    const c = client(srv.baseUrl);
    const admin = await verifiedUser(c, { role: 'admin' });
    await c.get('/konto/loeschen');
    const r = await c.post('/konto/loeschen', { currentPassword: PW, confirm: 'on' });
    assert.equal(r.status, 403);
    assert.ok(auth.findUserById(admin.id));
  });
});

/* ======================================================================= */

describe('Verwaltung (/admin)', () => {
  it('anonym → Login, Kunde → 403 (auch POST), Admin → 200', async () => {
    const anon = await client(srv.baseUrl).get('/admin/bestellungen');
    assert.equal(anon.status, 302);
    assert.match(anon.location, /^\/konto\/anmelden\?next=%2Fadmin%2Fbestellungen/);

    const cust = client(srv.baseUrl);
    await verifiedUser(cust);
    for (const p of ['/admin', '/admin/bestellungen', '/admin/anfragen', '/admin/feedback', '/admin/rabattcodes']) {
      const r = await cust.get(p);
      assert.equal(r.status, 403, p);
      assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
    }
    const order = insertOrder();
    await cust.get('/konto');
    const post = await cust.post(`/admin/bestellungen/${order.id}/status`, { status: 'storniert' });
    assert.equal(post.status, 403);
    assert.equal(srv.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id).status, 'neu');

    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    for (const p of ['/admin', '/admin/bestellungen', '/admin/anfragen', '/admin/feedback', '/admin/rabattcodes', `/admin/bestellungen/${order.id}`]) {
      const r = await adm.get(p);
      assert.equal(r.status, 200, p);
      assert.match(r.headers.get('cache-control') || '', /no-store/);
    }
  });

  it('Admin ändert den Status einer Bestellanfrage (Whitelist), Filter und Suche funktionieren', async () => {
    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    const order = insertOrder({ name: 'Statuskunde', email: 'status@example.com' });

    const detail = await adm.get(`/admin/bestellungen/${order.id}`);
    assert.match(detail.text, /Statuskunde/);
    const ok = await adm.post(`/admin/bestellungen/${order.id}/status`, { status: 'bestaetigt' });
    assert.equal(ok.status, 303);
    assert.equal(ok.location, `/admin/bestellungen/${order.id}`);
    assert.equal(srv.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id).status, 'bestaetigt');

    const bad = await adm.post(`/admin/bestellungen/${order.id}/status`, { status: "neu'; DROP TABLE orders;--" });
    assert.equal(bad.status, 303);
    assert.equal(srv.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id).status, 'bestaetigt');

    const filtered = await adm.get('/admin/bestellungen?status=bestaetigt');
    assert.ok(filtered.text.includes(order.publicId));
    const filteredNew = await adm.get('/admin/bestellungen?status=neu&q=status%40example.com');
    assert.ok(!filteredNew.text.includes(order.publicId));
    const search = await adm.get(`/admin/bestellungen?q=${encodeURIComponent('%_\\')}`);
    assert.equal(search.status, 200);
    assert.equal((await adm.get('/admin/bestellungen?seite=abc&status=<script>')).status, 200);
    assert.equal((await adm.get('/admin/bestellungen/0')).status, 404);
    assert.equal((await adm.get('/admin/bestellungen/1e3')).status, 404);
    assert.equal((await adm.get('/admin/bestellungen/999999')).status, 404);
  });

  it('Händleranfragen und Feedback: Liste (escaped) und Statuswechsel', async () => {
    const db = srv.db;
    const inq = db
      .prepare("INSERT INTO inquiries (company, contact_name, email, zip_city, business_type, assortments_json, message) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run('<img src=x onerror=alert(1)> Markt GmbH', 'Frau Händler', 'einkauf@markt.example', '80331 München', 'Supermarkt', '["Sarma Lokum","Feinkost"]', 'Bitte Angebot');
    const fb = db
      .prepare("INSERT INTO feedback (app, kind, page_url, message, email) VALUES ('corporate', 'bug', ?, ?, ?)")
      .run('javascript:alert(1)', 'Button reagiert nicht <script>alert(1)</script>', 'melder@example.com');

    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    const list = await adm.get('/admin/anfragen');
    assert.match(list.text, /&lt;img src=x onerror=alert\(1\)&gt; Markt GmbH/);
    assert.doesNotMatch(list.text, /<img src=x/);
    assert.match(list.text, /Sarma Lokum/);
    const r1 = await adm.post(`/admin/anfragen/${inq.lastInsertRowid}/status`, { status: 'beantwortet', back: '//evil.example/x' });
    assert.equal(r1.status, 303);
    assert.equal(r1.location, '/admin/anfragen', 'Rücksprung nur in den Bereich');
    assert.equal(db.prepare('SELECT status FROM inquiries WHERE id = ?').get(inq.lastInsertRowid).status, 'beantwortet');
    await adm.post(`/admin/anfragen/${inq.lastInsertRowid}/status`, { status: 'hacked' });
    assert.equal(db.prepare('SELECT status FROM inquiries WHERE id = ?').get(inq.lastInsertRowid).status, 'beantwortet');

    const fbList = await adm.get('/admin/feedback?art=bug&app=corporate');
    assert.match(fbList.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(fbList.text, /href="javascript:/, 'Seiten-URL wird nicht verlinkt');
    const r2 = await adm.post(`/admin/feedback/${fb.lastInsertRowid}/status`, { status: 'erledigt', back: '/admin/feedback?art=bug' });
    assert.equal(r2.status, 303);
    assert.equal(r2.location, '/admin/feedback?art=bug');
    assert.equal(db.prepare('SELECT status FROM feedback WHERE id = ?').get(fb.lastInsertRowid).status, 'erledigt');
  });

  it('Rabattcodes: anlegen (validiert), doppelte ablehnen, aktivieren/deaktivieren', async () => {
    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    await adm.get('/admin/rabattcodes');

    const bad = await adm.post('/admin/rabattcodes', { code: 'ab c<script>', type: 'percent', value: '10', active: 'on' });
    assert.equal(bad.status, 422);
    assert.match(bad.text, /gültigen Rabattcode/);
    assert.doesNotMatch(bad.text, /value="ab c<script>"/);
    const badValue = await adm.post('/admin/rabattcodes', { code: 'ZUVIEL', type: 'percent', value: '150' });
    assert.equal(badValue.status, 422);
    assert.match(badValue.text, /1 bis 100/);
    const badType = await adm.post('/admin/rabattcodes', { code: 'TYP1', type: 'gratis', value: '5' });
    assert.equal(badType.status, 422);
    assert.equal(srv.db.prepare("SELECT COUNT(*) AS n FROM discount_codes WHERE code IN ('ZUVIEL','TYP1')").get().n, 0);

    const badDates = await adm.post('/admin/rabattcodes', { code: 'DATUM1', type: 'fixed', value: '5,00', startsOn: '2026-12-10', endsOn: '2026-12-01' });
    assert.equal(badDates.status, 422);
    assert.match(badDates.text, /Enddatum/);

    const ok = await adm.post('/admin/rabattcodes', {
      code: 'herbst-10', type: 'fixed', value: '5,50', minSubtotal: '30', startsOn: '2026-10-01', endsOn: '2026-10-31', maxUses: '50', oncePerEmail: 'on', active: 'on', description: 'Herbstaktion',
    });
    assert.equal(ok.status, 303);
    const row = srv.db.prepare("SELECT * FROM discount_codes WHERE code = 'HERBST-10'").get();
    assert.ok(row);
    assert.equal(row.type, 'fixed');
    assert.equal(row.value, 550);
    assert.equal(row.min_subtotal_cents, 3000);
    assert.equal(row.max_uses, 50);
    assert.equal(row.once_per_email, 1);
    assert.equal(row.active, 1);
    assert.equal(row.starts_at, '2026-09-30T22:00:00.000Z', 'Beginn 0:00 Uhr Berliner Zeit');
    assert.equal(row.ends_at, '2026-10-31T23:00:00.000Z', 'Ende nach dem 31.10. (Winterzeit)');

    const dup = await adm.post('/admin/rabattcodes', { code: 'HERBST-10', type: 'percent', value: '10' });
    assert.equal(dup.status, 422);
    assert.match(dup.text, /gibt es bereits/);

    const page = await adm.get('/admin/rabattcodes');
    assert.match(page.text, /HERBST-10/);
    assert.match(page.text, /5,50\s€/);

    const off = await adm.post(`/admin/rabattcodes/${row.id}/status`, { active: '0' });
    assert.equal(off.status, 303);
    assert.equal(srv.db.prepare('SELECT active FROM discount_codes WHERE id = ?').get(row.id).active, 0);
    const on = await adm.post(`/admin/rabattcodes/${row.id}/status`, { active: '1' });
    assert.equal(on.status, 303);
    assert.equal(srv.db.prepare('SELECT active FROM discount_codes WHERE id = ?').get(row.id).active, 1);
  });
});

/* ======================================================================= */

describe('Sicherheit', () => {
  it('offene Weiterleitung über next wird blockiert, interne Ziele funktionieren', async () => {
    const email = uniqueEmail('redirect');
    await auth.createUser({ email, password: PW, name: 'Redirect', emailVerified: true });
    for (const evil of ['//evil.com', 'https://evil.com/', '/\\evil.com', '%2F%2Fevil.com', 'javascript:alert(1)']) {
      const c = client(srv.baseUrl);
      const page = await c.get(`/konto/anmelden?next=${encodeURIComponent(evil)}`);
      assert.doesNotMatch(page.text, /evil\.com|javascript:/, `kein next-Feld für ${evil}`);
      const r = await c.post('/konto/anmelden', { email, password: PW, next: evil });
      assert.equal(r.status, 303);
      assert.equal(r.location, '/konto', `Weiterleitung für ${evil}`);
    }
    const c = client(srv.baseUrl);
    const page = await c.get('/konto/anmelden?next=%2Fkonto%2Fbestellungen');
    assert.match(page.text, /name="next" value="\/konto\/bestellungen"/);
    const r = await c.post('/konto/anmelden', { email, password: PW, next: '/konto/bestellungen' });
    assert.equal(r.location, '/konto/bestellungen');
    // Bereits angemeldet + böses next
    const again = await c.get('/konto/anmelden?next=//evil.com');
    assert.equal(again.status, 303);
    assert.equal(again.location, '/konto');
  });

  it('CSRF: POST ohne oder mit falschem Token → 403', async () => {
    const email = uniqueEmail('csrf');
    await auth.createUser({ email, password: PW, name: 'Csrf', emailVerified: true });
    const c = client(srv.baseUrl);
    await c.get('/konto/anmelden');
    const missing = await c.post('/konto/anmelden', { email, password: PW, _csrf: '' });
    assert.equal(missing.status, 403);
    const wrong = await c.post('/konto/anmelden', { email, password: PW, _csrf: 'x'.repeat(43) });
    assert.equal(wrong.status, 403);
    assert.equal((await c.get('/konto')).status, 302);

    await verifiedUser(c, { email: uniqueEmail('csrf2') });
    const del = await c.post('/konto/loeschen', { currentPassword: PW, confirm: 'on', _csrf: '' });
    assert.equal(del.status, 403);
    const logout = await c.post('/konto/abmelden', { _csrf: 'falsch' });
    assert.equal(logout.status, 403);
    assert.equal((await c.get('/konto')).status, 200, 'noch angemeldet');
  });

  it('Sitzungscookie: HttpOnly, SameSite=Lax, Path=/, neuer Wert bei Anmeldung, nur Hash in der DB', async () => {
    const email = uniqueEmail('cookie');
    await auth.createUser({ email, password: PW, name: 'Cookie', emailVerified: true });
    const c = client(srv.baseUrl);
    const page = await c.get('/konto/anmelden');
    const first = sessionCookie(page);
    assert.ok(first, 'Formular mit CSRF erzeugt Sitzung');
    assert.equal(first.attributes.httponly, true);
    assert.equal(String(first.attributes.samesite).toLowerCase(), 'lax');
    assert.equal(first.attributes.path, '/');
    const res = await c.post('/konto/anmelden', { email, password: PW });
    const second = sessionCookie(res);
    assert.ok(second, 'neues Cookie bei Anmeldung');
    assert.notEqual(second.value, first.value);
    assert.equal(second.attributes.httponly, true);
    assert.equal(String(second.attributes.samesite).toLowerCase(), 'lax');
    const raw = second.value;
    assert.equal(srv.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?').get(raw).n, 0, 'Rohtoken nicht gespeichert');
    // Alte (anonyme) Sitzung ist nach der Anmeldung ungültig
    const fix = client(srv.baseUrl);
    fix.setCookie(first.name, first.value);
    assert.equal((await fix.get('/konto')).status, 302);
  });

  it('SQL-Injection-Strings im E-Mail-Feld sind harmlos', async () => {
    const c = client(srv.baseUrl);
    const payloads = ["' OR '1'='1", "admin@example.com' --", "x'; DROP TABLE users; --@example.com", '" OR ""="'];
    for (const p of payloads) {
      const r = await login(c, p, "' OR '1'='1");
      assert.ok([422].includes(r.status), `Login ${p}`);
      const f = await c.post('/konto/passwort-vergessen', { email: p });
      assert.ok([303, 422].includes(f.status), `Vergessen ${p}`);
      const reg = await register(c, { email: p });
      assert.equal(reg.status, 422, `Registrierung ${p}`);
    }
    assert.equal((await c.get('/konto')).status, 302);
    assert.ok(srv.db.prepare('SELECT COUNT(*) AS n FROM users').get().n >= 1, 'Tabelle users existiert noch');
  });

  it('XSS: Namen mit HTML werden abgelehnt; trotzdem gespeicherte Werte werden escaped (Konto, Verwaltung)', async () => {
    const c = client(srv.baseUrl);
    const email = uniqueEmail('xss');
    const reg = await register(c, { email, name: '<script>alert(1)</script>' });
    assert.equal(reg.status, 422);
    assert.doesNotMatch(reg.text, /<script>alert\(1\)<\/script>/);
    assert.equal(auth.findUserByEmail(email), null);

    // Altdaten / Daten aus anderen Quellen: Ausgabe wird trotzdem escaped
    const ok = await register(c, { email, name: 'Ayla Kaya' });
    assert.equal(ok.status, 303);
    assert.equal((await verifyFromMail(c, email)).status, 303);
    const user = auth.findUserByEmail(email);
    srv.db.prepare('UPDATE users SET name = ? WHERE id = ?').run('<script>alert(1)</script>', user.id);
    const order = insertOrder({ userId: user.id, email, name: '<svg onload=alert(1)>' });
    const page = await c.get('/konto');
    assert.match(page.text, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(page.text, /<script>alert\(1\)<\/script>/);
    const detail = await c.get(`/konto/bestellungen/${order.publicId}`);
    assert.match(detail.text, /&lt;svg onload=alert\(1\)&gt;/);

    const adm = client(srv.baseUrl);
    await verifiedUser(adm, { role: 'admin' });
    for (const p of ['/admin', '/admin/bestellungen', `/admin/bestellungen/${order.id}`]) {
      const r = await adm.get(p);
      assert.doesNotMatch(r.text, /<svg onload=alert\(1\)>/, p);
    }
  });

  it('Token-Parameter mit Sonderzeichen oder Überlänge werden abgewiesen', async () => {
    const c = client(srv.baseUrl);
    for (const t of ["' OR 1=1 --", 'a'.repeat(500), '<script>', '']) {
      const r = await c.get(`/konto/bestaetigen?token=${encodeURIComponent(t)}`);
      assert.equal(r.status, 400, `verify ${t.slice(0, 10)}`);
      assert.doesNotMatch(r.text, /<script>(?!document)/);
      const r2 = await c.get(`/konto/passwort-zuruecksetzen?token=${encodeURIComponent(t)}`);
      assert.equal(r2.status, 400);
    }
  });

  it('Login-Ratenlimit greift (eigene App-Instanz mit niedrigem Limit)', async () => {
    // eigene Instanz, damit das Limit die anderen Tests nicht beeinflusst
    await srv.close();
    const limited = await startApp('shop', { env: { RATE_LIMIT_LOGIN_MAX: '3' } });
    try {
      const c = client(limited.baseUrl);
      await c.get('/konto/anmelden');
      const statuses = [];
      for (let i = 0; i < 5; i++) {
        const r = await c.post('/konto/anmelden', { email: 'niemand@example.com', password: 'irgendwas-falsch' });
        statuses.push(r.status);
      }
      assert.deepEqual(statuses.slice(0, 3), [422, 422, 422]);
      assert.equal(statuses[4], 429);
      assert.match(c.last.text, /Zu viele|zu viele/);
    } finally {
      await limited.close();
      srv = await startApp('shop', { env: APP_ENV });
    }
  });

  it('private Seiten sind noindex und tauchen nicht in der Sitemap auf', async () => {
    const c = client(srv.baseUrl);
    const page = await c.get('/konto/anmelden');
    assert.match(page.text, /<meta name="robots" content="noindex/);
    assert.match(page.headers.get('x-robots-tag') || '', /noindex/);
    const sm = await c.get('/sitemap.xml');
    if (sm.status === 200) {
      assert.doesNotMatch(sm.text, /\/konto|\/admin/);
    }
    assert.ok(pathOf(`${srv.baseUrl}/konto`) === '/konto');
  });
});
