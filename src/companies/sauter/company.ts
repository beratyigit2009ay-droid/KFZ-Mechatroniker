import type { Company } from '../../types.ts';

/**
 * Kfz-Werkstätte Karl Sauter, Inh. Markus Funk
 * Nicht belegt (daher bewusst leer): E-Mail, Website, Firmengeschichte
 * (auch keine Aussage zu Gründung/Tradition), Zertifikate, Preise,
 * Mitarbeitende, Bewertungstexte.
 */
const company: Company = {
  slug: 'sauter',
  name: 'Kfz-Werkstätte Karl Sauter',
  shortName: 'Karl Sauter',
  descriptor: 'Kfz-Werkstätte',
  initials: 'KS',
  caliperLabel: 'KARL SAUTER',
  owner: 'Markus Funk',
  industry: 'Kfz-Werkstatt / Autoreparatur / Autoservice',
  address: {
    street: 'Steinhauser Straße 11',
    zip: '88427',
    city: 'Bad Schussenried',
    district: 'Reichenbach',
  },
  phone: { display: '07583 1825', tel: '+4975831825', mobile: false },
  // Platzhalter für den Entwurf – echte Adresse beim Betrieb erfragen
  email: 'info@kfz-werkstaette-sauter.example',
  emailPlaceholder: true,
  website: null,
  rating: { value: 4.9, count: 47, source: 'Google', asOf: '09/2026' },
  hours: {
    mo: [
      { from: '07:30', to: '12:00' },
      { from: '13:00', to: '17:30' },
    ],
    di: [
      { from: '07:30', to: '12:00' },
      { from: '13:00', to: '17:30' },
    ],
    mi: [
      { from: '07:30', to: '12:00' },
      { from: '13:00', to: '17:30' },
    ],
    do: [
      { from: '07:30', to: '12:00' },
      { from: '13:00', to: '17:30' },
    ],
    fr: [{ from: '07:30', to: '12:00' }],
  },
  theme: { accent: '#FF3B3F', accentInk: '#0B0A0A' },
  seo: {
    title: 'Kfz-Werkstätte Karl Sauter | Kfz-Werkstatt in Bad Schussenried-Reichenbach',
    description:
      'Kfz-Werkstätte Karl Sauter, Inh. Markus Funk – Kfz-Werkstatt, Autoreparatur und Autoservice in der Steinhauser Straße 11, Bad Schussenried-Reichenbach. 4,9 von 5 Sternen bei 47 Google-Bewertungen. Tel. 07583 1825.',
  },
  hero: {
    eyebrow: 'Kfz-Werkstatt · Autoreparatur · Autoservice · Reichenbach',
    title: ['Handwerk,', 'das überzeugt.'],
    accentLine: 1,
    text: 'Die Kfz-Werkstätte Karl Sauter in Bad Schussenried-Reichenbach: 4,9 von 5 Sternen aus 47 Google-Bewertungen. Termin vereinbaren Sie direkt am Telefon.',
  },
  marquee: [
    'Kfz-Werkstatt',
    'Autoreparatur',
    'Autoservice',
    '4,9 ★ auf Google',
    '47 Bewertungen',
    'Steinhauser Straße 11',
    'Bad Schussenried-Reichenbach',
    'Inh. Markus Funk',
  ],
  services: [
    {
      id: 'werkstatt',
      title: 'Kfz-Werkstatt',
      kicker: 'Werkstatt',
      text: 'Ihre Kfz-Werkstatt in Reichenbach: Schildern Sie Ihr Anliegen am Telefon und vereinbaren Sie einen Termin in der Steinhauser Straße.',
      icon: 'garage',
      image: 'tools',
    },
    {
      id: 'autoreparatur',
      title: 'Autoreparatur',
      kicker: 'Reparatur',
      text: 'Wenn Ihr Auto nicht mehr so läuft, wie es soll: Beschreiben Sie das Problem – was genau zu tun ist, besprechen Sie direkt mit der Werkstatt.',
      icon: 'repair',
      image: 'brake',
    },
    {
      id: 'autoservice',
      title: 'Autoservice',
      kicker: 'Service',
      text: 'Service rund um Ihr Auto – vom ersten Anruf bis zur Abholung Ihres Fahrzeugs.',
      icon: 'service',
      image: 'engine',
    },
  ],
  highlights: [
    {
      value: '4,9',
      unit: '/ 5',
      label: 'Google-Bewertung',
      text: 'Fast die volle Punktzahl – im Durchschnitt aller Bewertungen auf Google.',
    },
    {
      value: '47',
      label: 'Bewertungen',
      text: '47 Kundinnen und Kunden haben ihre Erfahrung auf Google geteilt.',
      countUp: true,
    },
    {
      value: 'Mo–Fr',
      label: 'Geöffnet',
      text: 'Mo–Do 07:30–12:00 und 13:00–17:30 Uhr, Fr 07:30–12:00 Uhr.',
    },
    {
      value: '11',
      label: 'Steinhauser Straße',
      text: 'Die Werkstatt liegt in Reichenbach, Steinhauser Straße 11.',
    },
  ],
  about: {
    kicker: 'Über uns',
    title: 'Kfz-Werkstätte Karl Sauter. Inhaber: Markus Funk.',
    text: [
      'Die Kfz-Werkstätte Karl Sauter ist Ihre Kfz-Werkstatt in Bad Schussenried-Reichenbach – für Autoreparatur und Autoservice. Inhaber des Betriebs ist Markus Funk.',
      '47 Kundinnen und Kunden haben die Werkstatt auf Google bewertet – im Schnitt mit 4,9 von 5 Sternen.',
    ],
  },
  gallery: [
    { image: 'brake', title: 'Bremse', caption: 'Wo Sicherheit beginnt: Scheibe, Sattel, Belag.' },
    { image: 'engine', title: 'Motor', caption: 'Das Herz des Fahrzeugs – im Detail betrachtet.' },
    { image: 'rim', title: 'Rad & Felge', caption: 'Präzision bis in die Radschraube.' },
    { image: 'tools', title: 'Werkzeug', caption: 'Für jeden Handgriff das passende Werkzeug.' },
    { image: 'spark', title: 'Zündung', caption: 'Kleine Teile, große Wirkung.' },
  ],
  reviews: [],
  faqExtra: [],
  symbolicImages: true,
  draft: true,
};

export default company;
