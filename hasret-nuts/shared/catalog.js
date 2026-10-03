'use strict';
/**
 * Produktkatalog (FOUNDATION-CORE) – liest shared/data/catalog.json, allergens.json, offers.json
 * (Pfade über CATALOG_PATH / ALLERGENS_PATH / OFFERS_PATH änderbar, z. B. für Tests).
 *
 * WICHTIG: Preise NIEMALS vom Client übernehmen – immer priceCentsFor(sku) / getVariant(sku) nutzen.
 *
 *   getCatalog()                         → { currency, categories, products }
 *   getCategories() / getCategory(slug)  → Kategorie(n) | null
 *   getProducts({ category, excludeAllergens, includeTraces, featured })
 *   getProduct(slug)                     → Produkt | null
 *   getVariant(sku)                      → { product, variant } | null
 *   priceCentsFor(sku)                   → Integer-Cent | null
 *   getAllergens() / allergenLabel(id)   → Liste bzw. Name ("Schalenfrüchte")
 *   productAllergens(product)            → { contains: [id], mayContain: [id] } (Vereinigung über Varianten)
 *   validateBundleSelection(sku, skus)   → { ok, error?, items: [{ product, variant }] }
 *   getOffers()                          → offers.json ({ codes, bundles, banners })
 *   formatEuro(cents)                    → "8,00 €"
 */
const fs = require('node:fs');
const config = require('./config');
const { formatEuro } = require('./views');

const EU_ALLERGEN_IDS = [
  'gluten', 'krebstiere', 'eier', 'fisch', 'erdnuesse', 'soja', 'milch',
  'schalenfruechte', 'sellerie', 'senf', 'sesam', 'sulfite', 'lupinen', 'weichtiere',
];

let cache = null; // { catalog, allergens, offers, bySlug, bySku, categoriesBySlug, paths }

function readJson(file, fallback) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { value: fallback, missing: true };
    throw err;
  }
  try {
    return { value: JSON.parse(raw), missing: false };
  } catch (err) {
    throw new Error(`Katalogdatei ${file} enthält ungültiges JSON: ${err.message}`);
  }
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function buildIndex() {
  const paths = { ...config.data };
  const cat = readJson(paths.catalogPath, { currency: 'EUR', categories: [], products: [] });
  const all = readJson(paths.allergensPath, []);
  const off = readJson(paths.offersPath, { codes: [], bundles: [], banners: [] });

  const catalog = {
    currency: cat.value.currency || 'EUR',
    categories: asArray(cat.value.categories),
    products: asArray(cat.value.products),
  };
  const bySlug = new Map();
  const bySku = new Map();
  const categoriesBySlug = new Map();
  for (const c of catalog.categories) categoriesBySlug.set(c.slug, c);
  for (const p of catalog.products) {
    if (!p || !p.slug) continue;
    if (bySlug.has(p.slug)) console.warn(`[catalog] doppelter Produkt-Slug: ${p.slug}`);
    bySlug.set(p.slug, p);
    let variants = asArray(p.variants);
    if (variants.length === 0 && p.type === 'bundle' && p.bundle && Number.isInteger(p.bundle.priceCents)) {
      variants = [{ sku: p.slug, label: p.name, priceCents: p.bundle.priceCents, allergens: { contains: [], mayContain: [] } }];
      p.variants = variants;
    }
    for (const v of variants) {
      if (!v || !v.sku) continue;
      if (!Number.isInteger(v.priceCents) || v.priceCents < 0) {
        console.warn(`[catalog] ungültiger Preis für SKU ${v.sku} – Variante wird ignoriert.`);
        continue;
      }
      if (bySku.has(v.sku)) console.warn(`[catalog] doppelte SKU: ${v.sku}`);
      bySku.set(v.sku, { product: p, variant: v });
    }
  }
  const allergens = asArray(all.value).filter((a) => a && a.id);
  const allergenById = new Map(allergens.map((a) => [a.id, a]));
  const offers = {
    codes: asArray(off.value && off.value.codes),
    bundles: asArray(off.value && off.value.bundles),
    banners: asArray(off.value && off.value.banners),
  };
  return {
    catalog,
    allergens,
    allergenById,
    offers,
    bySlug,
    bySku,
    categoriesBySlug,
    paths,
    complete: !cat.missing && !all.missing && !off.missing,
  };
}

function index() {
  const pathsChanged =
    cache &&
    (cache.paths.catalogPath !== config.data.catalogPath ||
      cache.paths.allergensPath !== config.data.allergensPath ||
      cache.paths.offersPath !== config.data.offersPath);
  // Fehlende Dateien werden nicht dauerhaft gecacht – sie dürfen später erscheinen.
  if (!cache || pathsChanged || !cache.complete) cache = buildIndex();
  return cache;
}

/** Erzwingt erneutes Einlesen (z. B. nach Änderung der JSON-Dateien im Betrieb oder in Tests). */
function reloadCatalog() {
  cache = null;
  return index();
}

function getCatalog() {
  return index().catalog;
}

function getCategories() {
  return index().catalog.categories;
}

function getCategory(slug) {
  return index().categoriesBySlug.get(String(slug)) || null;
}

function getProduct(slug) {
  return index().bySlug.get(String(slug)) || null;
}

function getVariant(sku) {
  return index().bySku.get(String(sku)) || null;
}

function priceCentsFor(sku) {
  const hit = getVariant(sku);
  return hit ? hit.variant.priceCents : null;
}

function getAllergens() {
  return index().allergens;
}

function allergenLabel(id) {
  const a = index().allergenById.get(id);
  return a ? a.name : String(id);
}

function uniq(list) {
  return [...new Set(list)];
}

/** Vereinigung der Allergene über alle Varianten (bei Bundles inkl. des Bezugsprodukts). */
function productAllergens(product) {
  if (!product) return { contains: [], mayContain: [] };
  const contains = [];
  const mayContain = [];
  const collect = (p) => {
    for (const v of asArray(p.variants)) {
      const a = v && v.allergens;
      if (!a) continue;
      contains.push(...asArray(a.contains));
      mayContain.push(...asArray(a.mayContain));
    }
  };
  collect(product);
  if (product.type === 'bundle' && product.bundle && product.bundle.productSlug) {
    const ref = getProduct(product.bundle.productSlug);
    if (ref && ref !== product) collect(ref);
  }
  const c = uniq(contains);
  return { contains: c, mayContain: uniq(mayContain).filter((id) => !c.includes(id)) };
}

/**
 * Produktliste mit Filtern.
 *   category          Kategorie-Slug
 *   excludeAllergens  Array oder kommagetrennter String von Allergen-IDs; Produkte, die eines davon
 *                     ENTHALTEN, werden ausgeblendet
 *   includeTraces     true → auch "kann Spuren enthalten" ausblenden
 *   featured          true → nur hervorgehobene Produkte
 */
function getProducts({ category, excludeAllergens, includeTraces = false, featured } = {}) {
  let list = index().catalog.products.filter((p) => p && p.slug);
  if (category) list = list.filter((p) => p.category === category);
  if (featured === true) list = list.filter((p) => p.featured === true);
  let exclude = excludeAllergens;
  if (typeof exclude === 'string') exclude = exclude.split(',');
  exclude = asArray(exclude)
    .map((s) => String(s).trim())
    .filter((s) => EU_ALLERGEN_IDS.includes(s));
  if (exclude.length) {
    list = list.filter((p) => {
      const a = productAllergens(p);
      const hits = includeTraces ? [...a.contains, ...a.mayContain] : a.contains;
      return !hits.some((id) => exclude.includes(id));
    });
  }
  return list;
}

/**
 * Prüft eine Bundle-Auswahl (z. B. Messe-Bundle: 3 frei kombinierbare Sarma-Lokum-Packungen).
 *   validateBundleSelection('sarma-lokum-messe-bundle', ['sku-a', 'sku-b', 'sku-a'])
 * → { ok: true, product, variant, items: [{ product, variant }] } | { ok: false, error: 'deutsche Meldung' }
 */
function validateBundleSelection(bundleSku, skus) {
  const hit = getVariant(bundleSku);
  if (!hit || hit.product.type !== 'bundle' || !hit.product.bundle) return { ok: false, error: 'Dieses Angebot ist nicht verfügbar.' };
  const { productSlug, count } = hit.product.bundle;
  const list = asArray(skus).map(String);
  if (list.length !== count) return { ok: false, error: `Bitte wählen Sie genau ${count} Sorten bzw. Packungen aus.` };
  const items = [];
  for (const s of list) {
    const v = getVariant(s);
    if (!v || v.product.slug !== productSlug) return { ok: false, error: 'Mindestens eine gewählte Sorte ist für dieses Angebot nicht verfügbar.' };
    items.push(v);
  }
  return { ok: true, product: hit.product, variant: hit.variant, items };
}

function getOffers() {
  return index().offers;
}

module.exports = {
  getCatalog,
  getCategories,
  getCategory,
  getProducts,
  getProduct,
  getVariant,
  priceCentsFor,
  getAllergens,
  allergenLabel,
  productAllergens,
  validateBundleSelection,
  getOffers,
  reloadCatalog,
  formatEuro,
  EU_ALLERGEN_IDS,
};
