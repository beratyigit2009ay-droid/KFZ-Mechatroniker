#!/usr/bin/env node
'use strict';
/**
 * npm run seed – übernimmt die Rabattcodes aus shared/data/offers.json in die Datenbank.
 *   npm run seed               legt nur FEHLENDE Codes an (bestehende bleiben unverändert)
 *   npm run seed -- --update   aktualisiert zusätzlich bestehende Codes (Typ, Wert, Zeitraum,
 *                              Mindestbestellwert, Limits, Beschreibung) – Nutzungszähler bleibt erhalten
 */
const config = require('../shared/config');
const { migrate, transaction, closeDb } = require('../shared/db');
const { getOffers } = require('../shared/catalog');
const { parse, schemas } = require('../shared/validate');

const update = process.argv.includes('--update');

function isoOrNull(v, field, code) {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Code ${code}: ${field} ist kein gültiges Datum (${v})`);
  return d.toISOString();
}

function normalize(entry) {
  const c = parse(schemas.code, entry.code);
  if (!c.ok) throw new Error(`Ungültiger Rabattcode "${entry.code}": nur A–Z, 0–9 und Bindestrich (3–32 Zeichen)`);
  if (!['percent', 'fixed'].includes(entry.type)) throw new Error(`Code ${c.data}: type muss "percent" oder "fixed" sein`);
  const value = Number(entry.value);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Code ${c.data}: value muss eine positive ganze Zahl sein`);
  if (entry.type === 'percent' && value > 100) throw new Error(`Code ${c.data}: Prozentwert über 100`);
  return {
    code: c.data,
    type: entry.type,
    value,
    min_subtotal_cents: Number.isInteger(entry.minSubtotalCents) ? entry.minSubtotalCents : 0,
    starts_at: isoOrNull(entry.startsAt, 'startsAt', c.data),
    ends_at: isoOrNull(entry.endsAt, 'endsAt', c.data),
    max_uses: Number.isInteger(entry.maxUses) ? entry.maxUses : null,
    once_per_email: entry.oncePerEmail ? 1 : 0,
    active: entry.active === false ? 0 : 1,
    description: entry.description ? String(entry.description).slice(0, 500) : null,
  };
}

try {
  migrate();
  const { codes } = getOffers();
  if (!codes.length) {
    console.log(`Keine Rabattcodes in ${config.data.offersPath} gefunden.`);
  } else {
    const rows = codes.map(normalize);
    const result = transaction((db) => {
      const insert = db.prepare(`INSERT INTO discount_codes
          (code, type, value, min_subtotal_cents, starts_at, ends_at, max_uses, once_per_email, active, description)
        VALUES (@code, @type, @value, @min_subtotal_cents, @starts_at, @ends_at, @max_uses, @once_per_email, @active, @description)
        ON CONFLICT(code) DO NOTHING`);
      const upd = db.prepare(`UPDATE discount_codes SET type = @type, value = @value, min_subtotal_cents = @min_subtotal_cents,
          starts_at = @starts_at, ends_at = @ends_at, max_uses = @max_uses, once_per_email = @once_per_email,
          active = @active, description = @description
        WHERE code = @code`);
      let inserted = 0;
      let updated = 0;
      for (const r of rows) {
        const info = insert.run(r);
        if (info.changes) inserted += 1;
        else if (update) updated += upd.run(r).changes;
      }
      return { inserted, updated };
    });
    console.log(`Rabattcodes: ${result.inserted} neu angelegt${update ? `, ${result.updated} aktualisiert` : ''}, ${rows.length} in offers.json.`);
  }
} catch (err) {
  console.error('Seed fehlgeschlagen:', err.message);
  process.exitCode = 1;
} finally {
  closeDb();
}
