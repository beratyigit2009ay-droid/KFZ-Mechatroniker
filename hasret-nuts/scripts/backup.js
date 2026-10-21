#!/usr/bin/env node
'use strict';
/**
 * npm run backup – erstellt eine konsistente Sicherung der SQLite-Datenbank (auch im
 * laufenden Betrieb, WAL-sicher über die Backup-API von SQLite).
 *
 *   npm run backup                       → var/backups/hasret-YYYYMMDD-HHMMSSmmm.db
 *   BACKUP_DIR=/srv/backup BACKUP_KEEP=30 npm run backup
 *
 * Es werden die neuesten BACKUP_KEEP Sicherungen (Standard 14) behalten.
 * Sicherungen enthalten personenbezogene Daten – Ordner nur für den Dienstnutzer lesbar
 * halten und zusätzlich verschlüsselt außer Haus kopieren (siehe README).
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../shared/config');
const { getDb, closeDb } = require('../shared/db');

async function main() {
  const dir = path.resolve(config.rootDir, process.env.BACKUP_DIR || path.join('var', 'backups'));
  const keep = Math.max(1, Number.parseInt(process.env.BACKUP_KEEP || '14', 10) || 14);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const iso = new Date().toISOString(); // 2026-10-03T15:35:52.123Z
  const stamp = `${iso.slice(0, 10).replace(/-/g, '')}-${iso.slice(11, 19).replace(/:/g, '')}${iso.slice(20, 23)}`;
  const target = path.join(dir, `hasret-${stamp}.db`);
  await getDb().backup(target);
  fs.chmodSync(target, 0o600);
  const all = fs
    .readdirSync(dir)
    .filter((f) => /^hasret-\d{8}-\d{9}\.db$/.test(f))
    .sort();
  const remove = all.slice(0, Math.max(0, all.length - keep));
  for (const f of remove) fs.unlinkSync(path.join(dir, f));
  console.log(`Sicherung erstellt: ${target}${remove.length ? ` (${remove.length} alte Sicherung(en) entfernt)` : ''}`);
}

main()
  .catch((err) => {
    console.error('Sicherung fehlgeschlagen:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
