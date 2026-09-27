import type { Company } from '../../types.ts';

/**
 * Auto- und Fahrzeugtechnik Lothar Maurer
 * Nicht belegt (daher bewusst leer): E-Mail, Website, Firmengeschichte,
 * Zertifikate, Preise, Mitarbeitende, Bewertungstexte.
 */
const company: Company = {
  slug: 'maurer',
  name: 'Auto- und Fahrzeugtechnik Lothar Maurer',
  shortName: 'Lothar Maurer',
  descriptor: 'Auto- und Fahrzeugtechnik',
  initials: 'LM',
  caliperLabel: 'L. MAURER',
  owner: 'Lothar Maurer',
  industry: 'Kfz-Werkstatt / Kfz-Reparatur / Wartung',
  address: { street: 'Sattenbeuren 14/1', zip: '88427', city: 'Bad Schussenried' },
  phone: { display: '0171 9571473', tel: '+491719571473', mobile: true },
  email: null,
  website: null,
  rating: { value: 4.9, count: 8, source: 'Google', asOf: '09/2026' },
  hours: {
    mo: [{ from: '16:30', to: '19:00' }],
    di: [{ from: '16:30', to: '19:00' }],
    do: [{ from: '16:30', to: '19:00' }],
    sa: [{ from: '08:00', to: '15:00' }],
  },
  theme: { accent: '#3EA2FF', accentInk: '#06090D' },
  seo: {
    title: 'Auto- und Fahrzeugtechnik Lothar Maurer | Kfz-Werkstatt in Bad Schussenried',
    description:
      'Auto- und Fahrzeugtechnik Lothar Maurer – Kfz-Werkstatt, Kfz-Reparatur und Wartung in Sattenbeuren 14/1, Bad Schussenried. Geöffnet Mo, Di, Do 16:30–19:00 und Sa 08:00–15:00. Tel. 0171 9571473.',
  },
  hero: {
    eyebrow: 'Kfz-Werkstatt · Kfz-Reparatur · Wartung · Bad Schussenried',
    title: ['Fahrzeugtechnik', 'nach Feierabend.'],
    accentLine: 1,
    text: 'Auto- und Fahrzeugtechnik Lothar Maurer: Werkstattzeiten am Abend und am Samstag – dann, wenn Sie Zeit haben. 4,9 von 5 Sternen auf Google.',
  },
  marquee: [
    'Kfz-Werkstatt',
    'Kfz-Reparatur',
    'Wartung',
    '4,9 ★ auf Google',
    'Mo · Di · Do bis 19:00',
    'Samstag 08:00–15:00',
    'Sattenbeuren 14/1',
    'Bad Schussenried',
  ],
  services: [
    {
      id: 'werkstatt',
      title: 'Kfz-Werkstatt',
      kicker: 'Werkstatt',
      text: 'Ihre Werkstatt in Sattenbeuren – mit Öffnungszeiten am Abend und am Samstag, die sich nach Ihrem Arbeitstag richten.',
      icon: 'garage',
      image: 'tools',
    },
    {
      id: 'reparatur',
      title: 'Kfz-Reparatur',
      kicker: 'Reparatur',
      text: 'Wenn am Fahrzeug etwas nicht stimmt: Schildern Sie das Problem – was genau zu tun ist, besprechen Sie direkt mit der Werkstatt.',
      icon: 'repair',
      image: 'brake',
    },
    {
      id: 'wartung',
      title: 'Wartung',
      kicker: 'Wartung',
      text: 'Regelmäßige Wartung hält Ihr Fahrzeug zuverlässig. Den passenden Termin stimmen Sie telefonisch ab.',
      icon: 'maintenance',
      image: 'engine',
    },
  ],
  highlights: [
    {
      value: '19:00',
      label: 'Abends geöffnet',
      text: 'Montag, Dienstag und Donnerstag von 16:30 bis 19:00 Uhr.',
    },
    {
      value: 'Sa',
      label: 'Auch samstags',
      text: 'Samstag von 08:00 bis 15:00 Uhr – ohne Urlaubstag zur Werkstatt.',
    },
    {
      value: '4,9',
      unit: '/ 5',
      label: 'Google-Bewertung',
      text: '4,9 von 5 Sternen im Durchschnitt – bei 8 Bewertungen auf Google.',
    },
    {
      value: '14/1',
      label: 'Sattenbeuren',
      text: 'Die Werkstatt finden Sie in Sattenbeuren 14/1, Bad Schussenried.',
    },
  ],
  about: {
    kicker: 'Über uns',
    title: 'Lothar Maurer. Auto- und Fahrzeugtechnik aus Sattenbeuren.',
    text: [
      'Auto- und Fahrzeugtechnik Lothar Maurer ist eine Kfz-Werkstatt in Sattenbeuren, Bad Schussenried – für Kfz-Reparatur und Wartung.',
      'Die Werkstatt ist abends und am Samstag geöffnet. Auf Google wird sie mit 4,9 von 5 Sternen bewertet.',
    ],
  },
  gallery: [
    { image: 'engine', title: 'Motor', caption: 'Das Herz des Fahrzeugs – im Detail betrachtet.' },
    { image: 'tools', title: 'Werkzeug', caption: 'Für jeden Handgriff das passende Werkzeug.' },
    { image: 'brake', title: 'Bremse', caption: 'Wo Sicherheit beginnt: Scheibe, Sattel, Belag.' },
    { image: 'spark', title: 'Zündung', caption: 'Kleine Teile, große Wirkung.' },
    { image: 'rim', title: 'Rad & Felge', caption: 'Präzision bis in die Radschraube.' },
  ],
  reviews: [],
  faqExtra: [
    {
      q: 'Kann ich nach Feierabend in die Werkstatt kommen?',
      a: 'Ja. Die Werkstatt ist montags, dienstags und donnerstags von 16:30 bis 19:00 Uhr sowie samstags von 08:00 bis 15:00 Uhr geöffnet. Den Termin stimmen Sie vorab telefonisch ab.',
    },
  ],
  symbolicImages: true,
  draft: true,
};

export default company;
