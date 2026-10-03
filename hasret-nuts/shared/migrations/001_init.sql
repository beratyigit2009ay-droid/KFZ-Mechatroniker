-- Hasret Nuts – Grundschema (FOUNDATION-CORE)
-- Zeitstempel: ISO-8601 in UTC als TEXT (z. B. 2026-10-03T15:05:00.123Z),
-- identisch zu JavaScript new Date().toISOString() – dadurch per String vergleichbar.
-- Geldbeträge: immer ganze Cent (INTEGER).

CREATE TABLE users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash     TEXT    NOT NULL,
  name              TEXT    NOT NULL DEFAULT '',
  role              TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  email_verified_at TEXT,
  failed_logins     INTEGER NOT NULL DEFAULT 0,
  locked_until      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- id = SHA-256 (hex) des zufälligen Cookie-Tokens; das Token selbst wird nie gespeichert.
CREATE TABLE sessions (
  id           TEXT    PRIMARY KEY,
  user_id      INTEGER REFERENCES users (id) ON DELETE CASCADE,
  app          TEXT    NOT NULL CHECK (app IN ('corporate', 'shop')),
  data         TEXT    NOT NULL DEFAULT '{}',
  csrf_token   TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at   TEXT    NOT NULL,
  last_seen_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- Einmal-Tokens (E-Mail-Bestätigung, Passwort-Reset, Newsletter-Double-Opt-in).
-- token_hash = SHA-256 (hex) des Roh-Tokens. Für Newsletter-Tokens ist user_id NULL
-- und email enthält die zu bestätigende Adresse.
CREATE TABLE auth_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users (id) ON DELETE CASCADE,
  type       TEXT    NOT NULL CHECK (type IN ('verify_email', 'reset_password', 'newsletter')),
  token_hash TEXT    NOT NULL UNIQUE,
  email      TEXT,
  expires_at TEXT    NOT NULL,
  used_at    TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_auth_tokens_user ON auth_tokens (user_id, type);
CREATE INDEX idx_auth_tokens_email ON auth_tokens (email, type);

CREATE TABLE orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id      TEXT    NOT NULL UNIQUE,            -- z. B. HN-2026-0001
  user_id        INTEGER REFERENCES users (id) ON DELETE SET NULL,
  email          TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  phone          TEXT,
  street         TEXT,
  zip            TEXT,
  city           TEXT,
  country        TEXT    NOT NULL DEFAULT 'DE',
  delivery       TEXT    NOT NULL CHECK (delivery IN ('versand', 'abholung')),
  payment_pref   TEXT,
  message        TEXT,
  discount_code  TEXT,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents    INTEGER NOT NULL CHECK (total_cents >= 0),
  status         TEXT    NOT NULL DEFAULT 'neu'
                 CHECK (status IN ('neu', 'bestaetigt', 'versendet', 'abgeschlossen', 'storniert')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status, created_at);
CREATE INDEX idx_orders_email ON orders (email);

CREATE TABLE order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sku              TEXT    NOT NULL,
  name             TEXT    NOT NULL,
  variant          TEXT,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  qty              INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  bundle_json      TEXT                                -- NULL oder JSON-Array der gewählten SKUs/Namen
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

-- type 'percent': value = Prozent (z. B. 10); type 'fixed': value = Cent (z. B. 500 = 5,00 €)
CREATE TABLE discount_codes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  type               TEXT    NOT NULL CHECK (type IN ('percent', 'fixed')),
  value              INTEGER NOT NULL CHECK (value > 0),
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  starts_at          TEXT,
  ends_at            TEXT,
  max_uses           INTEGER,
  uses               INTEGER NOT NULL DEFAULT 0,
  once_per_email     INTEGER NOT NULL DEFAULT 0 CHECK (once_per_email IN (0, 1)),
  active             INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  description        TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE discount_redemptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id    INTEGER NOT NULL REFERENCES discount_codes (id) ON DELETE CASCADE,
  email      TEXT    NOT NULL COLLATE NOCASE,
  order_id   INTEGER REFERENCES orders (id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_redemptions_code_email ON discount_redemptions (code_id, email);

CREATE TABLE inquiries (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  company          TEXT    NOT NULL,
  contact_name     TEXT    NOT NULL,
  email            TEXT    NOT NULL,
  phone            TEXT,
  zip_city         TEXT,
  business_type    TEXT,
  assortments_json TEXT    NOT NULL DEFAULT '[]',
  message          TEXT,
  status           TEXT    NOT NULL DEFAULT 'neu',
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_inquiries_status ON inquiries (status, created_at);

CREATE TABLE feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  app          TEXT    NOT NULL CHECK (app IN ('corporate', 'shop')),
  kind         TEXT    NOT NULL CHECK (kind IN ('feedback', 'bug', 'idee')),
  page_url     TEXT,
  message      TEXT    NOT NULL,
  steps        TEXT,
  expected     TEXT,
  browser_info TEXT,
  email        TEXT,
  status       TEXT    NOT NULL DEFAULT 'neu',
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_feedback_status ON feedback (status, created_at);

CREATE TABLE newsletter (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  confirmed_at    TEXT,
  unsubscribed_at TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Sicherheitsprotokoll: niemals rohe IP-Adressen, nur gesalzene Hashes.
CREATE TABLE security_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  type       TEXT    NOT NULL,
  ip_hash    TEXT,
  user_agent TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_security_events_user ON security_events (user_id, created_at);
CREATE INDEX idx_security_events_type ON security_events (type, created_at);
