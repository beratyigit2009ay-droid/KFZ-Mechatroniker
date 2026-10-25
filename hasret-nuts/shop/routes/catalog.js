'use strict';
/**
 * Owner: BUILD-SHOP
 * Katalog: /kategorie/:slug , /produkt/:slug , /suche?q=
 * Filter und Sortierung laufen serverseitig über GET-Parameter (ohne JavaScript nutzbar);
 * shop.js lädt die Ergebnisse bei Änderungen ohne Seitenneuladen nach.
 */
const express = require('express');
const catalog = require('../../shared/catalog');
const { buildMeta } = require('../../shared/seo');
const { noIndex } = require('../../shared/security');
const { formatEuro } = require('../../shared/views');
const view = require('../lib/catalog-view');
const jsonld = require('../lib/jsonld');

const router = express.Router();
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/* ------------------------------------------------------------------ Kategorie */
router.get('/kategorie/:slug', (req, res, next) => {
  const slug = String(req.params.slug || '');
  const category = SLUG_RE.test(slug) ? catalog.getCategory(slug) : null;
  if (!category) return next();
  const basePath = `/kategorie/${category.slug}`;
  const products = catalog.getProducts({ category: category.slug });
  const model = view.filterModel(products, req.query, basePath);
  const hasQuery = Object.keys(req.query).length > 0;
  const meta = buildMeta(
    {
      title: category.seoTitle || category.name,
      description: category.seoDescription || category.text,
      path: basePath,
      image: undefined,
      // Gefilterte Varianten nicht indexieren (Canonical bleibt die Kategorie)
      noindex: hasQuery,
    },
    req
  );
  res.render('catalog/category.njk', {
    meta,
    category,
    banner: view.photo(category.banner, { id: 'S-K', ratio: '16:9' }),
    model,
    basePath,
    categories: view.sortedCategories(),
    breadcrumbs: [
      { name: 'Startseite', href: '/' },
      { name: category.name, href: basePath },
    ],
    breadcrumbLd: jsonld.breadcrumbs([
      { name: 'Startseite', href: '/' },
      { name: category.name, href: basePath },
    ]),
    collectionLd: jsonld.collection(category, products, basePath),
  });
});

/* -------------------------------------------------------------------- Produkt */
function productModel(product) {
  const variants = view.variantsOf(product);
  const available = view.availableVariants(product);
  const selected = available[0] || variants[0] || null;
  const photos = product.photos || {};
  const gallery = [
    { key: 'A', short: 'Packshot', ...view.photo(photos.packshot, { id: 'S-Pxx-A' }) },
    { key: 'B', short: 'Detail', ...view.photo(photos.detail, { id: 'S-Pxx-B' }) },
    ...(Array.isArray(photos.gallery) ? photos.gallery : []).map((g, i) => ({
      key: `G${i + 1}`,
      short: ['Geöffnet', 'Größe', 'Genuss'][i] || `Bild ${i + 3}`,
      ...view.photo(g, { id: `S-Pxx-G${i + 1}` }),
    })),
  ];
  // Detailbild B ist auf der Karte dekorativ – in der Galerie bekommt es einen Alternativtext.
  if (gallery[1] && !gallery[1].alt) gallery[1].alt = `${product.name} – Detailansicht`;
  const variantPhotos = variants
    .filter((v) => v.photo)
    .map((v) => ({ sku: v.sku, key: `V-${v.sku}`, short: v.label, ...view.photo(v.photo, { id: 'S-Pxx-V' }) }));
  const vModels = variants.map((v) => {
    const bp = view.basePrice(product, v);
    return {
      sku: v.sku,
      label: v.label,
      size: v.size || '',
      priceCents: v.priceCents,
      price: formatEuro(v.priceCents),
      basePrice: bp.text,
      available: view.isAvailable(v),
      photoKey: v.photo ? `V-${v.sku}` : 'A',
      allergens: view.variantAllergens(product, v),
    };
  });
  let bundle = null;
  if (product.type === 'bundle' && product.bundle) {
    const ref = catalog.getProduct(product.bundle.productSlug);
    const flavours = ref
      ? view.availableVariants(ref).map((v) => ({ sku: v.sku, label: v.label, priceCents: v.priceCents, price: formatEuro(v.priceCents) }))
      : [];
    const count = product.bundle.count || 3;
    const prices = flavours.map((f) => f.priceCents);
    const minSingle = prices.length ? Math.min(...prices) * count : 0;
    const maxSingle = prices.length ? Math.max(...prices) * count : 0;
    bundle = {
      count,
      slots: Array.from({ length: count }, (_, i) => ({
        index: i + 1,
        label: String(product.bundle.selectLabel || 'Sorte für Packung {n}').replace('{n}', String(i + 1)),
      })),
      hint: product.bundle.hint || `Wählen Sie für jede der ${count} Packungen eine Sorte – auch mehrfach dieselbe.`,
      flavours,
      priceCents: selected ? selected.priceCents : product.bundle.priceCents,
      saveMin: Math.max(0, minSingle - (selected ? selected.priceCents : 0)),
      saveMax: Math.max(0, maxSingle - (selected ? selected.priceCents : 0)),
      ref,
    };
  }
  const crossSell = (Array.isArray(product.pairsWith) ? product.pairsWith : [])
    .map((s) => catalog.getProduct(s))
    .filter((p) => p && p.slug !== product.slug)
    .slice(0, 4)
    .map(view.card);
  return {
    product,
    card: view.card(product),
    variants: vModels,
    selected: selected ? vModels.find((v) => v.sku === selected.sku) : null,
    hasChoice: vModels.length > 1,
    choiceLabel: view.choiceLabel(product),
    gallery,
    variantPhotos,
    bundle,
    allergen: view.allergenBox(product),
    crossSell,
    available: available.length > 0,
    descriptionParas: Array.isArray(product.description) ? product.description : [product.description || product.short || ''],
    category: catalog.getCategory(product.category),
  };
}

router.get('/produkt/:slug', (req, res, next) => {
  const slug = String(req.params.slug || '');
  const product = SLUG_RE.test(slug) ? catalog.getProduct(slug) : null;
  if (!product) return next();
  const m = productModel(product);
  const path = `/produkt/${product.slug}`;
  const crumbs = [{ name: 'Startseite', href: '/' }];
  if (m.category) crumbs.push({ name: m.category.name, href: `/kategorie/${m.category.slug}` });
  crumbs.push({ name: product.name, href: path });
  res.render('catalog/product.njk', {
    meta: buildMeta(
      {
        title: (product.seo && product.seo.title) || product.name,
        description: (product.seo && product.seo.description) || product.short,
        path,
        type: 'product',
      },
      req
    ),
    m,
    breadcrumbs: crumbs,
    productLd: jsonld.product(product),
    breadcrumbLd: jsonld.breadcrumbs(crumbs),
  });
});

/* ---------------------------------------------------------------------- Suche */
router.get('/suche', noIndex, (req, res) => {
  const raw = typeof req.query.q === 'string' ? req.query.q : '';
  const q = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 100);
  const { results } = q ? view.search(q) : { results: [] };
  const wantsJson = (req.get('accept') || '').includes('application/json') && !(req.get('accept') || '').includes('text/html');
  if (wantsJson) {
    res.set('Cache-Control', 'no-store');
    return res.json({
      q,
      count: results.length,
      results: results.slice(0, 8).map((r) => ({
        name: r.product.name,
        subtitle: r.product.subtitle || '',
        href: r.card.href,
        category: r.card.categoryName,
        price: r.card.priceLabel,
        photo: r.card.photoA.id,
      })),
    });
  }
  res.locals.searchQuery = q;
  res.render('catalog/search.njk', {
    meta: buildMeta({ title: q ? `Suche: ${q}` : 'Suche', noindex: true, path: '/suche', description: 'Produktsuche im Hasret Nuts Shop.' }, req),
    q,
    results,
    tiles: view.sortedCategories().map((c) => ({
      slug: c.slug,
      name: c.name,
      claim: (c.tile && c.tile.claim) || c.lead || '',
      href: `/kategorie/${c.slug}`,
      photo: view.photo(c.tile && c.tile.photo, { id: 'S-T', ratio: '4:5' }),
    })),
    breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: 'Suche', href: '/suche' }],
  });
});

module.exports = router;
