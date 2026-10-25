'use strict';
/**
 * Anfrage-Kontext über AsyncLocalStorage (FOUNDATION-CORE).
 * createBaseApp() führt jede Anfrage in einem Kontext { appName, req } aus. Dadurch kennen
 * Helfer wie seo.buildMeta() die aktuelle App auch ohne übergebenes req.
 */
const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

/** Middleware-Fabrik: startet den Kontext für die restliche Middleware-Kette. */
function requestContext(appName) {
  return function requestContextMiddleware(req, res, next) {
    storage.run({ appName, req }, () => next());
  };
}

/** → { appName, req } | undefined */
function current() {
  return storage.getStore();
}

module.exports = { requestContext, current };
