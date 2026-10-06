'use strict';
/**
 * Zentrale Konfiguration (FOUNDATION-CORE).
 *
 * Alle Werte kommen ausschließlich aus Umgebungsvariablen (.env im Projektordner
 * wird per dotenv geladen – außer bei NODE_ENV=test). Es stehen KEINE Geheimnisse
 * im Code. Für die Entwicklung gibt es harmlose Standardwerte; in Produktion
 * bricht der Start ab, wenn sicherheitsrelevante Werte fehlen oder unsicher sind.
 *
 * Verwendung:  const config = require('../shared/config');
 *              config.apps.shop.baseUrl, config.isProd, config.mail.ownerEmail …
 * Werte immer zur Laufzeit lesen (config.x), nicht beim require() destrukturieren –
 * die Tests rufen config.reload() mit anderen Umgebungsvariablen auf.
 */
const path = require('node:path');
const { z } = require('zod');

const ROOT_DIR = path.resolve(__dirname, '..');

function loadDotenv() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    require('dotenv').config({ path: path.join(ROOT_DIR, '.env'), quiet: true });
  } catch {
    /* .env ist optional */
  }
}

const bool = (def) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim() === '') return def;
      return ['1', 'true', 'yes', 'ja', 'on'].includes(v.trim().toLowerCase());
    });

const int = (def, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v.trim() === '') return def;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `muss eine ganze Zahl zwischen ${min} und ${max} sein` });
        return z.NEVER;
      }
      return n;
    });

const str = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === '' ? def : v.trim()));

const emptyToUndefined = (schema) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

const envSchema = z.object({
  NODE_ENV: emptyToUndefined(z.enum(['development', 'production', 'test']).default('development')),
  HOST: str('127.0.0.1'),
  CORPORATE_PORT: int(3001, 0, 65535),
  SHOP_PORT: int(3002, 0, 65535),
  CORPORATE_BASE_URL: str('http://localhost:3001'),
  SHOP_BASE_URL: str('http://localhost:3002'),
  TRUST_PROXY: str('false'),
  DATABASE_PATH: str(path.join(ROOT_DIR, 'data', 'hasret.db')),
  CATALOG_PATH: str(path.join(ROOT_DIR, 'shared', 'data', 'catalog.json')),
  ALLERGENS_PATH: str(path.join(ROOT_DIR, 'shared', 'data', 'allergens.json')),
  OFFERS_PATH: str(path.join(ROOT_DIR, 'shared', 'data', 'offers.json')),
  MAIL_TRANSPORT: emptyToUndefined(z.enum(['smtp', 'file', 'memory']).optional()),
  MAIL_DIR: str(path.join(ROOT_DIR, 'var', 'mail')),
  MAIL_FROM: str(''),
  MAIL_REPLY_TO: str(''),
  OWNER_EMAIL: str(''),
  SMTP_HOST: str(''),
  SMTP_PORT: int(587, 1, 65535),
  SMTP_SECURE: bool(false),
  SMTP_USER: str(''),
  SMTP_PASS: z.string().optional().default(''),
  LOG_SALT: z.string().optional().default(''),
  SESSION_TTL_DAYS: int(14, 1, 90),
  ADMIN_IDLE_MINUTES: int(30, 0, 24 * 60),
  ALLOW_INDEXING: z.string().optional(),
  GOOGLE_SITE_VERIFICATION_CORPORATE: str(''),
  GOOGLE_SITE_VERIFICATION_SHOP: str(''),
  ORDER_PREFIX: str('HN'),
});

/** Standard-Ratenlimits (Fenster in Minuten, max. Anfragen pro IP). */
const RATE_LIMIT_DEFAULTS = {
  global: { windowMin: 15, max: 300 },
  login: { windowMin: 15, max: 10 },
  register: { windowMin: 60, max: 5 },
  forgot: { windowMin: 60, max: 5 },
  resend: { windowMin: 60, max: 3 },
  forms: { windowMin: 60, max: 10 },
  discount: { windowMin: 10, max: 20 },
  newsletter: { windowMin: 60, max: 5 },
  /* max. Mails pro Empfängeradresse und Stunde (Passwort vergessen, Bestätigung erneut, Newsletter) */
  mailPerAddress: { windowMin: 60, max: 3 },
};

function parseTrustProxy(raw) {
  const v = String(raw).trim();
  if (v === '' || v === 'false' || v === '0' || v === 'no' || v === 'none') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v; // z. B. "loopback" oder "127.0.0.1"
}

function parseMailbox(raw) {
  if (!raw) return null;
  const m = /^\s*(?:"?([^"<>\r\n]*?)"?\s*)?<([^<>\s\r\n]+@[^<>\s\r\n]+)>\s*$/.exec(raw);
  if (m) return { name: (m[1] || '').trim(), address: m[2].trim() };
  if (/^[^\s<>\r\n@]+@[^\s<>\r\n@]+$/.test(raw.trim())) return { name: '', address: raw.trim() };
  return null;
}

function isHttpsUrl(u) {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeBaseUrl(u) {
  return String(u).replace(/\/+$/, '');
}

function rateLimitsFromEnv(env, isTest) {
  const out = {};
  for (const [name, def] of Object.entries(RATE_LIMIT_DEFAULTS)) {
    const key = name.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase();
    const maxRaw = env[`RATE_LIMIT_${key}_MAX`];
    const winRaw = env[`RATE_LIMIT_${key}_WINDOW_MIN`];
    let max = def.max;
    // In Tests großzügige Standardwerte, damit Testläufe nicht an Limits scheitern;
    // einzelne Tests setzen RATE_LIMIT_<NAME>_MAX gezielt niedriger.
    if (isTest) max = 10000;
    if (maxRaw !== undefined && maxRaw !== '') {
      const n = Number(maxRaw);
      if (!Number.isInteger(n) || n < 1) throw new Error(`RATE_LIMIT_${key}_MAX muss eine positive ganze Zahl sein.`);
      max = n;
    }
    let windowMin = def.windowMin;
    if (winRaw !== undefined && winRaw !== '') {
      const n = Number(winRaw);
      if (!(n > 0)) throw new Error(`RATE_LIMIT_${key}_WINDOW_MIN muss eine positive Zahl sein.`);
      windowMin = n;
    }
    out[name] = { windowMs: Math.round(windowMin * 60 * 1000), max };
  }
  return out;
}

const DEV_LOG_SALT = 'dev-only-log-salt-not-for-production-use-0000';

function build() {
  loadDotenv();
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Ungültige Konfiguration (Umgebungsvariablen):\n${lines.join('\n')}`);
  }
  const e = parsed.data;
  const env = e.NODE_ENV;
  const isProd = env === 'production';
  const isTest = env === 'test';
  const isDev = env === 'development';

  const mailFrom = parseMailbox(e.MAIL_FROM) || (isProd ? null : { name: 'Hasret Nuts', address: 'no-reply@hasret-nuts.invalid' });
  const replyTo = e.MAIL_REPLY_TO ? parseMailbox(e.MAIL_REPLY_TO) : null;
  // Tests versenden niemals echte Mails – unabhängig von MAIL_TRANSPORT.
  const transport = isTest ? 'memory' : e.MAIL_TRANSPORT || (isProd ? 'smtp' : 'file');
  const allowIndexing = e.ALLOW_INDEXING === undefined || e.ALLOW_INDEXING.trim() === ''
    ? isProd
    : ['1', 'true', 'yes', 'ja', 'on'].includes(e.ALLOW_INDEXING.trim().toLowerCase());

  const problems = [];
  if (isProd) {
    if (!isHttpsUrl(e.CORPORATE_BASE_URL)) problems.push('CORPORATE_BASE_URL muss in Produktion mit https:// beginnen.');
    if (!isHttpsUrl(e.SHOP_BASE_URL)) problems.push('SHOP_BASE_URL muss in Produktion mit https:// beginnen.');
    if (!e.SMTP_HOST) problems.push('SMTP_HOST fehlt (E-Mail-Versand ist in Produktion Pflicht).');
    if (!e.MAIL_FROM || !mailFrom) problems.push('MAIL_FROM fehlt oder ist ungültig (Format: "Hasret Nuts <shop@ihre-domain.de>").');
    if (!parseMailbox(e.OWNER_EMAIL)) problems.push('OWNER_EMAIL fehlt oder ist ungültig (Empfänger für Bestellanfragen, Händleranfragen und Feedback).');
    if (transport !== 'smtp') problems.push('MAIL_TRANSPORT muss in Produktion "smtp" sein.');
    if (!e.LOG_SALT || e.LOG_SALT.length < 32 || e.LOG_SALT === DEV_LOG_SALT) {
      problems.push('LOG_SALT fehlt oder ist zu kurz (mind. 32 zufällige Zeichen, z. B. "openssl rand -hex 32").');
    }
    const rawTrustProxy = String(process.env.TRUST_PROXY ?? '').trim();
    if (!rawTrustProxy) {
      // Hinter einem Reverse Proxy ohne TRUST_PROXY sähen alle Besucher wie 127.0.0.1 aus und
      // teilten sich EINEN Ratenlimit-Zähler (ein Angreifer könnte den ganzen Shop sperren).
      problems.push('TRUST_PROXY fehlt. Hinter einem Reverse Proxy die Anzahl der Proxys angeben (meist 1), ohne Proxy ausdrücklich "none".');
    } else if (parseTrustProxy(e.TRUST_PROXY) === true) {
      problems.push('TRUST_PROXY=true vertraut jedem Proxy (IP-Spoofing möglich). Bitte die Anzahl der Proxys (z. B. 1) oder "loopback" angeben.');
    }
  }
  if (problems.length) {
    throw new Error(`Start abgebrochen – unsichere oder unvollständige Produktionskonfiguration:\n  - ${problems.join('\n  - ')}`);
  }

  const apps = {
    corporate: {
      name: 'corporate',
      siteName: 'Hasret Nuts',
      port: e.CORPORATE_PORT,
      baseUrl: normalizeBaseUrl(e.CORPORATE_BASE_URL),
      googleVerification: e.GOOGLE_SITE_VERIFICATION_CORPORATE,
    },
    shop: {
      name: 'shop',
      siteName: 'Hasret Nuts Shop',
      port: e.SHOP_PORT,
      baseUrl: normalizeBaseUrl(e.SHOP_BASE_URL),
      googleVerification: e.GOOGLE_SITE_VERIFICATION_SHOP,
    },
  };

  return {
    env,
    isProd,
    isDev,
    isTest,
    rootDir: ROOT_DIR,
    host: e.HOST,
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    apps,
    corporate: apps.corporate,
    shop: apps.shop,
    db: { path: path.resolve(ROOT_DIR, e.DATABASE_PATH) },
    data: {
      catalogPath: path.resolve(ROOT_DIR, e.CATALOG_PATH),
      allergensPath: path.resolve(ROOT_DIR, e.ALLERGENS_PATH),
      offersPath: path.resolve(ROOT_DIR, e.OFFERS_PATH),
    },
    mail: {
      transport,
      dir: path.resolve(ROOT_DIR, e.MAIL_DIR),
      from: mailFrom,
      replyTo,
      ownerEmail: parseMailbox(e.OWNER_EMAIL)?.address || (isProd ? '' : 'inhaber@hasret-nuts.invalid'),
      smtp: {
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        user: e.SMTP_USER,
        pass: e.SMTP_PASS,
      },
    },
    security: {
      logSalt: e.LOG_SALT || DEV_LOG_SALT,
      sessionTtlDays: e.SESSION_TTL_DAYS,
      adminIdleMinutes: e.ADMIN_IDLE_MINUTES,
    },
    rateLimits: rateLimitsFromEnv(process.env, isTest),
    allowIndexing,
    orderPrefix: e.ORDER_PREFIX,
  };
}

const config = build();

/**
 * Liest die Umgebungsvariablen neu ein und aktualisiert das exportierte Objekt
 * an Ort und Stelle (wird von den Tests genutzt).
 */
Object.defineProperty(config, 'reload', {
  enumerable: false,
  value: function reload() {
    const fresh = build();
    for (const key of Object.keys(config)) delete config[key];
    Object.assign(config, fresh);
    return config;
  },
});

module.exports = config;
Object.defineProperty(module.exports, 'parseMailbox', { enumerable: false, value: parseMailbox });
