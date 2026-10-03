'use strict';
/**
 * Test-Helfer (FOUNDATION-CORE) – nur node:test + globales fetch.
 *
 *   const { startApp, client, lastMail, extractToken } = require('./helpers');   // ZUERST requiren!
 *   const app = await startApp('shop', { env: { RATE_LIMIT_FORMS_MAX: '2' } });
 *   const c = client(app.baseUrl);
 *   const page = await c.get('/kasse');                 // merkt sich Cookies + _csrf der Seite
 *   const res = await c.post('/kasse', { name: '…' });  // _csrf wird automatisch ergänzt
 *   assert.equal(res.status, 303); assert.equal(res.location, '/bestellung/danke');
 *   app.outbox  → versendete Mails;  app.db → better-sqlite3-Verbindung;  await app.close();
 *
 * Jede startApp()-Instanz bekommt eine eigene temporäre Datenbank, einen freien Port und
 * NODE_ENV=test (Mails nur im Speicher, großzügige Ratenlimits, außer per env gesenkt).
 * Basis-URL der App (für Links in Mails) = tatsächliche Test-URL, sofern nicht per env gesetzt.
 * Pro Testdatei immer nur EINE App gleichzeitig starten (gemeinsame DB-Verbindung im Prozess).
 */
process.env.NODE_ENV = 'test';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const config = require('../shared/config');
const db = require('../shared/db');
const mailer = require('../shared/mailer');
const security = require('../shared/security');
const catalog = require('../shared/catalog');

const ROOT = path.resolve(__dirname, '..');

/**
 * Startet eine beliebige App-Fabrik auf einem freien Port mit temporärer DB.
 * opts: { env: { VAR: 'wert' }, appName: 'shop' | 'corporate' }
 * → { baseUrl, port, app, server, db, outbox, config, close }
 */
async function startServer(factory, { env = {}, appName = 'shop' } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hn-test-'));
  const saved = new Map();
  const setEnv = (key, value) => {
    if (!saved.has(key)) saved.set(key, process.env[key]);
    if (value === undefined || value === null) delete process.env[key];
    else process.env[key] = String(value);
  };

  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  setEnv('NODE_ENV', 'test');
  setEnv('DATABASE_PATH', path.join(tmpDir, 'test.db'));
  setEnv('MAIL_DIR', path.join(tmpDir, 'mail'));
  setEnv(appName === 'corporate' ? 'CORPORATE_BASE_URL' : 'SHOP_BASE_URL', baseUrl);
  for (const [k, v] of Object.entries(env)) setEnv(k, v);

  let app;
  try {
    config.reload();
    db.closeDb();
    db.migrate();
    mailer.outbox.length = 0;
    security.resetMailQuota();
    catalog.reloadCatalog();
    app = factory();
  } catch (err) {
    server.close();
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    throw err;
  }
  server.on('request', app);

  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
    db.closeDb();
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      config.reload();
    } catch {
      /* Umgebung nach Test wiederhergestellt */
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { baseUrl, port, app, server, db: db.getDb(), outbox: mailer.outbox, config, tmpDir, close };
}

/** Startet 'corporate' oder 'shop' (App aus <name>/app.js). */
function startApp(name, opts = {}) {
  if (!['corporate', 'shop'].includes(name)) throw new Error(`Unbekannte App: ${name}`);
  return startServer(() => require(path.join(ROOT, name, 'app.js')).createApp(), { ...opts, appName: name });
}

/* ---------------------------------------------------------------- HTTP-Client */

function parseSetCookie(header) {
  const [pair, ...attrs] = header.split(';');
  const idx = pair.indexOf('=');
  const name = pair.slice(0, idx).trim();
  const value = pair.slice(idx + 1).trim();
  const attributes = {};
  for (const a of attrs) {
    const [k, ...rest] = a.split('=');
    attributes[k.trim().toLowerCase()] = rest.length ? rest.join('=').trim() : true;
  }
  return { name, value, attributes, raw: header };
}

function decodeHtmlAttr(v) {
  return v
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function findCsrf(text) {
  const input = /<input\b[^>]*\bname=["']_csrf["'][^>]*>/i.exec(text);
  if (input) {
    const v = /\bvalue=["']([^"']*)["']/i.exec(input[0]);
    if (v && v[1]) return decodeHtmlAttr(v[1]);
  }
  const meta = /<meta\b[^>]*\bname=["']csrf-token["'][^>]*>/i.exec(text);
  if (meta) {
    const v = /\bcontent=["']([^"']*)["']/i.exec(meta[0]);
    if (v && v[1]) return decodeHtmlAttr(v[1]);
  }
  return null;
}

/**
 * Einfacher Browser-Ersatz mit Cookie-Jar.
 *   get(path, { headers, follow })            → Antwort
 *   post(path, form, { headers, follow })     → Antwort (x-www-form-urlencoded; _csrf automatisch)
 *   postJson(path, data, { headers })         → Antwort (JSON; Header x-csrf-token automatisch)
 * Antwort: { status, headers, text, body, location, setCookies: [{ name, value, attributes, raw }], url, json() }
 * Weiterleitungen werden standardmäßig NICHT verfolgt (follow: true → bis zu 10 per GET).
 * c.csrfToken enthält das zuletzt gesehene Token (aus <input name="_csrf"> oder <meta name="csrf-token">).
 */
function client(baseUrl) {
  const jar = new Map();
  const c = {
    baseUrl,
    jar,
    csrfToken: null,
    last: null,
    cookieHeader() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    setCookie(name, value) {
      if (value === null || value === undefined) jar.delete(name);
      else jar.set(name, value);
    },
    async request(method, urlPath, { body, headers = {}, follow = false, redirects = 0 } = {}) {
      const url = new URL(urlPath, baseUrl);
      const h = { ...headers };
      if (jar.size && !h.cookie) h.cookie = c.cookieHeader();
      const res = await fetch(url, { method, headers: h, body, redirect: 'manual' });
      const setCookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(parseSetCookie);
      for (const sc of setCookies) {
        const maxAge = sc.attributes['max-age'];
        const expires = sc.attributes.expires ? Date.parse(sc.attributes.expires) : NaN;
        const expired = (maxAge !== undefined && Number(maxAge) <= 0) || (!Number.isNaN(expires) && expires <= Date.now());
        if (expired || sc.value === '') jar.delete(sc.name);
        else jar.set(sc.name, sc.value);
      }
      const text = await res.text();
      const type = res.headers.get('content-type') || '';
      if (type.includes('text/html')) {
        const token = findCsrf(text);
        if (token) c.csrfToken = token;
      } else if (type.includes('application/json')) {
        try {
          const data = JSON.parse(text);
          if (data && typeof data.csrfToken === 'string') c.csrfToken = data.csrfToken;
        } catch {
          /* kein JSON */
        }
      }
      const out = {
        status: res.status,
        headers: res.headers,
        text,
        body: text,
        location: res.headers.get('location'),
        setCookies,
        url: url.toString(),
        json: () => JSON.parse(text),
      };
      c.last = out;
      if (follow && [301, 302, 303, 307, 308].includes(res.status) && out.location && redirects < 10) {
        return c.request('GET', out.location, { headers, follow, redirects: redirects + 1 });
      }
      return out;
    },
    get(urlPath, opts = {}) {
      return c.request('GET', urlPath, opts);
    },
    post(urlPath, form = {}, opts = {}) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(form)) {
        if (Array.isArray(v)) v.forEach((item) => params.append(k, String(item)));
        else if (v !== undefined && v !== null) params.append(k, String(v));
      }
      if (!Object.prototype.hasOwnProperty.call(form, '_csrf') && c.csrfToken) params.append('_csrf', c.csrfToken);
      return c.request('POST', urlPath, {
        ...opts,
        body: params.toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded', ...(opts.headers || {}) },
      });
    },
    postJson(urlPath, data = {}, opts = {}) {
      const headers = { 'content-type': 'application/json', accept: 'application/json', ...(opts.headers || {}) };
      if (c.csrfToken && !headers['x-csrf-token']) headers['x-csrf-token'] = c.csrfToken;
      return c.request('POST', urlPath, { ...opts, body: JSON.stringify(data), headers });
    },
  };
  return c;
}

/* ----------------------------------------------------------------- Mail-Helfer */

/** Letzte Mail (optional an eine bestimmte Adresse). */
function lastMail(outbox, to) {
  const list = to ? outbox.filter((m) => m.toList.some((a) => a.toLowerCase() === String(to).toLowerCase())) : outbox;
  return list[list.length - 1] || null;
}

/** Alle http(s)-Links aus einem Text. */
function extractLinks(text) {
  return String(text || '').match(/https?:\/\/[^\s<>"]+/g) || [];
}

/** Wert des Query-Parameters "token" aus einem Link oder Mailtext. */
function extractToken(textOrUrl, param = 'token') {
  const re = new RegExp(`[?&]${param}=([A-Za-z0-9_-]+)`);
  const m = re.exec(String(textOrUrl || ''));
  return m ? m[1] : null;
}

/** Pfad + Query eines absoluten Links (zum Aufruf über client.get()). */
function pathOf(url) {
  const u = new URL(url);
  return u.pathname + u.search;
}

module.exports = {
  startApp,
  startServer,
  client,
  lastMail,
  extractLinks,
  extractToken,
  pathOf,
  findCsrf,
  parseSetCookie,
  ROOT,
};
