'use strict';
/**
 * Konten, Passwörter, Einmal-Tokens, Login-Drosselung, Sicherheitsprotokoll (FOUNDATION-CORE).
 *
 * Passwörter: scrypt (N=2^16, r=8, p=1, 16 Byte Salt, 64 Byte Schlüssel),
 *   gespeichert als "scrypt$N$r$p$<salt base64>$<hash base64>", Vergleich mit timingSafeEqual.
 * Tokens: 32 Zufallsbytes (base64url) gehen per Mail an den Nutzer; in der DB liegt nur SHA-256.
 *   Tokens sind einmalig und laufen ab.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { getDb, transaction, nowIso } = require('./db');
const { clientIpHash } = require('./security');
const { destroyUserSessions } = require('./session');

const scryptAsync = promisify(crypto.scrypt);

const SCRYPT = { N: 2 ** 16, r: 8, p: 1, saltBytes: 16, keyLen: 64 };
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;
const TOKEN_TYPES = new Set(['verify_email', 'reset_password', 'newsletter']);

function scryptMaxmem(N, r) {
  return 128 * N * r * 2;
}

/* ------------------------------------------------------------------ Passwörter */

/** Erzeugt einen scrypt-Hash. → Promise<string> */
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0 || password.length > 1024) {
    throw new TypeError('Ungültiges Passwort');
  }
  const salt = crypto.randomBytes(SCRYPT.saltBytes);
  const key = await scryptAsync(password.normalize('NFKC'), salt, SCRYPT.keyLen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: scryptMaxmem(SCRYPT.N, SCRYPT.r),
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

function parseHash(encoded) {
  if (typeof encoded !== 'string') return null;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [, nS, rS, pS, saltB64, hashB64] = parts;
  if (![nS, rS, pS].every((v) => /^\d{1,8}$/.test(v))) return null;
  const N = Number(nS);
  const r = Number(rS);
  const p = Number(pS);
  // Schutz vor manipulierten Parametern (DoS): nur sinnvolle Bereiche zulassen
  if (N < 2 ** 14 || N > 2 ** 20 || (N & (N - 1)) !== 0) return null;
  if (r < 1 || r > 32 || p < 1 || p > 16) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(saltB64) || !/^[A-Za-z0-9+/]+={0,2}$/.test(hashB64)) return null;
  const salt = Buffer.from(saltB64, 'base64');
  const hash = Buffer.from(hashB64, 'base64');
  if (salt.length < 16 || hash.length < 32 || hash.length > 128) return null;
  return { N, r, p, salt, hash };
}

/** Prüft ein Passwort gegen einen gespeicherten Hash. → Promise<boolean> (nie throw) */
async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length === 0 || password.length > 1024) return false;
  const parsed = parseHash(encoded);
  if (!parsed) return false;
  try {
    const key = await scryptAsync(password.normalize('NFKC'), parsed.salt, parsed.hash.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: scryptMaxmem(parsed.N, parsed.r),
    });
    return crypto.timingSafeEqual(key, parsed.hash);
  } catch {
    return false;
  }
}

/** true, wenn der Hash mit schwächeren als den aktuellen Parametern erstellt wurde. */
function needsRehash(encoded) {
  const parsed = parseHash(encoded);
  return !parsed || parsed.N < SCRYPT.N || parsed.r < SCRYPT.r || parsed.hash.length < SCRYPT.keyLen;
}

let dummyHashPromise = null;
/** Für Konstantzeit bei unbekannter E-Mail (Schutz vor Konten-Ausspähung). */
function dummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomBytes(24).toString('hex'));
  return dummyHashPromise;
}

/* ---------------------------------------------------------------------- Tokens */

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Erzeugt ein Einmal-Token und gibt das ROH-Token zurück (nur dieses gehört in den Link).
 *   createToken(userId, 'verify_email' | 'reset_password' | 'newsletter', ttlMinutes, { email, invalidatePrevious = true })
 * Für 'newsletter' ist userId null und opts.email Pflicht.
 * Ältere, unbenutzte Tokens desselben Typs (gleicher Nutzer bzw. gleiche E-Mail) werden entwertet.
 */
function createToken(userId, type, ttlMinutes, opts = {}) {
  if (!TOKEN_TYPES.has(type)) throw new TypeError(`Unbekannter Token-Typ: ${type}`);
  const ttl = Number(ttlMinutes);
  if (!Number.isFinite(ttl) || ttl <= 0) throw new TypeError('ttlMinutes muss positiv sein');
  const email = opts.email ? String(opts.email).trim().toLowerCase() : null;
  if (userId == null && !email) throw new TypeError('createToken: userId oder email erforderlich');
  const raw = crypto.randomBytes(32).toString('base64url');
  const invalidatePrevious = opts.invalidatePrevious !== false;
  transaction((db) => {
    const now = nowIso();
    if (invalidatePrevious) {
      if (userId != null) {
        db.prepare('UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND type = ? AND used_at IS NULL').run(now, userId, type);
      } else {
        db.prepare('UPDATE auth_tokens SET used_at = ? WHERE user_id IS NULL AND email = ? AND type = ? AND used_at IS NULL').run(
          now,
          email,
          type
        );
      }
    }
    db.prepare(
      'INSERT INTO auth_tokens (user_id, type, token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId ?? null, type, sha256Hex(raw), email, nowIso(ttl * 60 * 1000), now);
  });
  return raw;
}

function findTokenRow(raw, type) {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(raw) || !TOKEN_TYPES.has(type)) return null;
  return getDb()
    .prepare('SELECT id, user_id, email, expires_at, used_at FROM auth_tokens WHERE token_hash = ? AND type = ?')
    .get(sha256Hex(raw), type);
}

/** Prüft ein Token OHNE es zu verbrauchen (für GET-Seiten mit Bestätigungs-Button). → { userId, email } | null */
function peekToken(raw, type) {
  const row = findTokenRow(raw, type);
  if (!row || row.used_at || row.expires_at <= nowIso()) return null;
  return { userId: row.user_id, email: row.email };
}

/** Verbraucht ein Token (einmalig, mit Ablaufprüfung). → { userId, email } | null */
function consumeTokenRecord(raw, type) {
  const row = findTokenRow(raw, type);
  if (!row) return null;
  const now = nowIso();
  if (row.used_at || row.expires_at <= now) return null;
  const changed = getDb().prepare('UPDATE auth_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL').run(now, row.id).changes;
  if (changed !== 1) return null;
  return { userId: row.user_id, email: row.email };
}

/** Verbraucht ein Nutzer-Token. → userId | null  (für 'newsletter' consumeTokenRecord verwenden) */
function consumeToken(raw, type) {
  const rec = consumeTokenRecord(raw, type);
  return rec && rec.userId != null ? rec.userId : null;
}

/** Anzahl der in den letzten withinMinutes erzeugten Tokens (für Mail-Drosselung). */
function recentTokenCount({ userId = null, email = null, type, withinMinutes = 60 }) {
  const since = nowIso(-withinMinutes * 60 * 1000);
  const db = getDb();
  if (userId != null) {
    return db.prepare('SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id = ? AND type = ? AND created_at > ?').get(userId, type, since).n;
  }
  return db
    .prepare('SELECT COUNT(*) AS n FROM auth_tokens WHERE email = ? AND type = ? AND created_at > ?')
    .get(String(email).trim().toLowerCase(), type, since).n;
}

/* ----------------------------------------------------------------------- Nutzer */

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Vollständige Zeile inkl. password_hash – nur serverseitig verwenden. → row | null */
function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(e) || null;
}

/** → row | null */
function findUserById(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(n) || null;
}

/** Sichere Darstellung für req.user / Templates (ohne Hash und Zähler). */
function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isAdmin: row.role === 'admin',
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at || null,
    createdAt: row.created_at,
  };
}

/**
 * Legt ein Konto an. → Promise<row>
 * Wirft Error mit err.code === 'EMAIL_TAKEN', wenn die Adresse bereits registriert ist.
 */
async function createUser({ email, password, name = '', role = 'customer', emailVerified = false }) {
  const e = normalizeEmail(email);
  if (!e) throw new TypeError('E-Mail fehlt');
  if (!['customer', 'admin'].includes(role)) throw new TypeError('Ungültige Rolle');
  const hash = await hashPassword(password);
  const now = nowIso();
  try {
    const info = getDb()
      .prepare(
        'INSERT INTO users (email, password_hash, name, role, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(e, hash, String(name || '').trim(), role, emailVerified ? now : null, now, now);
    return findUserById(info.lastInsertRowid);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const taken = new Error('E-Mail-Adresse bereits registriert');
      taken.code = 'EMAIL_TAKEN';
      throw taken;
    }
    throw err;
  }
}

function markEmailVerified(userId) {
  const now = nowIso();
  return (
    getDb()
      .prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?')
      .run(now, now, userId).changes === 1
  );
}

/**
 * Setzt ein neues Passwort, hebt eine Sperre auf, entwertet offene Reset-Tokens und
 * meldet ALLE Sitzungen des Nutzers ab (auch die aktuelle – danach ggf.
 * req.regenerateSession({ keepData: true, userId }) aufrufen). → Promise<void>
 */
async function updatePassword(userId, newPassword) {
  const hash = await hashPassword(newPassword);
  transaction((db) => {
    const now = nowIso();
    db.prepare('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?').run(
      hash,
      now,
      userId
    );
    db.prepare("UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND type = 'reset_password' AND used_at IS NULL").run(now, userId);
  });
  destroyUserSessions(userId);
}

/**
 * Löscht ein Konto endgültig. Bestellungen bleiben (gesetzliche Aufbewahrung),
 * ihre user_id wird NULL. Sitzungen und Tokens werden mitgelöscht,
 * Sicherheitsereignisse anonymisiert. → boolean
 */
function deleteUser(userId) {
  return transaction((db) => {
    db.prepare('UPDATE orders SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('UPDATE security_events SET user_id = NULL WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(userId);
    return db.prepare('DELETE FROM users WHERE id = ?').run(userId).changes === 1;
  });
}

/* ------------------------------------------------------------ Login-Drosselung */

function userIdOf(userOrId) {
  return typeof userOrId === 'object' && userOrId !== null ? userOrId.id : userOrId;
}

/** Zählt einen Fehlversuch; ab 5 Fehlversuchen 15 Minuten Sperre. → { locked, lockedUntil } */
function recordLoginFailure(userOrId) {
  const id = userIdOf(userOrId);
  return transaction((db) => {
    const row = db.prepare('SELECT failed_logins FROM users WHERE id = ?').get(id);
    if (!row) return { locked: false, lockedUntil: null };
    const count = row.failed_logins + 1;
    if (count >= LOCK_THRESHOLD) {
      const until = nowIso(LOCK_MINUTES * 60 * 1000);
      db.prepare('UPDATE users SET failed_logins = 0, locked_until = ?, updated_at = ? WHERE id = ?').run(until, nowIso(), id);
      return { locked: true, lockedUntil: until };
    }
    db.prepare('UPDATE users SET failed_logins = ?, updated_at = ? WHERE id = ?').run(count, nowIso(), id);
    return { locked: false, lockedUntil: null };
  });
}

/** true, solange das Konto gesperrt ist. Akzeptiert Nutzerzeile oder ID. */
function isLocked(userOrId) {
  const row = typeof userOrId === 'object' && userOrId !== null && 'locked_until' in userOrId ? userOrId : findUserById(userOrId);
  return Boolean(row && row.locked_until && row.locked_until > nowIso());
}

function resetLoginFailures(userOrId) {
  getDb().prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(userIdOf(userOrId));
}

/**
 * Komplette Anmeldeprüfung inkl. Sperre und Konstantzeit bei unbekannter Adresse.
 * → Promise<{ ok: true, user: row } | { ok: false, reason: 'invalid' | 'locked' }>
 * Empfehlung: für 'invalid' und 'locked' dieselbe neutrale Meldung anzeigen bzw. bei
 * 'locked' nur allgemein auf "zu viele Versuche" hinweisen. Ereignisse werden protokolliert,
 * wenn req übergeben wird.
 */
async function authenticate(email, password, req = null) {
  const user = findUserByEmail(email);
  if (!user) {
    await verifyPassword(String(password || 'x'), await dummyHash());
    if (req) logSecurityEvent('login_failure', null, req);
    return { ok: false, reason: 'invalid' };
  }
  if (isLocked(user)) {
    await verifyPassword(String(password || 'x'), await dummyHash());
    if (req) logSecurityEvent('login_locked', user.id, req);
    return { ok: false, reason: 'locked' };
  }
  const valid = await verifyPassword(String(password || ''), user.password_hash);
  if (!valid) {
    const { locked } = recordLoginFailure(user.id);
    if (req) logSecurityEvent(locked ? 'account_locked' : 'login_failure', user.id, req);
    return { ok: false, reason: locked ? 'locked' : 'invalid' };
  }
  resetLoginFailures(user.id);
  if (req) logSecurityEvent('login_success', user.id, req);
  return { ok: true, user: findUserById(user.id) };
}

/* ----------------------------------------------------------- Sicherheitsprotokoll */

/**
 * Protokolliert ein Sicherheitsereignis (ohne rohe IP: nur gesalzener Hash).
 * Typen z. B.: register, login_success, login_failure, account_locked, logout,
 * email_verified, password_reset_requested, password_reset, password_changed,
 * account_deleted, csrf_failure, honeypot, rate_limited:<name>, admin_forbidden
 */
function logSecurityEvent(type, userId, req) {
  const ua = req && typeof req.get === 'function' ? String(req.get('user-agent') || '').slice(0, 255) : null;
  getDb()
    .prepare('INSERT INTO security_events (user_id, type, ip_hash, user_agent, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId ?? null, String(type).slice(0, 64), req ? clientIpHash(req) : null, ua, nowIso());
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash,
  createToken,
  consumeToken,
  consumeTokenRecord,
  peekToken,
  recentTokenCount,
  normalizeEmail,
  createUser,
  findUserByEmail,
  findUserById,
  publicUser,
  markEmailVerified,
  updatePassword,
  deleteUser,
  recordLoginFailure,
  isLocked,
  resetLoginFailures,
  authenticate,
  logSecurityEvent,
  sha256Hex,
  LOCK_THRESHOLD,
  LOCK_MINUTES,
  SCRYPT,
};
