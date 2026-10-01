import type { Company } from '../../types.ts';

/**
 * Georg Abdullahad – Kfz-Reparatur / Fahrzeugreparaturen
 * Nicht belegt (daher bewusst leer): Inhaber-Zusatz, E-Mail, Website,
 * Firmengeschichte, Zertifikate, Preise, Mitarbeitende, Bewertungstexte.
 */
const company: Company = {
  slug: 'abdullahad',
  name: 'Georg Abdullahad',
  shortName: 'Abdullahad',
  descriptor: 'Kfz-Reparatur',
  initials: 'GA',
  caliperLabel: 'ABDULLAHAD',
  owner: null,
  industry: 'Kfz-Reparatur / Fahrzeugreparaturen',
  address: { street: 'Aulendorfer Straße 22a', zip: '88427', city: 'Bad Schussenried' },
  phone: { display: '07583 926114', tel: '+497583926114', mobile: false },
  // Platzhalter für den Entwurf – echte Adresse beim Betrieb erfragen
  email: 'info@kfz-abdullahad.example',
  emailPlaceholder: true,
  website: null,
  rating: { value: 4.6, count: 46, source: 'Google', asOf: '09/2026' },
  hours: {
    mo: [
      { from: '08:00', to: '12:00' },
      { from: '13:00', to: '17:00' },
    ],
    di: [
      { from: '08:00', to: '12:00' },
      { from: '13:00', to: '17:00' },
    ],
    mi: [
      { from: '08:00', to: '12:00' },
      { from: '13:00', to: '17:00' },
    ],
    do: [
      { from: '08:00', to: '12:00' },
      { from: '13:00', to: '17:00' },
    ],
    fr: [
      { from: '08:00', to: '12:00' },
      { from: '13:00', to: '17:00' },
    ],
  },
  theme: { accent: '#C6F432', accentInk: '#0A0B08' },
  seo: {
    title: 'Georg Abdullahad | Kfz-Reparatur in Bad Schussenried',
    description:
      'Georg Abdullahad – Kfz-Reparatur und Fahrzeugreparaturen in der Aulendorfer Straße 22a, Bad Schussenried. 4,6 von 5 Sternen bei 46 Google-Bewertungen. Mo–Fr geöffnet, Tel. 07583 926114.',
  },
  hero: {
    eyebrow: 'Kfz-Reparatur · Fahrzeugreparaturen · Bad Schussenried',
    title: ['Reparatur.', 'Verlässlich.'],
    accentLine: 1,
    text: 'Georg Abdullahad – Ihre Kfz-Reparatur in der Aulendorfer Straße, Bad Schussenried. 4,6 von 5 Sternen aus 46 Google-Bewertungen. Montag bis Freitag erreichbar.',
  },
  marquee: [
    'Kfz-Reparatur',
    'Fahrzeugreparaturen',
    '4,6 ★ auf Google',
    '46 Bewertungen',
    'Aulendorfer Straße 22a',
    'Bad Schussenried',
    'Mo–Fr geöffnet',
  ],
  services: [
    {
      id: 'reparatur',
      title: 'Kfz-Reparatur',
      kicker: 'Reparatur',
      text: 'Wenn Ihr Fahrzeug nicht mehr so läuft, wie es soll: Schildern Sie das Problem am Telefon und vereinbaren Sie einen Termin in der Aulendorfer Straße.',
      icon: 'repair',
      image: 'engine',
    },
    {
      id: 'fahrzeugreparaturen',
      title: 'Fahrzeugreparaturen',
      kicker: 'Fahrzeuge',
      text: 'Reparaturen an Ihrem Fahrzeug – was genau ansteht, besprechen Sie vorab direkt mit der Werkstatt.',
      icon: 'wrench',
      image: 'brake',
    },
  ],
  highlights: [
    {
      value: '4,6',
      unit: '/ 5',
      label: 'Google-Bewertung',
      text: 'Durchschnittliche Bewertung von Kundinnen und Kunden auf Google.',
    },
    {
      value: '46',
      label: 'Bewertungen',
      text: 'Eine breite Grundlage: 46 Bewertungen auf Google.',
      countUp: true,
    },
    {
      value: 'Mo–Fr',
      label: 'Geöffnet',
      text: '08:00–12:00 und 13:00–17:00 Uhr – verlässliche Zeiten für Ihren Termin.',
    },
    {
      value: '22a',
      label: 'Aulendorfer Straße',
      text: 'Die Werkstatt liegt in der Aulendorfer Straße 22a in Bad Schussenried.',
    },
  ],
  about: {
    kicker: 'Über uns',
    title: 'Georg Abdullahad. Kfz-Reparatur in Bad Schussenried.',
    text: [
      'Der Betrieb von Georg Abdullahad steht für Kfz-Reparatur und Fahrzeugreparaturen in der Aulendorfer Straße 22a.',
      '46 Kundinnen und Kunden haben die Werkstatt auf Google bewertet – im Schnitt mit 4,6 von 5 Sternen.',
    ],
  },
  gallery: [
    { image: 'engine', title: 'Motor', caption: 'Das Herz des Fahrzeugs – im Detail betrachtet.' },
    { image: 'brake', title: 'Bremse', caption: 'Wo Sicherheit beginnt: Scheibe, Sattel, Belag.' },
    { image: 'tools', title: 'Werkzeug', caption: 'Für jeden Handgriff das passende Werkzeug.' },
    { image: 'rim', title: 'Rad & Felge', caption: 'Präzision bis in die Radschraube.' },
    { image: 'spark', title: 'Zündung', caption: 'Kleine Teile, große Wirkung.' },
  ],
  reviews: [],
  faqExtra: [],
  symbolicImages: true,
  draft: true,
};

export default company;
