'use strict';
/**
 * Gemeinsame Express-Basis für beide Apps (FOUNDATION-CORE).
 *
 *   const app = createBaseApp({ name: 'corporate' | 'shop', appDir: __dirname });
 *   app.use(require('./routes/pages')); …; app.use(notFound); app.use(errorHandler);
 *
 * Reihenfolge: CSP-Nonce → helmet → Permissions-Policy → compression → /assets & /static →
 * globales Ratenlimit → Body-Parser (20 kB) → Cookies → Sitzung → Nutzer → Flash → res.locals →
 * CSRF-Schutz (global für POST/PUT/PATCH/DELETE) → Nunjucks.
 *
 * res.locals in jedem Template: nonce, site, currentPath, user (oder null), csrfToken, flash,
 * meta (Standard-SEO-Daten, per render({ meta }) überschreibbar), noindex, appName.
 * req: req.user (öffentliche Nutzerdaten oder null), req.session, req.csrfToken(),
 *      req.regenerateSession(), req.destroySession(), req.flash(type, message).
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { createSessionMiddleware } = require('./session');
const { csrfProtection, rateLimits, initRateLimits } = require('./security');
const { findUserById, publicUser } = require('./auth');
const { createViews } = require('./views');
const { buildMeta, siteFromConfig } = require('./seo');
const { requestContext } = require('./request-context');

const SHARED_ASSETS = path.join(__dirname, 'assets');
const FLASH_TYPES = new Set(['success', 'error', 'info', 'warning']);

/** Versionskennung aus Dateinamen, Größen und Änderungszeiten (Cache-Busting über ?v=). */
function computeAssetVersion(dirs) {
  const hash = crypto.createHash('sha1');
  const walk = (dir, rel = '') => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, `${rel}/${e.name}`);
      else if (e.isFile()) {
        const st = fs.statSync(full);
        hash.update(`${rel}/${e.name}:${st.size}:${Math.floor(st.mtimeMs)}\n`);
      }
    }
  };
  for (const d of dirs) walk(d);
  return hash.digest('hex').slice(0, 10);
}

function staticOptions() {
  return {
    index: false,
    dotfiles: 'ignore',
    redirect: false,
    fallthrough: true,
    cacheControl: false,
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const versioned = Boolean(res.req && res.req.query && res.req.query.v);
      if (config.isDev) res.setHeader('Cache-Control', 'no-cache');
      else if (versioned || /\.woff2?$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  };
}

function helmetMiddleware() {
  const nonce = (req, res) => `'nonce-${res.locals.nonce}'`;
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", nonce],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", nonce],
    styleSrcElem: ["'self'", nonce],
    styleSrcAttr: ["'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: config.isProd ? [] : null,
  };
  return helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    strictTransportSecurity: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    xPoweredBy: false,
  });
}

/** Lazy CSRF-Token: wird erst beim Ausgeben im Template erzeugt ({{ csrfToken }}). */
class LazyCsrfToken {
  constructor(req) {
    Object.defineProperty(this, 'req', { value: req, enumerable: false });
  }
  toString() {
    return this.req.csrfToken();
  }
  valueOf() {
    return this.req.csrfToken();
  }
  toJSON() {
    return this.req.csrfToken();
  }
}

function createBaseApp({ name, appDir }) {
  if (!config.apps[name]) throw new Error(`createBaseApp: unbekannte App "${name}"`);
  if (!appDir) throw new Error('createBaseApp: appDir fehlt');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple');
  app.set('env', config.env);
  if (config.isProd) app.enable('view cache');

  app.locals.appName = name;
  app.locals.site = siteFromConfig(name);
  initRateLimits(app);
  app.locals.assetV = config.isDev ? String(Date.now()).slice(-8) : computeAssetVersion([SHARED_ASSETS, path.join(appDir, 'public')]);

  // 0) Anfrage-Kontext (aktuelle App für Helfer wie buildMeta)
  app.use(requestContext(name));

  // 1) CSP-Nonce pro Anfrage
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  // 2) Sicherheits-Header
  app.use(helmetMiddleware());
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  // 3) Kompression + statische Dateien (vor Sitzung/Ratenlimit: keine DB-Last durch Assets)
  app.use(compression());
  app.get('/favicon.ico', (req, res) => res.redirect(301, '/assets/logo/favicon.svg'));
  app.use('/assets', express.static(SHARED_ASSETS, staticOptions()));
  app.use('/static', express.static(path.join(appDir, 'public'), staticOptions()));

  // 4) Globales Ratenlimit (300 Anfragen / 15 min / IP)
  app.use(rateLimits.global);

  // 5) Body-Parser mit kleinen Limits, Cookies
  app.use(express.urlencoded({ extended: false, limit: '20kb', parameterLimit: 200 }));
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  // 6) Sitzung + Nutzer
  app.use(createSessionMiddleware(name));
  app.use((req, res, next) => {
    req.user = null;
    if (req.session.userId != null) {
      const row = findUserById(req.session.userId);
      if (row) req.user = publicUser(row);
      else req.session.userId = null;
    }
    next();
  });

  // 7) Flash-Meldungen: req.flash(type, message); res.locals.flash = [{ type, message }]
  app.use((req, res, next) => {
    req.flash = (type, message) => {
      const list = Array.isArray(req.session.data._flash) ? req.session.data._flash : [];
      list.push({ type: FLASH_TYPES.has(type) ? type : 'info', message: String(message ?? '').slice(0, 500) });
      req.session.data._flash = list.slice(-5);
    };
    let consumed = null;
    Object.defineProperty(res.locals, 'flash', {
      enumerable: true,
      configurable: true,
      get() {
        if (consumed === null) {
          const list = req.session.data._flash;
          consumed = Array.isArray(list) ? list.filter((m) => m && typeof m.message === 'string') : [];
          if (list !== undefined) delete req.session.data._flash;
        }
        return consumed;
      },
    });
    next();
  });

  // 8) Weitere Template-Variablen
  app.use((req, res, next) => {
    res.locals.site = app.locals.site;
    res.locals.appName = name;
    res.locals.currentPath = req.path;
    res.locals.user = req.user;
    res.locals.csrfToken = new LazyCsrfToken(req);
    res.locals.noindex = false;
    res.locals.meta = buildMeta({ path: req.path, app: name });
    next();
  });

  // 9) CSRF-Schutz für alle zustandsändernden Anfragen
  app.use(csrfProtection);

  // 10) Templates
  createViews(app, appDir);

  return app;
}

module.exports = { createBaseApp, computeAssetVersion, SHARED_ASSETS };
