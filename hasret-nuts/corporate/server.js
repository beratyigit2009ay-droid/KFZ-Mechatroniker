'use strict';
/** Startpunkt Corporate Hub:  npm run start:corporate  (Port CORPORATE_PORT, Standard 3001) */

function load() {
  const { runServer } = require('../shared/server-runner');
  const { createApp } = require('./app');
  return () => runServer('corporate', createApp);
}

if (require.main === module) {
  let start;
  try {
    start = load();
  } catch (err) {
    // z. B. unvollständige Produktionskonfiguration – klare Meldung statt Stacktrace
    console.error(`[corporate] ${err.message}`);
    process.exit(1);
  }
  start();
}

module.exports = { start: () => load()() };
