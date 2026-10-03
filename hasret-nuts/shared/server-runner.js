'use strict';
/**
 * Startet eine App als HTTP-Server (FOUNDATION-CORE): Migrationen, Listen auf HOST:PORT,
 * stündliche Bereinigung abgelaufener Sitzungen/Tokens, sauberes Herunterfahren (SIGTERM/SIGINT).
 */
const config = require('./config');
const { migrate, closeDb, cleanupExpired } = require('./db');

function runServer(name, createApp) {
  const applied = migrate();
  if (applied.length) console.log(`[${name}] Migrationen angewendet: ${applied.join(', ')}`);
  try {
    cleanupExpired();
  } catch (err) {
    console.error(`[${name}] Bereinigung fehlgeschlagen:`, err.message);
  }

  const app = createApp();
  const { port, baseUrl } = config.apps[name];
  const server = app.listen(port, config.host, (err) => {
    if (err) {
      console.error(`[${name}] Start fehlgeschlagen:`, err.message);
      process.exit(1);
    }
    console.log(`[${name}] läuft auf http://${config.host}:${port}  ·  öffentliche URL ${baseUrl}  ·  Umgebung ${config.env}`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 20_000;
  server.keepAliveTimeout = 65_000;

  const timer = setInterval(() => {
    try {
      cleanupExpired();
    } catch (err) {
      console.error(`[${name}] Bereinigung fehlgeschlagen:`, err.message);
    }
  }, 60 * 60 * 1000);
  timer.unref();

  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`[${name}] ${signal} empfangen – fahre herunter …`);
    clearInterval(timer);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

module.exports = { runServer };
