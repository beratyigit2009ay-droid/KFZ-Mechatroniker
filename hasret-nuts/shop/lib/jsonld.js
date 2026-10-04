'use strict';
/**
 * Owner: BUILD-SHOP · Strukturierte Daten (schema.org, JSON-LD).
 * Ausgabe im Template ausschließlich über den Filter "jsonld" (escaped <, >, &, U+2028/9).
 * Keine Platzhalter und keine erfundenen Werte (keine Bewertungen, keine Adresse, solange offen).
 */
const config = require('../../shared/config');
const view = require('./catalog-view');

function base() {
  return config.apps.shop.baseUrl;
}

function abs(p) {
  return `${base()}${p.startsWith('/') ? p : `/${p}`}`;
}

function euros(cents) {
  return (cents / 100).toFixed(2);
}

/** OnlineStore (Organization-Untertyp) + WebSite – auf allen Shop-Seiten. */
function store() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': abs('/#store'),
        name: 'Hasret Nuts Shop',
        alternateName: ['Hasret Kuruyemiş', 'Hasret Nuts'],
        url: abs('/'),
        logo: abs('/assets/logo/hasret-logo.svg'),
        image: abs('/assets/logo/og-default.png'),
        description:
          'Online-Shop von Hasret Nuts aus Memmingen: Sarma Lokum, hausgemachte Feinkost, Maulbeer-Extrakt, Nüsse und Knabberzeug – als unverbindliche Bestellanfrage.',
        founder: { '@type': 'Person', name: 'Eyyüp Koca' },
        areaServed: 'DE',
        sameAs: [config.apps.corporate.baseUrl],
      },
      {
        '@type': 'WebSite',
        '@id': abs('/#website'),
        url: abs('/'),
        name: 'Hasret Nuts Shop',
        inLanguage: 'de-DE',
        publisher: { '@id': abs('/#store') },
      },
    ],
  };
}

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.href),
    })),
  };
}

/** Product mit Offer (eine Variante) bzw. AggregateOffer + Einzelangeboten (mehrere Varianten). */
function product(p) {
  const vs = view.variantsOf(p);
  const url = abs(`/produkt/${p.slug}`);
  const availability = (v) => (view.isAvailable(v) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock');
  const offerFor = (v) => ({
    '@type': 'Offer',
    sku: v.sku,
    name: vs.length > 1 ? `${p.name} – ${v.label}` : p.name,
    price: euros(v.priceCents),
    priceCurrency: 'EUR',
    availability: availability(v),
    itemCondition: 'https://schema.org/NewCondition',
    url,
    seller: { '@id': abs('/#store') },
  });
  const description = Array.isArray(p.description) && p.description.length ? p.description.join(' ') : p.short || '';
  const out = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description,
    url,
    image: [abs('/assets/logo/og-default.png')],
    category: view.categoryName(p.category),
    sku: vs.length === 1 ? vs[0].sku : p.slug,
  };
  if (vs.length === 1) {
    out.offers = offerFor(vs[0]);
  } else if (vs.length > 1) {
    const prices = vs.map((v) => v.priceCents);
    out.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: euros(Math.min(...prices)),
      highPrice: euros(Math.max(...prices)),
      offerCount: vs.length,
      availability: vs.some(view.isAvailable) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      offers: vs.map(offerFor),
    };
  }
  return out;
}

/** CollectionPage + ItemList für Kategorien. */
function collection(category, products, pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.seoDescription || category.text || '',
    url: abs(pathName),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`/produkt/${p.slug}`), name: p.name })),
    },
  };
}

module.exports = { store, breadcrumbs, product, collection, abs };
