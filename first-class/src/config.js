/**
 * Zentrale Unternehmensdaten. Jeder Anrufbutton, der Footer, das FAQ, das
 * Impressum und die strukturierten Daten lesen ausschließlich von hier –
 * eine Änderung genügt, danach `npm run build` ausführen.
 *
 * Angaben in eckigen Klammern sind noch offene Platzhalter.
 */
export const site = {
  name: 'FIRST CLASS',
  descriptor: 'Schlüsseldienst',

  // Notdienst-Nummer (24 h) – wird von allen „Jetzt anrufen“-Buttons genutzt.
  phone: '0176 / 612 35 35 6',
  // Festnetz des Ladengeschäfts.
  phoneShop: '0821 / 298 32 50',
  email: 'info@fc-schuhe-schlüsselnotdienst.de',
  // Gleiche Adresse in Punycode – funktioniert in jedem E-Mail-Programm.
  emailHref: 'mailto:info@xn--fc-schuhe-schlsselnotdienst-v3c.de',

  shop: 'City Center Gersthofen',
  locality: 'Gersthofen',
  postalCode: '86368',
  street: '[STRASSE UND HAUSNUMMER]',

  area: 'Augsburg, Gersthofen und Umgebung',
  emergency: '24 Stunden – auch an Wochenenden, Sonn- und Feiertagen',
  hours: 'Mo–Fr 09:00–19:00 · Sa 09:00–18:00',
  openingHours: [
    {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '19:00',
    },
    { days: ['Saturday'], opens: '09:00', closes: '18:00' },
  ],
  paymentMethods: '[ZAHLUNGSARTEN]',

  // Öffentliche Adresse der Website, z. B. 'https://www.beispiel.de'.
  // Erst eintragen, wenn die Domain feststeht: Dann werden Canonical-Links,
  // Open-Graph-URLs und eine sitemap.xml erzeugt.
  url: '',

  // Ziel-URL für das Kontaktformular (z. B. ein Formular-Dienst oder ein
  // eigenes Backend, das JSON per POST annimmt). Solange leer, wird nichts
  // übermittelt und das Formular weist ehrlich darauf hin.
  formEndpoint: '',

  // Auf false setzen, falls Autoöffnungen nicht mehr angeboten werden.
  offersCarOpening: true,
}

export const isPlaceholder = (value) => !value || /^\[.*\]$/.test(value.trim())

/** tel:-Link im internationalen Format (0821 … → +49821 …). */
export function telHref(phone = site.phone) {
  if (isPlaceholder(phone)) return `tel:${phone}`
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits.startsWith('0') ? `+49${digits.slice(1)}` : digits}`
}
