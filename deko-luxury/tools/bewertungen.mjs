// Holt die aktuelle Google-Bewertung (Durchschnitt und Anzahl) über die offizielle
// Google Places API und schreibt sie nach assets/data/bewertungen.json.
// Die Website liest diese Datei und zeigt z. B. „4,9 ★ · 37 Google-Bewertungen“.
//
// Läuft automatisch einmal täglich über GitHub Actions (.github/workflows/bewertungen.yml).
// Benötigt das Repository-Secret GOOGLE_PLACES_API_KEY. Optional die Variable
// GOOGLE_PLACE_ID; ohne sie wird das Unternehmen über Name und Adresse gesucht.
//
// Die Datei wird nur geändert, wenn sich Note oder Anzahl wirklich ändern.

import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PLACE_ID = (process.env.GOOGLE_PLACE_ID || '').trim();
const API = process.env.PLACES_API_BASE || 'https://places.googleapis.com/v1';
const SUCHE = 'LUXURY EVENTS by DEKO.LUXURY, Kapuzinerstr. 4, 89331 Burgau';
const ZIEL = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'data', 'bewertungen.json');
const FELDER = ['id', 'displayName', 'formattedAddress', 'rating', 'userRatingCount'];

if (!KEY) {
  console.log('::notice::Kein GOOGLE_PLACES_API_KEY hinterlegt – Bewertung wird nicht abgerufen (siehe README).');
  process.exit(0);
}

async function api(url, options, maske) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': maske, ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google antwortet mit ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function findePlace() {
  if (PLACE_ID) {
    return api(`${API}/places/${encodeURIComponent(PLACE_ID)}?languageCode=de`, { method: 'GET' }, FELDER.join(','));
  }
  const data = await api(`${API}/places:searchText`, {
    method: 'POST',
    body: JSON.stringify({ textQuery: SUCHE, languageCode: 'de', regionCode: 'DE' }),
  }, FELDER.map((f) => 'places.' + f).join(','));
  const treffer = (data.places || []).find((p) => /burgau/i.test(p.formattedAddress || '') && /kapuziner/i.test(p.formattedAddress || ''))
    || (data.places || []).find((p) => /burgau/i.test(p.formattedAddress || ''));
  if (!treffer) throw new Error('Kein passender Eintrag in Burgau gefunden. Bitte GOOGLE_PLACE_ID als Variable hinterlegen.');
  console.log(`Gefunden: ${treffer.displayName?.text} – ${treffer.formattedAddress}`);
  console.log(`Place-ID: ${treffer.id} (optional als Variable GOOGLE_PLACE_ID hinterlegen)`);
  return treffer;
}

try {
  const place = await findePlace();
  const neu = {
    rating: typeof place.rating === 'number' ? Math.round(place.rating * 10) / 10 : null,
    count: Number.isInteger(place.userRatingCount) ? place.userRatingCount : null,
  };
  let alt = {};
  try { alt = JSON.parse(fs.readFileSync(ZIEL, 'utf8')); } catch { /* noch keine Datei */ }
  console.log(`Google-Bewertung: ${neu.rating ?? '–'} ★ aus ${neu.count ?? 0} Bewertungen`);
  if (alt.rating === neu.rating && alt.count === neu.count) {
    console.log('Unverändert.');
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify({ ...neu, quelle: 'Google', stand: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
  console.log('Gespeichert.');
} catch (err) {
  // Fehler melden, aber die bisherige Anzeige auf der Website unverändert lassen
  console.log(`::warning::${err.message}`);
  process.exit(0);
}
