'use strict';
/**
 * SQLite-Zugriff (FOUNDATION-CORE) – better-sqlite3, synchron, eine Verbindung pro Prozess.
 *
 *   const { getDb, transaction } = require('../shared/db');
 *   const row = getDb().prepare('SELECT * FROM orders WHERE public_id = ?').get(publicId);
 *
 * REGEL: Jede Abfrage nutzt vorbereitete Statements mit gebundenen Parametern
 * (?, @name). Niemals Werte per String-Verkettung in SQL einbauen.
 */
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('./config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

let db = null;
let openPath = null;

/** Liefert die (einzige) Datenbankverbindung; öffnet sie beim ersten Aufruf. */
function getDb() {
  const wanted = config.db.path;
  if (db && openPath === wanted) return db;
  if (db) closeDb();
  fs.mkdirSync(path.dirname(wanted), { recursive: true });
  db = new Database(wanted);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  openPath = wanted;
  return db;
}

/** Schließt die Verbindung (Tests, sauberes Herunterfahren). */
function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      /* bereits geschlossen */
    }
  }
  db = null;
  openPath = null;
}

/**
 * Führt fn(db) in einer Transaktion aus und gibt dessen Ergebnis zurück.
 * Wirft fn, wird alles zurückgerollt. fn muss SYNCHRON sein (kein await darin).
 */
function transaction(fn) {
  const conn = getDb();
  return conn.transaction(() => fn(conn))();
}

/** Spielt alle noch nicht angewendeten shared/migrations/*.sql ein (idempotent). */
function migrate() {
  const conn = getDb();
  conn.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const done = new Set(conn.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_[\w-]+\.sql$/.test(f))
    .sort();
  const applied = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    conn.transaction(() => {
      conn.exec(sql);
      conn.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
    })();
    applied.push(file);
  }
  return applied;
}

/** ISO-8601-Zeitstempel (UTC), identisch zum Format der SQL-Standardwerte. */
function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

const UNVERIFIED_ACCOUNT_DAYS = 7;

/**
 * Entfernt abgelaufene Sitzungen, alte Einmal-Tokens, veraltete Anmelde-Zähler und
 * Kundenkonten, deren E-Mail-Adresse nach 7 Tagen noch nicht bestätigt ist (verhindert,
 * dass jemand fremde Adressen dauerhaft „vorab belegt“).
 */
function cleanupExpired() {
  const conn = getDb();
  const now = nowIso();
  const weekAgo = nowIso(-7 * 24 * 3600 * 1000);
  const s = conn.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now).changes;
  const t = conn
    .prepare('DELETE FROM auth_tokens WHERE expires_at <= ? OR (used_at IS NOT NULL AND used_at <= ?)')
    .run(weekAgo, weekAgo).changes;
  const a = conn
    .prepare('DELETE FROM login_attempts WHERE updated_at <= ? AND (locked_until IS NULL OR locked_until <= ?)')
    .run(nowIso(-24 * 3600 * 1000), now).changes;
  const stale = nowIso(-UNVERIFIED_ACCOUNT_DAYS * 24 * 3600 * 1000);
  const u = conn.transaction(() => {
    const ids = conn
      .prepare("SELECT id FROM users WHERE email_verified_at IS NULL AND role = 'customer' AND created_at <= ?")
      .all(stale)
      .map((r) => r.id);
    for (const id of ids) {
      conn.prepare('UPDATE orders SET user_id = NULL WHERE user_id = ?').run(id);
      conn.prepare('UPDATE security_events SET user_id = NULL WHERE user_id = ?').run(id);
      conn.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      conn.prepare('DELETE FROM auth_tokens WHERE user_id = ?').run(id);
      conn.prepare('DELETE FROM login_attempts WHERE user_id = ?').run(id);
      conn.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
    return ids.length;
  })();
  return { sessions: s, tokens: t, loginAttempts: a, unverifiedUsers: u };
}

module.exports = { getDb, closeDb, transaction, migrate, nowIso, cleanupExpired };
