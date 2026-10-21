'use strict';
/**
 * Owner: BUILD-SHOP
 * Seiten: / , /angebote , /allergene , /impressum , /datenschutz , /agb , /widerruf , /versand-zahlung , /cookies.
 * Wird als ERSTER Shop-Router eingebunden – router.use() hier läuft für alle Shop-Seiten
 * (Header-Daten: Warenkorb-Zähler, Kategorien, strukturierte Daten des Shops).
 */
const express = require('express');
const config = require('../../shared/config');
const catalog = require('../../shared/catalog');
const { buildMeta } = require('../../shared/seo');
const view = require('../lib/catalog-view');
const cart = require('../lib/cart');
const offers = require('../lib/offers');
const jsonld = require('../lib/jsonld');

const router = express.Router();

/* Gemeinsame Template-Daten für jede Shop-Seite (auch Konto/Verwaltung). */
router.use((req, res, next) => {
  res.locals.navCategories = view.sortedCategories();
  res.locals.cartCount = cart.countItems(req.session && req.session.data ? req.session.data.cart : []);
  res.locals.storeJsonLd = jsonld.store();
  res.locals.draftMode = !config.isProd;
  res.locals.searchQuery = '';
  next();
});

function categoryTiles() {
  return view.sortedCategories().map((c) => ({
    slug: c.slug,
    name: c.name,
    claim: (c.tile && c.tile.claim) || c.lead || '',
    href: `/kategorie/${c.slug}`,
    photo: view.photo(c.tile && c.tile.photo, { id: 'S-T', ratio: '4:5' }),
  }));
}

/* ---------------------------------------------------------------- Startseite */
router.get('/', (req, res) => {
  const featured = view.sortProducts(catalog.getProducts({ featured: true }), 'empfohlen').map(view.card);
  res.render('pages/home.njk', {
    meta: buildMeta(
      {
        title: 'Hasret Nuts Shop – Sarma Lokum, Feinkost & Nüsse aus Memmingen',
        fullTitle: true,
        description:
          'Sarma Lokum in vier Sorten, hausgemachtes Turşu, Karadut Özü, Pistazien und Leblebi – persönlich ausgewählt in Memmingen. Jetzt unverbindlich bestellen.',
        path: '/',
      },
      req
    ),
    tiles: categoryTiles(),
    featured,
    bundle: offers.bundleOffer(),
    codes: offers.publicCodes(),
    banners: offers.banners('home'),
    corporatePhilosophie: `${config.apps.corporate.baseUrl}/philosophie`,
  });
});

/* ------------------------------------------------------------------ Angebote */
router.get('/angebote', (req, res) => {
  res.render('pages/angebote.njk', {
    meta: buildMeta(
      {
        title: 'Angebote & Rabattcodes',
        description:
          'Aktuelle Angebote bei Hasret Nuts: das Sarma-Lokum-Messe-Bundle mit drei Sorten zum Bundle-Preis, Willkommensrabatt und Messe-Gutschein – einfach im Warenkorb einlösen.',
        path: '/angebote',
      },
      req
    ),
    bundle: offers.bundleOffer(),
    codes: offers.publicCodes(),
    bundleBanner: offers.banners('angebote').find((b) => b.theme === 'chocolate') || null,
    otherBanners: offers.banners('angebote').filter((b) => b.theme !== 'chocolate'),
    terms: offers.terms(),
    breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: 'Angebote', href: '/angebote' }],
  });
});

/* ----------------------------------------------------------------- Allergene */
router.get('/allergene', (req, res) => {
  const allergens = catalog.getAllergens();
  const products = view.sortProducts(catalog.getProducts(), 'empfohlen').sort(
    (a, b) => view.sortedCategories().findIndex((c) => c.slug === a.category) - view.sortedCategories().findIndex((c) => c.slug === b.category)
  );
  const rows = [];
  for (const p of products) {
    const box = view.allergenBox(p);
    if (p.type === 'bundle') {
      rows.push({
        product: p,
        href: `/produkt/${p.slug}`,
        label: p.name,
        sub: 'je nach gewählten Sorten',
        contains: box.union.contains,
        mayContain: box.union.mayContain,
        confirmed: box.confirmed,
        extra: 'Enthält die Allergene der gewählten Sorten (siehe Premium Sarma Lokum).',
        first: true,
        span: 1,
      });
      continue;
    }
    const vs = view.variantsOf(p);
    vs.forEach((v, i) => {
      const a = view.variantAllergens(p, v);
      rows.push({
        product: p,
        href: `/produkt/${p.slug}`,
        label: p.name,
        sub: vs.length > 1 ? v.label : v.size || '',
        contains: a.contains,
        mayContain: a.mayContain,
        confirmed: p.allergensConfirmed === true,
        extra: a.extra,
        first: i === 0,
        span: vs.length,
      });
    });
  }

  // Filter „Produkte ohne …“ (GET, funktioniert ohne JavaScript)
  const ohne = [].concat(req.query.ohne || []).map(String).filter((id) => catalog.EU_ALLERGEN_IDS.includes(id));
  const spuren = req.query.spuren === '1';
  let filtered = null;
  if (ohne.length) {
    filtered = catalog.getProducts({ excludeAllergens: ohne, includeTraces: spuren }).map(view.card);
  }
  const allConfirmed = catalog.getProducts().every((p) => p.allergensConfirmed === true);
  res.render('pages/allergene.njk', {
    meta: buildMeta(
      {
        title: 'Allergene auf einen Blick',
        description:
          'Allergen-Übersicht des Hasret Nuts Shops: die 14 Hauptallergene nach LMIV Anhang II für jedes Produkt und jede Sorte – mit Filter „Produkte ohne …“.',
        path: '/allergene',
      },
      req
    ),
    allergens,
    rows,
    ohne,
    spuren,
    filtered,
    ohneLabels: ohne.map(view.allergenShort),
    allConfirmed,
    breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: 'Allergene', href: '/allergene' }],
  });
});

/* ------------------------------------------------------- Rechtliches & Service */
const LEGAL = {
  impressum: {
    title: 'Impressum',
    description: 'Impressum des Online-Shops von Hasret Nuts – Hasret Kuruyemiş, Inhaber Eyyüp Koca, Memmingen.',
  },
  datenschutz: {
    title: 'Datenschutzerklärung',
    description: 'Datenschutzerklärung des Hasret Nuts Shops: Bestellanfragen, Kundenkonto, Newsletter mit Double-Opt-in, Server-Logs und selbst gehostete Schriften.',
  },
  agb: {
    title: 'Allgemeine Geschäftsbedingungen',
    description: 'AGB des Hasret Nuts Shops: unverbindliche Bestellanfrage, Vertragsschluss erst mit der Bestätigung per E-Mail, Preise, Zahlung, Lieferung und Abholung.',
  },
  widerruf: {
    title: 'Widerrufsbelehrung',
    description: 'Widerrufsbelehrung des Hasret Nuts Shops mit Hinweisen zu Ausnahmen bei Lebensmitteln und Muster-Widerrufsformular.',
  },
  'versand-zahlung': {
    title: 'Versand & Zahlung',
    description: 'So funktioniert Ihre Bestellung bei Hasret Nuts: unverbindlich anfragen, persönliche Bestätigung per E-Mail, Versand oder Abholung in Memmingen.',
  },
  cookies: {
    title: 'Cookie-Hinweise',
    description: 'Cookie-Hinweise des Hasret Nuts Shops: nur technisch notwendige Speicherung, keine Tracking- oder Werbe-Cookies, daher kein Cookie-Banner.',
  },
};

for (const [slug, page] of Object.entries(LEGAL)) {
  router.get(`/${slug}`, (req, res) => {
    res.render(`legal/${slug}.njk`, {
      meta: buildMeta({ title: page.title, description: page.description, path: `/${slug}` }, req),
      pageTitle: page.title,
      breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: page.title, href: `/${slug}` }],
      sessionCookie: `${config.isProd ? '__Host-' : ''}hn_sid_shop`,
      sessionDays: config.security.sessionTtlDays,
      corporateUrl: config.apps.corporate.baseUrl,
    });
  });
}

module.exports = router;
