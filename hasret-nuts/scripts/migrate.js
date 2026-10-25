#!/usr/bin/env node
'use strict';
/** npm run migrate – spielt ausstehende Datenbank-Migrationen ein (idempotent). */
const config = require('../shared/config');
const { migrate, closeDb } = require('../shared/db');

try {
  const applied = migrate();
  if (applied.length) console.log(`Migrationen angewendet (${config.db.path}):\n  - ${applied.join('\n  - ')}`);
  else console.log(`Datenbank ist aktuell (${config.db.path}).`);
} catch (err) {
  console.error('Migration fehlgeschlagen:', err.message);
  process.exitCode = 1;
} finally {
  closeDb();
}
