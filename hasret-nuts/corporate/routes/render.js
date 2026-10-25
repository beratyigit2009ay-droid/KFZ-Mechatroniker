'use strict';
/**
 * Owner: BUILD-CORPORATE
 * Seitenkatalog des Corporate Hub (Titel, Beschreibungen, Sitemap-Angaben) und Helfer
 * zum Rendern inklusive SEO-Meta (shared/seo.buildMeta) und strukturierter Daten (JSON-LD).
 * Wird von pages.js, forms.js und seo.js gemeinsam genutzt.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../../shared/config');
const { buildMeta } = require('../../shared/seo');
const { CONTACT, FAQ, hasPlaceholder } = require('./content');

const VIEWS_DIR = path.join(__dirname, '..', 'views');

/**
 * Öffentliche Seiten. Titel/Beschreibungen laut KONZEPT.md Kap. 10.2 (Titel ≤ 60 Zeichen,
 * Beschreibung 140–160 Zeichen). buildMeta() ergänzt " · Hasret Nuts", falls der
 * Seitenname fehlt. sitemap: false → nicht in sitemap.xml (z. B. Feedback, noindex).
 */
const PAGES = Object.freeze({
  home: {
    path: '/',
    template: 'pages/home.njk',
    title: 'Hasret Nuts – Sehnsucht, die man schmecken kann.',
    description:
      'Hasret Nuts aus Memmingen: Sarma Lokum, hausgemachtes Turşu, Karadut Özü und geröstete Klassiker – für Händler in Süddeutschland und auf Europas Kulturmessen.',
    changefreq: 'weekly',
    priority: 1.0,
  },
  philosophie: {
    path: '/philosophie',
    template: 'pages/philosophie.njk',
    title: 'Philosophie – was Hasret bedeutet',
    crumb: 'Philosophie',
    pageType: 'AboutPage',
    description:
      'Hasret heißt Sehnsucht. Erfahren Sie, wofür Hasret Kuruyemiş aus Memmingen steht: ehrliche Herkunft, geduldiges Handwerk und gelebte Gastfreundschaft.',
    changefreq: 'monthly',
    priority: 0.8,
  },
  messeChronik: {
    path: '/messe-chronik',
    template: 'pages/messe-chronik.njk',
    title: 'Messe-Chronik: Festiculture Paris & Lyon',
    crumb: 'Messe-Chronik',
    description:
      'Von Memmingen auf die Kulturbühnen Europas: die Stationen von Hasret Nuts auf der Festiculture in Paris und Lyon – und wo Sie uns als Nächstes treffen.',
    changefreq: 'weekly',
    priority: 0.9,
  },
  haendler: {
    path: '/haendler',
    template: 'pages/haendler.njk',
    title: 'Für Händler: Spezialitäten fürs Sortiment',
    crumb: 'Für Händler',
    pageType: 'ContactPage',
    description:
      'Hasret Nuts beliefert internationale Supermärkte, Feinkostgeschäfte und den Großhandel in Bayern und Baden-Württemberg. Jetzt unverbindlich anfragen.',
    changefreq: 'monthly',
    priority: 0.9,
  },
  feedback: {
    path: '/feedback',
    template: 'pages/feedback.njk',
    title: 'Feedback & Fehler melden',
    crumb: 'Feedback & Fehler melden',
    description:
      'Lob, Kritik, eine Idee oder ein technischer Fehler auf der Website von Hasret Nuts? Schreiben Sie uns – wir lesen jede Nachricht persönlich.',
    noindex: true,
    sitemap: false,
  },
  impressum: {
    path: '/impressum',
    template: 'pages/impressum.njk',
    title: 'Impressum',
    crumb: 'Impressum',
    description:
      'Impressum von Hasret Nuts – Hasret Kuruyemiş, Inhaber Eyyüp Koca, Memmingen: Anbieterkennzeichnung, Kontakt und Verantwortlicher für den Inhalt dieser Website.',
    changefreq: 'yearly',
    priority: 0.2,
  },
  datenschutz: {
    path: '/datenschutz',
    template: 'pages/datenschutz.njk',
    title: 'Datenschutzerklärung',
    crumb: 'Datenschutz',
    description:
      'Datenschutzerklärung von Hasret Nuts: welche Daten wir bei Händleranfragen und Feedback verarbeiten, wofür, wie lange – und welche Rechte Sie jederzeit haben.',
    changefreq: 'yearly',
    priority: 0.2,
  },
  cookies: {
    path: '/cookies',
    template: 'pages/cookies.njk',
    title: 'Cookie-Hinweise',
    crumb: 'Cookie-Hinweise',
    description:
      'Cookie-Hinweise von Hasret Nuts: nur technisch notwendige Speicherung zum Schutz unserer Formulare – keine Analyse-, Werbe- oder Tracking-Cookies, kein Banner.',
    changefreq: 'yearly',
    priority: 0.2,
  },
});

/** Letzte Änderung einer Seite = Änderungszeit ihres Templates (ehrlicher lastmod für sitemap.xml). */
function lastModified(page) {
  try {
    return fs.statSync(path.join(VIEWS_DIR, page.template)).mtime;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- Strukturierte Daten */

/** Organisation + lokales Unternehmen – nur gesicherte Angaben, keine Platzhalter. */
function orgGraph(baseUrl) {
  const org = {
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: 'Hasret Kuruyemiş',
    alternateName: 'Hasret Nuts',
    url: `${baseUrl}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': `${baseUrl}/#logo`,
      url: `${baseUrl}/assets/logo/apple-touch-icon.png`,
      width: 180,
      height: 180,
      caption: 'Hasret Nuts',
    },
    image: `${baseUrl}/assets/logo/og-default.png`,
    slogan: 'Sehnsucht, die man schmecken kann.',
    founder: { '@type': 'Person', name: 'Eyyüp Koca' },
    areaServed: 'DE',
  };
  const business = {
    '@type': 'LocalBusiness',
    '@id': `${baseUrl}/#business`,
    name: 'Hasret Nuts',
    legalName: 'Hasret Kuruyemiş',
    url: `${baseUrl}/`,
    logo: { '@id': `${baseUrl}/#logo` },
    image: `${baseUrl}/assets/logo/og-default.png`,
    parentOrganization: { '@id': `${baseUrl}/#organization` },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Memmingen',
      addressRegion: 'Bayern',
      addressCountry: 'DE',
    },
    areaServed: 'DE',
  };
  // Kontaktdaten erst ausgeben, wenn sie keine Platzhalter mehr sind.
  if (!hasPlaceholder(CONTACT.street)) business.address.streetAddress = CONTACT.street;
  const zip = /^(\d{5})\s/.exec(CONTACT.zipCity);
  if (zip) business.address.postalCode = zip[1];
  if (!hasPlaceholder(CONTACT.phone)) {
    business.telephone = CONTACT.phone;
    org.contactPoint = { '@type': 'ContactPoint', contactType: 'sales', telephone: CONTACT.phone, areaServed: 'DE', availableLanguage: ['de', 'tr'] };
  }
  if (!hasPlaceholder(CONTACT.email)) {
    business.email = CONTACT.email;
    org.email = CONTACT.email;
  }
  const website = {
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: `${baseUrl}/`,
    name: 'Hasret Nuts',
    inLanguage: 'de-DE',
    publisher: { '@id': `${baseUrl}/#organization` },
  };
  return [org, business, website];
}

/** JSON-LD für eine Seite: Organisation/Unternehmen/Website + WebPage + BreadcrumbList (Unterseiten). */
function jsonLdFor(key, meta) {
  const page = PAGES[key];
  const baseUrl = config.apps.corporate.baseUrl;
  const url = `${baseUrl}${page.path === '/' ? '/' : page.path}`;
  const graph = orgGraph(baseUrl);
  const webPage = {
    '@type': page.pageType || 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: meta.title,
    description: meta.description,
    inLanguage: 'de-DE',
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
  };
  graph.push(webPage);
  if (page.crumb) {
    webPage.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Startseite', item: `${baseUrl}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: url },
      ],
    });
  }
  if (key === 'philosophie') {
    webPage.mainEntity = {
      '@type': 'Person',
      name: 'Eyyüp Koca',
      jobTitle: 'Inhaber',
      worksFor: { '@id': `${baseUrl}/#organization` },
      workLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Memmingen', addressCountry: 'DE' } },
    };
  }
  if (key === 'haendler') {
    // Nur Fragen mit echten Antworten (keine Platzhalter) – siehe KONZEPT 10.3.
    const answered = FAQ.filter((f) => !hasPlaceholder(f.a) && !hasPlaceholder(f.q));
    if (answered.length) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        inLanguage: 'de-DE',
        mainEntity: answered.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      });
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/**
 * Rendert eine Seite aus PAGES mit Meta + JSON-LD.
 * opts: { status, noindex, locals }
 */
function renderPage(req, res, key, locals = {}, opts = {}) {
  const page = PAGES[key];
  if (!page) throw new Error(`Unbekannte Seite: ${key}`);
  const noindex = Boolean(page.noindex || opts.noindex);
  const meta = buildMeta({ title: page.title, description: page.description, path: page.path, noindex, app: 'corporate' }, req);
  if (noindex) res.set('X-Robots-Tag', 'noindex, nofollow');
  res.status(opts.status || 200);
  return res.render(page.template, {
    meta,
    pageKey: key,
    bodyClass: `page page--${key}`,
    jsonLd: jsonLdFor(key, meta),
    ...locals,
  });
}

/** Formularseiten enthalten ein CSRF-Token: nicht zwischenspeichern. */
function noStore(res) {
  res.set('Cache-Control', 'private, no-store');
}

module.exports = { PAGES, renderPage, jsonLdFor, lastModified, noStore, orgGraph };
