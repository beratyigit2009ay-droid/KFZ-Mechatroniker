'use strict';
/** Startpunkt Online-Shop:  npm run start:shop  (Port SHOP_PORT, Standard 3002) */

function load() {
  const { runServer } = require('../shared/server-runner');
  const { createApp } = require('./app');
  return () => runServer('shop', createApp);
}

if (require.main === module) {
  let start;
  try {
    start = load();
  } catch (err) {
    // z. B. unvollständige Produktionskonfiguration – klare Meldung statt Stacktrace
    console.error(`[shop] ${err.message}`);
    process.exit(1);
  }
  start();
}

module.exports = { start: () => load()() };
