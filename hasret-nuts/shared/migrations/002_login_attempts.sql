-- Anmelde-Drosselung pro Konto UND Gerät/IP (gesalzener IP-Hash, nie die rohe IP).
-- Hintergrund: Eine reine Konto-Sperre nach 5 Fehlversuchen ließ sich von jedem Unbekannten
-- auslösen (auch gegen das Admin-Konto). Jetzt sperren 5 Fehlversuche nur das Paar
-- Konto + IP; erst sehr viele Fehlversuche aus verschiedenen Quellen sperren das Konto.
CREATE TABLE login_attempts (
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ip_hash      TEXT    NOT NULL,
  failures     INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at   TEXT    NOT NULL,
  PRIMARY KEY (user_id, ip_hash)
);
CREATE INDEX idx_login_attempts_updated ON login_attempts (updated_at);

-- Beginn des Zählfensters für die kontoweite Drosselung.
ALTER TABLE users ADD COLUMN failed_since TEXT;
