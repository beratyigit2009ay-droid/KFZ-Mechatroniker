import type { Company } from '../../types.ts';

/**
 * KFZ-Service Patran
 * Quelle Unternehmensdaten: Stadt Bad Schussenried; Bewertung: Google.
 * Nicht belegt (daher bewusst leer): Öffnungszeiten, E-Mail, Website,
 * Firmengeschichte, Zertifikate, Preise, Mitarbeitende, Bewertungstexte.
 */
const company: Company = {
  slug: 'patran',
  name: 'KFZ-Service Patran',
  shortName: 'Patran',
  descriptor: 'KFZ-Service',
  initials: 'P',
  caliperLabel: 'PATRAN',
  owner: 'Alexander Patran',
  industry: 'Kfz-Werkstatt / Kfz-Service',
  address: { street: 'Rohrwiesenstraße 5', zip: '88427', city: 'Bad Schussenried' },
  phone: { display: '0176 41071605', tel: '+4917641071605', mobile: true },
  email: null,
  website: null,
  rating: { value: 5.0, count: 17, source: 'Google', asOf: '09/2026' },
  hours: null,
  theme: { accent: '#FF6A1A', accentInk: '#0B0B0C' },
  seo: {
    title: 'KFZ-Service Patran | Kfz-Werkstatt in Bad Schussenried',
    description:
      'KFZ-Service Patran – Kfz-Werkstatt und Kfz-Service in der Rohrwiesenstraße 5, Bad Schussenried. 5,0 von 5 Sternen auf Google. Termin telefonisch: 0176 41071605.',
  },
  hero: {
    eyebrow: 'Kfz-Werkstatt · Kfz-Service · Bad Schussenried',
    title: ['Kfz-Service.', 'Fünf Sterne.'],
    accentLine: 1,
    text: 'KFZ-Service Patran in Bad Schussenried – von Kundinnen und Kunden auf Google mit 5,0 von 5 Sternen bewertet. Ihr Termin ist nur einen Anruf entfernt.',
  },
  marquee: [
    'Kfz-Werkstatt',
    'Kfz-Service',
    '5,0 ★ auf Google',
    '17 Bewertungen',
    'Rohrwiesenstraße 5',
    'Bad Schussenried',
    'Inh. Alexander Patran',
  ],
  services: [
    {
      id: 'service',
      title: 'Kfz-Service',
      kicker: 'Service',
      text: 'Service rund um Ihr Fahrzeug. Schildern Sie am Telefon kurz, worum es geht – und stimmen Sie direkt einen Termin ab.',
      icon: 'service',
      image: 'engine',
    },
    {
      id: 'werkstatt',
      title: 'Kfz-Werkstatt',
      kicker: 'Werkstatt',
      text: 'Wenn am Fahrzeug etwas nicht stimmt: Die Werkstatt in der Rohrwiesenstraße ist Ihr Anlaufpunkt in Bad Schussenried.',
      icon: 'garage',
      image: 'brake',
    },
  ],
  highlights: [
    {
      value: '5,0',
      unit: '/ 5',
      label: 'Google-Bewertung',
      text: 'Die bestmögliche Durchschnittsnote – vergeben von Kundinnen und Kunden auf Google.',
    },
    {
      value: '17',
      label: 'Bewertungen',
      text: '17 Bewertungen auf Google – und im Schnitt die volle Punktzahl.',
      countUp: true,
    },
    {
      value: '88427',
      label: 'Bad Schussenried',
      text: 'Die Werkstatt finden Sie in der Rohrwiesenstraße 5.',
    },
    {
      value: '1',
      label: 'Anruf genügt',
      text: 'Termin und Fragen klären Sie direkt am Telefon – unter 0176 41071605.',
    },
  ],
  about: {
    kicker: 'Über uns',
    title: 'Ihr Ansprechpartner: Alexander Patran.',
    text: [
      'KFZ-Service Patran ist eine Kfz-Werkstatt in Bad Schussenried. Inhaber des Betriebs ist Alexander Patran.',
      'Auf Google bewerten Kundinnen und Kunden die Werkstatt mit 5,0 von 5 möglichen Sternen – bei 17 Bewertungen.',
    ],
  },
  gallery: [
    { image: 'brake', title: 'Bremse', caption: 'Wo Sicherheit beginnt: Scheibe, Sattel, Belag.' },
    { image: 'rim', title: 'Rad & Felge', caption: 'Präzision, die man bis in die Radschraube sieht.' },
    { image: 'engine', title: 'Motor', caption: 'Das Herz des Fahrzeugs – im Detail betrachtet.' },
    { image: 'tools', title: 'Werkzeug', caption: 'Das richtige Werkzeug für jeden Handgriff.' },
    { image: 'spark', title: 'Zündung', caption: 'Kleine Teile, große Wirkung.' },
  ],
  reviews: [],
  faqExtra: [],
  symbolicImages: true,
  draft: true,
};

export default company;
