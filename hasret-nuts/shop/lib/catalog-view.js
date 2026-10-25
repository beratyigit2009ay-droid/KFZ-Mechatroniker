'use strict';
/**
 * Owner: BUILD-SHOP · Ansichtsmodelle für Produkte, Kategorien, Filter und Suche.
 *
 * Alle Preise kommen ausschließlich aus shared/catalog.js (catalog.json) – niemals vom Client.
 * Die Funktionen hier bereiten die Katalogdaten nur für die Templates auf (Preisanzeige,
 * Grundpreis nach PAngV, Fotoplatzhalter, Allergen-Texte, Filter, Suche).
 */
const catalog = require('../../shared/catalog');
const { formatEuro } = require('../../shared/views');

const VORLAEUFIG = 'vorläufig – vom Inhaber anhand der Etiketten zu bestätigen';

/* ------------------------------------------------------------------ Grundlagen */

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** Gültige Varianten (SKU + Integer-Preis), wie sie auch der Katalog-Index kennt. */
function variantsOf(product) {
  return asArray(product && product.variants).filter((v) => v && v.sku && catalog.getVariant(v.sku));
}

function isAvailable(variant) {
  return Boolean(variant) && variant.available !== false;
}

function availableVariants(product) {
  return variantsOf(product).filter(isAvailable);
}

function sortedCategories() {
  return [...catalog.getCategories()].sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99));
}

function categoryName(slug) {
  const c = catalog.getCategory(slug);
  return c ? c.name : '';
}

/** Preisspanne eines Produkts in Cent (über alle Varianten). */
function priceRange(product) {
  const prices = variantsOf(product).map((v) => v.priceCents);
  if (!prices.length) return { min: null, max: null, from: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, from: min !== max };
}

/** "8,00 €" bzw. "ab 7,00 €", wenn die Varianten unterschiedlich viel kosten. */
function priceLabel(product) {
  const r = priceRange(product);
  if (r.min === null) return '';
  return r.from ? `ab ${formatEuro(r.min)}` : formatEuro(r.min);
}

/**
 * Grundpreis nach PAngV. Wird nur berechnet, wenn Gewicht bzw. Füllmenge bestätigt eingetragen ist
 * (weightG, bei Abtropfgewicht drainedWeightG, volumeMl) – sonst Platzhalter "[X,XX] € / kg".
 * → { text, placeholder, unit }
 */
function basePrice(product, variant) {
  const basisDrained = product && product.basePriceBasis === 'Abtropfgewicht';
  const suffix = basisDrained ? ' Abtropfgewicht' : '';
  const grams = basisDrained ? Number(variant && variant.drainedWeightG) : Number(variant && variant.weightG);
  const ml = Number(variant && variant.volumeMl);
  if (variant && Number.isFinite(grams) && grams > 0) {
    return { text: `${formatEuro(Math.round((variant.priceCents * 1000) / grams))} / kg${suffix}`, placeholder: false, unit: 'kg' };
  }
  if (variant && Number.isFinite(ml) && ml > 0) {
    return { text: `${formatEuro(Math.round((variant.priceCents * 1000) / ml))} / l`, placeholder: false, unit: 'l' };
  }
  const unit = product && product.basePriceUnit === 'l' ? 'l' : 'kg';
  return { text: `[X,XX] € / ${unit}${suffix}`, placeholder: true, unit };
}

/** Grundpreis-Zeile für Karten (bei mehreren Varianten: günstigste Variante). */
function basePriceLabel(product) {
  const vs = variantsOf(product);
  if (!vs.length) return '';
  const cheapest = vs.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  const bp = basePrice(product, cheapest);
  return vs.length > 1 && !bp.placeholder ? `ab ${bp.text}` : bp.text;
}

/** "4:5" → "4/5" (für die CSS-Variable --ar des Platzhalters). */
function ratioCss(ratio) {
  const m = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(String(ratio || ''));
  return m ? `${m[1]}/${m[2]}` : '4/5';
}

/** Einheitliches Fotoplatzhalter-Objekt (Foto-ID, Seitenverhältnis, Mindestgröße, Motiv). */
/**
 * Echte Fotos: Sobald der Inhaber ein Bild liefert, genügt in catalog.json/offers.json beim
 * jeweiligen Foto ein Feld "src" (z. B. "/static/img/produkte/S-P01-A.jpg", Datei unter
 * shop/public/img/…). Erlaubt sind nur eigene Pfade unter /static oder /assets (CSP img-src 'self').
 */
const PHOTO_SRC_RE = /^\/(static|assets)\/[A-Za-z0-9._\/-]{1,200}\.(jpe?g|png|webp|avif)$/i;
function photoSrc(v) {
  return typeof v === 'string' && PHOTO_SRC_RE.test(v) && !v.includes('..') ? v : '';
}

function photo(p, fallback = {}) {
  const src = p || fallback || {};
  return {
    src: photoSrc(src.src),
    id: src.id || fallback.id || 'FOTO',
    label: src.label || `Foto ${src.id || ''}`.trim(),
    ratio: src.ratio || fallback.ratio || '4:5',
    ar: ratioCss(src.ratio || fallback.ratio),
    minSize: src.minSize || '',
    alt: src.alt || '',
    text: src.text || '[FOTO-PLATZHALTER: Motiv folgt. Perspektive: folgt.]',
  };
}

/** Bezeichnung der Auswahl auf der Produktseite: "Sorte" oder "Größe". */
function choiceLabel(product) {
  const vs = variantsOf(product);
  if (vs.length < 2) return 'Packung';
  const sizeLike = vs.every((v) => /flasche|\bml\b|\d+\s?(g|kg|l)\b|glas/i.test(v.label || ''));
  return sizeLike ? 'Größe' : 'Sorte';
}

/* -------------------------------------------------------------------- Allergene */

function allergenShort(id) {
  const a = catalog.getAllergens().find((x) => x.id === id);
  return a ? a.short || a.name : String(id);
}

/** Variantenspezifische Zusatzinfo ohne den vorangestellten "vorläufig"-Hinweis. */
function variantNoteExtra(note) {
  const s = String(note || '').trim();
  if (!s) return '';
  return s.replace(/^vorläufig\s*[–-]\s*vom Inhaber anhand der Etiketten zu bestätigen\.?\s*/i, '').trim();
}

/** Allergen-Angaben einer Variante für die Anzeige. */
function variantAllergens(product, variant) {
  const a = (variant && variant.allergens) || {};
  const contains = asArray(a.contains).filter((id) => catalog.EU_ALLERGEN_IDS.includes(id));
  const mayContain = asArray(a.mayContain).filter((id) => catalog.EU_ALLERGEN_IDS.includes(id) && !contains.includes(id));
  return {
    sku: variant ? variant.sku : null,
    label: variant ? variant.label : '',
    contains,
    mayContain,
    containsLabels: contains.map(catalog.allergenLabel),
    mayContainLabels: mayContain.map(catalog.allergenLabel),
    extra: variantNoteExtra(a.note),
  };
}

/**
 * Allergen-Box der Produktseite.
 * → { confirmed, status, rows: [variantAllergens], uniform, isBundle, ref }
 */
function allergenBox(product) {
  const isBundle = product.type === 'bundle' && product.bundle && product.bundle.productSlug;
  const ref = isBundle ? catalog.getProduct(product.bundle.productSlug) : null;
  const source = ref || product;
  const rows = variantsOf(source).map((v) => variantAllergens(source, v));
  const sig = (r) => `${r.contains.join(',')}|${r.mayContain.join(',')}`;
  const uniform = rows.length <= 1 || rows.every((r) => sig(r) === sig(rows[0]) && r.extra === rows[0].extra);
  const confirmed = product.allergensConfirmed === true && (!ref || ref.allergensConfirmed === true);
  const bundleNote = isBundle ? variantNoteExtra(variantsOf(product)[0] && variantsOf(product)[0].allergens && variantsOf(product)[0].allergens.note) : '';
  return {
    confirmed,
    status: product.allergenStatus || VORLAEUFIG,
    rows,
    uniform,
    isBundle: Boolean(isBundle),
    bundleNote,
    union: catalog.productAllergens(product),
    unionContainsLabels: catalog.productAllergens(product).contains.map(catalog.allergenLabel),
    unionTraceLabels: catalog.productAllergens(product).mayContain.map(catalog.allergenLabel),
  };
}

/* ------------------------------------------------------------------- Karten */

/** Datenmodell einer Produktkarte (Raster, Startseite, Cross-Selling, Suche). */
function card(product) {
  const vs = availableVariants(product);
  const isBundle = product.type === 'bundle';
  const range = priceRange(product);
  const photos = product.photos || {};
  const al = catalog.productAllergens(product);
  return {
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle || '',
    short: product.short || '',
    href: `/produkt/${product.slug}`,
    category: product.category,
    categoryName: categoryName(product.category),
    badge: asArray(product.badges)[0] || '',
    priceLabel: priceLabel(product),
    minCents: range.min,
    maxCents: range.max,
    basePriceLabel: basePriceLabel(product),
    photoA: photo(photos.packshot, { id: 'S-Pxx-A', ratio: '4:5' }),
    photoB: photo(photos.detail, { id: 'S-Pxx-B', ratio: '4:5' }),
    available: vs.length > 0,
    isBundle,
    variantCount: vs.length,
    /* Direkt in den Warenkorb nur bei genau einer verfügbaren Variante und ohne Bundle-Auswahl */
    directSku: !isBundle && vs.length === 1 ? vs[0].sku : null,
    chooseLabel: choiceLabel(product) === 'Größe' ? 'Größe wählen' : 'Sorte wählen',
    contains: al.contains,
    mayContain: al.mayContain,
    sort: product.sort ?? 99,
    featured: product.featured === true,
  };
}

/* -------------------------------------------------------------------- Filter */

const PRICE_KEYS = ['bis5', '5bis10', 'ueber10'];

/** Preisbereiche aus catalog.json (filters[type=price]) mit festen URL-Schlüsseln. */
function priceRanges() {
  const f = asArray(catalog.getCatalog().filters).find((x) => x && x.type === 'price');
  const opts = asArray(f && f.options);
  const defaults = [
    { label: 'bis 5 €', minCents: 0, maxCents: 499 },
    { label: '5 – 10 €', minCents: 500, maxCents: 1000 },
    { label: 'über 10 €', minCents: 1001, maxCents: null },
  ];
  return PRICE_KEYS.map((key, i) => {
    const o = opts[i] || defaults[i];
    return { key, label: o.label, min: Number(o.minCents) || 0, max: o.maxCents === null || o.maxCents === undefined ? null : Number(o.maxCents) };
  });
}

function inRange(cents, r) {
  return cents >= r.min && (r.max === null || cents <= r.max);
}

function productMatchesPrice(product, keys, ranges) {
  if (!keys.length) return true;
  const prices = variantsOf(product).map((v) => v.priceCents);
  return ranges.filter((r) => keys.includes(r.key)).some((r) => prices.some((p) => inRange(p, r)));
}

function productMatchesAllergens(product, exclude, traces) {
  if (!exclude.length) return true;
  const a = catalog.productAllergens(product);
  const hits = traces ? [...a.contains, ...a.mayContain] : a.contains;
  return !hits.some((id) => exclude.includes(id));
}

function toList(v) {
  if (v === undefined || v === null) return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
}

const SORTS = [
  { key: 'empfohlen', label: 'Beliebtheit' },
  { key: 'preis-auf', label: 'Preis aufsteigend' },
  { key: 'preis-ab', label: 'Preis absteigend' },
  { key: 'name', label: 'Name A–Z' },
];

/** Liest die Filter aus der Query (GET-Formular, funktioniert ohne JavaScript). */
function parseFilters(query, products) {
  const allergenIds = catalog.EU_ALLERGEN_IDS;
  const ohne = [...new Set(toList(query.ohne).filter((id) => allergenIds.includes(id)))];
  const preis = [...new Set(toList(query.preis).filter((k) => PRICE_KEYS.includes(k)))];
  const slugs = new Set(products.map((p) => p.slug));
  const produkt = [...new Set(toList(query.produkt).filter((s) => slugs.has(s)))];
  const spuren = query.spuren === '1' || query.spuren === 'on';
  const sortierung = SORTS.some((s) => s.key === query.sortierung) ? query.sortierung : 'empfohlen';
  return { ohne, preis, produkt, spuren, sortierung };
}

function applyFilters(products, f, ranges, skip) {
  return products.filter(
    (p) =>
      (skip === 'ohne' || productMatchesAllergens(p, f.ohne, f.spuren)) &&
      (skip === 'preis' || productMatchesPrice(p, f.preis, ranges)) &&
      (skip === 'produkt' || !f.produkt.length || f.produkt.includes(p.slug))
  );
}

function sortProducts(list, key) {
  const out = [...list];
  const minP = (p) => priceRange(p).min ?? 0;
  if (key === 'preis-auf') out.sort((a, b) => minP(a) - minP(b) || a.name.localeCompare(b.name, 'de'));
  else if (key === 'preis-ab') out.sort((a, b) => minP(b) - minP(a) || a.name.localeCompare(b.name, 'de'));
  else if (key === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  else out.sort((a, b) => (b.featured === true) - (a.featured === true) || (a.sort ?? 99) - (b.sort ?? 99));
  return out;
}

/** Baut eine Query-URL für einen Filterzustand (für "Filter entfernen"-Chips). */
function filterUrl(basePath, f) {
  const params = new URLSearchParams();
  for (const id of f.ohne) params.append('ohne', id);
  if (f.spuren) params.append('spuren', '1');
  for (const k of f.preis) params.append('preis', k);
  for (const s of f.produkt) params.append('produkt', s);
  if (f.sortierung && f.sortierung !== 'empfohlen') params.append('sortierung', f.sortierung);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Vollständiges Filter-Modell einer Produktliste (Kategorie bzw. Gesamtsortiment).
 * Zähler je Option berücksichtigen alle übrigen aktiven Gruppen.
 */
function filterModel(products, query, basePath) {
  const ranges = priceRanges();
  const f = parseFilters(query, products);
  const results = sortProducts(applyFilters(products, f, ranges), f.sortierung);

  const baseOhne = applyFilters(products, f, ranges, 'ohne');
  // Nur Allergene anbieten, die im Sortiment tatsächlich angegeben sind (sonst würde „Ohne Gluten“
  // bei vorläufigen Angaben eine Allergenfreiheit suggerieren). Über die URL bleiben alle 14 nutzbar.
  const present = new Set();
  for (const p of catalog.getProducts()) {
    const a = catalog.productAllergens(p);
    a.contains.forEach((id) => present.add(id));
    a.mayContain.forEach((id) => present.add(id));
  }
  const allergenOptions = catalog.getAllergens().filter((a) => present.has(a.id) || f.ohne.includes(a.id)).map((a) => {
    const checked = f.ohne.includes(a.id);
    const ex = checked ? f.ohne : [...f.ohne, a.id];
    const count = baseOhne.filter((p) => productMatchesAllergens(p, ex, f.spuren)).length;
    return { value: a.id, label: `Ohne ${a.short || a.name}`, title: a.name, checked, count, disabled: !checked && count === 0 };
  });

  const basePreis = applyFilters(products, f, ranges, 'preis');
  const priceOptions = ranges
    .map((r) => {
      const count = basePreis.filter((p) => productMatchesPrice(p, [r.key], ranges)).length;
      const any = products.some((p) => productMatchesPrice(p, [r.key], ranges));
      return { value: r.key, label: r.label, checked: f.preis.includes(r.key), count, disabled: !f.preis.includes(r.key) && count === 0, any };
    })
    .filter((o) => o.any || o.checked);

  const baseProdukt = applyFilters(products, f, ranges, 'produkt');
  const productOptions =
    products.length > 1
      ? products.map((p) => ({
          value: p.slug,
          label: p.name,
          checked: f.produkt.includes(p.slug),
          count: baseProdukt.filter((x) => x.slug === p.slug).length,
          disabled: false,
        }))
      : [];

  const chips = [];
  for (const id of f.ohne) chips.push({ label: `Ohne ${allergenShort(id)}`, href: filterUrl(basePath, { ...f, ohne: f.ohne.filter((x) => x !== id) }) });
  if (f.spuren && f.ohne.length) chips.push({ label: 'Inkl. Spurenhinweise', href: filterUrl(basePath, { ...f, spuren: false }) });
  for (const k of f.preis) {
    const r = ranges.find((x) => x.key === k);
    chips.push({ label: r ? r.label : k, href: filterUrl(basePath, { ...f, preis: f.preis.filter((x) => x !== k) }) });
  }
  for (const s of f.produkt) {
    const p = products.find((x) => x.slug === s);
    chips.push({ label: p ? p.name : s, href: filterUrl(basePath, { ...f, produkt: f.produkt.filter((x) => x !== s) }) });
  }
  const activeCount = f.ohne.length + f.preis.length + f.produkt.length;

  return {
    filters: f,
    results,
    cards: results.map(card),
    total: products.length,
    count: results.length,
    allergenOptions,
    priceOptions,
    productOptions,
    sorts: SORTS,
    chips,
    activeCount,
    resetUrl: basePath,
    filtered: activeCount > 0 || f.spuren,
  };
}

/* --------------------------------------------------------------------- Suche */

const FOLD = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ç: 'c', Ç: 'c', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u', ä: 'a', Ä: 'a', ß: 'ss', â: 'a', î: 'i', û: 'u' };

/**
 * Normalisiert für die Suche (Kleinschreibung, türkische/deutsche Sonderzeichen gleichgesetzt:
 * "tursu" findet "Turşu", "ozu" findet "Özü"). Liefert zusätzlich die Zuordnung
 * normalisierter Index → Originalindex für die Hervorhebung.
 */
function fold(str) {
  const s = String(str || '');
  let out = '';
  const map = [];
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    let rep = FOLD[ch];
    if (rep === undefined) {
      rep = ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    for (let k = 0; k < rep.length; k += 1) {
      out += rep[k];
      map.push(i);
    }
  }
  return { text: out, map };
}

function searchTerms(q) {
  return fold(q)
    .text.replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1)
    .slice(0, 6);
}

/** Zerlegt einen Text in Abschnitte [{ text, hit }] – die Templates escapen jeden Abschnitt. */
function highlight(text, terms) {
  const s = String(text || '');
  if (!terms.length || !s) return [{ text: s, hit: false }];
  const { text: folded, map } = fold(s);
  const marks = new Array(s.length).fill(false);
  for (const t of terms) {
    if (!t) continue;
    let idx = folded.indexOf(t);
    while (idx !== -1) {
      const start = map[idx];
      const end = map[Math.min(idx + t.length - 1, map.length - 1)];
      for (let i = start; i <= end; i += 1) marks[i] = true;
      idx = folded.indexOf(t, idx + t.length);
    }
  }
  const parts = [];
  for (let i = 0; i < s.length; i += 1) {
    const last = parts[parts.length - 1];
    if (last && last.hit === marks[i]) last.text += s[i];
    else parts.push({ text: s[i], hit: marks[i] });
  }
  return parts;
}

/**
 * Serverseitige Suche über Name, türkischen Namen, Untertitel, Kurztext, Sorten, Tags und Kategorie.
 * Alle Suchbegriffe müssen vorkommen (UND). → [{ product, card, score, nameParts, subParts }]
 */
function search(q) {
  const terms = searchTerms(q);
  if (!terms.length) return { terms, results: [] };
  const results = [];
  for (const p of catalog.getProducts()) {
    const name = fold(p.name).text;
    const fields = [
      p.name,
      p.nameTr,
      p.subtitle,
      p.short,
      ...variantsOf(p).map((v) => v.label),
      ...asArray(p.tags),
      categoryName(p.category),
    ]
      .map((x) => fold(x).text)
      .join(' \u0001 ');
    if (!terms.every((t) => fields.includes(t))) continue;
    let score = 0;
    for (const t of terms) {
      if (name.startsWith(t)) score += 6;
      else if (name.includes(t)) score += 4;
      else if (fold(p.subtitle).text.includes(t)) score += 2;
      else score += 1;
    }
    results.push({
      product: p,
      card: card(p),
      score,
      nameParts: highlight(p.name, terms),
      subParts: highlight(p.subtitle, terms),
      shortParts: highlight(p.short, terms),
    });
  }
  results.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'de'));
  return { terms, results };
}

module.exports = {
  photoSrc,
  VORLAEUFIG,
  variantsOf,
  availableVariants,
  isAvailable,
  sortedCategories,
  categoryName,
  priceRange,
  priceLabel,
  basePrice,
  basePriceLabel,
  photo,
  ratioCss,
  choiceLabel,
  allergenShort,
  variantAllergens,
  allergenBox,
  card,
  priceRanges,
  parseFilters,
  filterModel,
  filterUrl,
  sortProducts,
  fold,
  searchTerms,
  highlight,
  search,
  SORTS,
};
