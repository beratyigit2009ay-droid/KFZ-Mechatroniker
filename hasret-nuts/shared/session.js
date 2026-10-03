'use strict';
/**
 * Datenbankgestützte Sitzungen (FOUNDATION-CORE).
 *
 * - Cookie enthält ein zufälliges 32-Byte-Token (base64url); in der DB liegt nur dessen SHA-256.
 * - Cookie-Name: "__Host-hn_sid_<app>" in Produktion, sonst "hn_sid_<app>".
 * - Flags: HttpOnly, SameSite=Lax, Path=/, Secure in Produktion; 14 Tage rollierend.
 * - Admin-Sitzungen laufen nach ADMIN_IDLE_MINUTES (Standard 30) Inaktivität ab.
 * - Sitzungen entstehen erst, wenn sie gebraucht werden (Daten gesetzt, CSRF-Token
 *   angefordert oder Anmeldung) – Bots und reine Seitenaufrufe erzeugen keine Zeilen.
 *
 * API pro Anfrage:
 *   req.session            { id, userId, data, csrfToken }  (id/csrfToken null, solange keine Sitzung existiert)
 *   req.session.data       einfaches Objekt; wird beim Senden der Antwort-Header gespeichert
 *                          (Änderungen also VOR res.render/res.redirect/res.json vornehmen)
 *   req.csrfToken()        liefert das CSRF-Token (legt die Sitzung bei Bedarf an)
 *   await req.regenerateSession({ keepData, userId })
 *                          neues Token + neues CSRF-Token, alte Sitzung wird sofort ungültig
 *                          (Schutz vor Session-Fixation). userId ist standardmäßig null –
 *                          zum (weiter) Angemeldet-Bleiben ausdrücklich übergeben.
 *   await req.destroySession()
 */
const crypto = require('node:crypto');
const config = require('./config');
const { getDb, nowIso } = require('./db');

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const MAX_DATA_BYTES = 64 * 1024;
const TOUCH_INTERVAL_MS = 60 * 1000;

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function cookieName(appName) {
  return `${config.isProd ? '__Host-' : ''}hn_sid_${appName}`;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: config.security.sessionTtlDays * 24 * 3600 * 1000,
  };
}

function safeParse(json) {
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function createSessionMiddleware(appName) {
  if (!['corporate', 'shop'].includes(appName)) throw new Error(`Unbekannte App: ${appName}`);

  return function sessionMiddleware(req, res, next) {
    const db = getDb();
    const name = cookieName(appName);
    const raw = req.cookies ? req.cookies[name] : undefined;

    const session = { id: null, userId: null, data: {}, csrfToken: null };
    const state = {
      persisted: false,
      token: null,
      needed: false,
      origData: '{}',
      origUserId: null,
      lastSeen: null,
      cookieDirty: false,
      clearCookie: false,
      finalized: false,
    };

    if (typeof raw === 'string' && TOKEN_RE.test(raw)) {
      const id = sha256Hex(raw);
      const row = db
        .prepare(
          `SELECT s.id, s.user_id, s.data, s.csrf_token, s.expires_at, s.last_seen_at, u.role
             FROM sessions s LEFT JOIN users u ON u.id = s.user_id
            WHERE s.id = ? AND s.app = ?`
        )
        .get(id, appName);
      const now = nowIso();
      if (row && row.expires_at > now) {
        const idleMin = config.security.adminIdleMinutes;
        const idleExpired =
          row.role === 'admin' && idleMin > 0 && Date.parse(row.last_seen_at) < Date.now() - idleMin * 60 * 1000;
        if (idleExpired) {
          db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
          state.clearCookie = true;
          req.sessionIdleExpired = true;
        } else {
          session.id = row.id;
          session.userId = row.user_id;
          session.data = safeParse(row.data);
          session.csrfToken = row.csrf_token;
          state.persisted = true;
          state.token = raw;
          state.origData = JSON.stringify(session.data);
          state.origUserId = row.user_id;
          state.lastSeen = row.last_seen_at;
        }
      } else {
        if (row) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
        state.clearCookie = true;
      }
    } else if (raw !== undefined) {
      state.clearCookie = true;
    }

    function insertNew(dataStr) {
      const token = randomToken();
      const id = sha256Hex(token);
      if (!session.csrfToken) session.csrfToken = randomToken();
      const ttlMs = config.security.sessionTtlDays * 24 * 3600 * 1000;
      db.prepare(
        `INSERT INTO sessions (id, user_id, app, data, csrf_token, created_at, expires_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, session.userId, appName, dataStr, session.csrfToken, nowIso(), nowIso(ttlMs), nowIso());
      session.id = id;
      state.persisted = true;
      state.token = token;
      state.origData = dataStr;
      state.origUserId = session.userId;
      state.lastSeen = nowIso();
      state.cookieDirty = true;
    }

    function serialize() {
      let dataStr = JSON.stringify(session.data && typeof session.data === 'object' ? session.data : {});
      if (Buffer.byteLength(dataStr) > MAX_DATA_BYTES) {
        console.error(`[session] Sitzungsdaten zu groß (${Buffer.byteLength(dataStr)} Bytes) – Änderung verworfen.`);
        dataStr = state.origData;
      }
      return dataStr;
    }

    function persist() {
      if (state.finalized) return;
      state.finalized = true;
      const dataStr = serialize();
      if (state.persisted && session.userId !== state.origUserId) {
        // Sicherheitsnetz: Anmeldestatus wurde ohne regenerateSession() geändert →
        // Token und CSRF-Token trotzdem erneuern (Schutz vor Session-Fixation).
        db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
        session.csrfToken = randomToken();
        insertNew(dataStr);
      } else if (state.persisted) {
        const changed = dataStr !== state.origData;
        const stale = !state.lastSeen || Date.now() - Date.parse(state.lastSeen) > TOUCH_INTERVAL_MS;
        if (changed || stale) {
          const ttlMs = config.security.sessionTtlDays * 24 * 3600 * 1000;
          const info = db
            .prepare('UPDATE sessions SET data = ?, last_seen_at = ?, expires_at = ? WHERE id = ?')
            .run(dataStr, nowIso(), nowIso(ttlMs), session.id);
          if (info.changes === 1) {
            state.cookieDirty = true;
          } else {
            // Sitzung wurde während der Anfrage beendet (z. B. Passwortänderung) – nicht neu anlegen.
            state.persisted = false;
            state.token = null;
            state.cookieDirty = false;
            state.clearCookie = true;
          }
        }
      } else if (state.needed || dataStr !== '{}' || session.userId != null) {
        insertNew(dataStr);
      }
      if (state.cookieDirty && state.token) {
        res.cookie(name, state.token, cookieOptions());
      } else if (state.clearCookie && !state.persisted) {
        const { maxAge, ...opts } = cookieOptions();
        res.clearCookie(name, opts);
      }
    }

    const origWriteHead = res.writeHead;
    res.writeHead = function writeHeadWithSession(...args) {
      try {
        persist();
      } catch (err) {
        console.error('[session] Speichern fehlgeschlagen:', err);
      }
      return origWriteHead.apply(this, args);
    };

    req.session = session;

    req.csrfToken = function csrfToken() {
      if (!session.csrfToken) {
        session.csrfToken = randomToken();
        state.needed = true;
      }
      return session.csrfToken;
    };

    req.regenerateSession = async function regenerateSession(opts = {}) {
      const keepData = Boolean(opts.keepData);
      const userId = opts.userId === undefined || opts.userId === null ? null : Number(opts.userId);
      if (res.headersSent) throw new Error('regenerateSession() nach dem Senden der Header aufgerufen');
      if (state.persisted && session.id) db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      const data = keepData ? session.data : {};
      session.id = null;
      session.userId = userId;
      session.data = data && typeof data === 'object' ? data : {};
      session.csrfToken = null;
      state.persisted = false;
      state.token = null;
      state.needed = false;
      state.cookieDirty = false;
      state.clearCookie = true;
      state.origData = '{}';
      state.origUserId = null;
      const dataStr = JSON.stringify(session.data);
      if (userId != null || dataStr !== '{}') {
        session.csrfToken = randomToken();
        insertNew(dataStr);
      }
      return session;
    };

    req.destroySession = async function destroySession() {
      if (state.persisted && session.id) db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      session.id = null;
      session.userId = null;
      session.data = {};
      session.csrfToken = null;
      state.persisted = false;
      state.token = null;
      state.needed = false;
      state.cookieDirty = false;
      state.clearCookie = true;
      state.origData = '{}';
      state.origUserId = null;
    };

    next();
  };
}

/** Meldet alle Sitzungen eines Nutzers ab (z. B. nach Passwortänderung). */
function destroyUserSessions(userId) {
  return getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId).changes;
}

module.exports = { createSessionMiddleware, cookieName, sha256Hex, destroyUserSessions };
