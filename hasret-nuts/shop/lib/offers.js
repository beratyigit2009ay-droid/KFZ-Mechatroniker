'use strict';
/**
 * Owner: BUILD-SHOP · Angebote (offers.json) für Startseite und /angebote.
 * Nur Codes mit public:true werden angezeigt (SEHNSUCHT15 bleibt Newsletter-exklusiv).
 * Existiert der Code bereits in der Datenbank (npm run seed), gelten dessen aktuelle Werte:
 * inaktive, abgelaufene oder ausgeschöpfte Codes werden ausgeblendet.
 */
const catalog = require('../../shared/catalog');
const { getDb, nowIso } = require('../../shared/db');
const { formatEuro, formatDate } = require('../../shared/views');
const view = require('./catalog-view');

function dbRow(code) {
  try {
    return getDb().prepare('SELECT * FROM discount_codes WHERE code = ?').get(code) || null;
  } catch {
    return null;
  }
}

function valueLabel(type, value) {
  return type === 'percent' ? `${value} %` : formatEuro(value);
}

/** Öffentliche Rabattcodes als Coupon-Modelle. */
function publicCodes() {
  const now = nowIso();
  const out = [];
  for (const c of catalog.getOffers().codes) {
    if (!c || c.public !== true || !c.code) continue;
    const row = dbRow(c.code);
    if (row) {
      if (row.active !== 1) continue;
      if (row.ends_at && row.ends_at <= now) continue;
      if (row.starts_at && row.starts_at > now) continue;
      if (row.max_uses !== null && row.uses >= row.max_uses) continue;
    }
    const type = row ? row.type : c.type;
    const value = row ? row.value : c.value;
    const min = row ? row.min_subtotal_cents : c.minSubtotalCents || 0;
    const endsAt = row ? row.ends_at : c.endsAt;
    const conditions = [];
    if (min > 0) conditions.push(`Mindestbestellwert ${formatEuro(min)} (Warenwert vor Rabatt)`);
    if ((row ? row.once_per_email === 1 : c.oncePerEmail)) conditions.push('Einmal pro E-Mail-Adresse einlösbar');
    conditions.push(endsAt ? `Gültig bis ${formatDate(endsAt, 'long')}` : /\[DATUM\]/.test(c.conditions || '') ? 'Gültig bis [DATUM]' : 'Unbefristet gültig – bis auf Widerruf');
    conditions.push('Nicht mit anderen Codes kombinierbar');
    out.push({
      code: row ? row.code : c.code,
      label: c.label || valueLabel(type, value),
      value: valueLabel(type, value),
      type,
      headline: c.headline || '',
      text: c.text || '',
      description: c.description || '',
      conditions,
      seeded: Boolean(row),
      minLabel: min > 0 ? `ab ${formatEuro(min)} Warenwert` : '',
    });
  }
  return out;
}

/** Messe-Bundle mit Preis und Ersparnis-Spanne aus dem Katalog (nie fest im Text). */
function bundleOffer() {
  const b = catalog.getOffers().bundles.find((x) => x && x.sku) || null;
  const sku = b ? b.sku : 'sarma-lokum-messe-bundle';
  const hit = catalog.getVariant(sku);
  if (!hit) return null;
  const { product, variant } = hit;
  const ref = product.bundle && catalog.getProduct(product.bundle.productSlug);
  const count = (product.bundle && product.bundle.count) || 3;
  const flavourPrices = ref ? view.availableVariants(ref).map((v) => v.priceCents) : [];
  const minSingle = flavourPrices.length ? Math.min(...flavourPrices) * count : null;
  const maxSingle = flavourPrices.length ? Math.max(...flavourPrices) * count : null;
  const saveMin = minSingle !== null ? Math.max(0, minSingle - variant.priceCents) : null;
  const saveMax = maxSingle !== null ? Math.max(0, maxSingle - variant.priceCents) : null;
  return {
    sku,
    slug: product.slug,
    href: `/produkt/${product.slug}`,
    name: product.name,
    count,
    priceCents: variant.priceCents,
    price: formatEuro(variant.priceCents),
    flavours: ref ? view.availableVariants(ref).map((v) => v.label) : [],
    saveMin,
    saveMax,
    savingsText:
      saveMax && saveMax > 0
        ? saveMin === saveMax
          ? `Sie sparen ${formatEuro(saveMax)} gegenüber dem Einzelkauf.`
          : `Je nach Auswahl sparen Sie ${formatEuro(saveMin)} bis ${formatEuro(saveMax)} gegenüber dem Einzelkauf.`
        : '',
    headline: (b && b.headline) || 'Drei Sorten. Ein Preis.',
    text: (b && b.text) || '',
    cta: (b && b.cta) || { label: 'Trio zusammenstellen', href: `/produkt/${product.slug}` },
  };
}

/** Angebots-Banner je Platzierung ('home' | 'angebote'). */
function banners(placement) {
  return catalog
    .getOffers()
    .banners.filter((b) => b && Array.isArray(b.placement) && b.placement.includes(placement))
    .sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99))
    .map((b) => {
      const priceHit = b.priceSku ? catalog.getVariant(b.priceSku) : null;
      const code = b.code ? publicCodes().find((c) => c.code.toUpperCase() === String(b.code).toUpperCase()) : null;
      return {
        id: b.id,
        theme: b.theme === 'chocolate' ? 'chocolate' : 'cream',
        eyebrow: b.eyebrow || '',
        headline: b.headline || '',
        text: b.text || '',
        price: priceHit ? formatEuro(priceHit.variant.priceCents) : null,
        priceNote: priceHit && priceHit.variant.size ? priceHit.variant.label : null,
        code: code ? code.code : null,
        hidden: Boolean(b.code) && !code,
        cta: b.cta || null,
        photo: view.photo(b.photo, { id: 'S-A', ratio: '4:3' }),
      };
    })
    .filter((b) => !b.hidden);
}

function terms() {
  const meta = catalog.getOffers()._meta;
  return (
    (meta && meta.terms) ||
    'Ein Rabattcode pro Bestellung, nicht mit anderen Codes kombinierbar. Der Mindestbestellwert bezieht sich auf den Warenwert vor Abzug des Rabatts und ohne Versandkosten. Keine Barauszahlung. Rabattcodes gelten auch für das Messe-Bundle.'
  );
}

module.exports = { publicCodes, bundleOffer, banners, terms };
