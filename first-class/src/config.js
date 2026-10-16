/**
 * Zentrale Unternehmensdaten.
 *
 * Alle Angaben in eckigen Klammern sind Platzhalter und müssen vor der
 * Veröffentlichung durch echte Daten ersetzt werden. Jeder Anrufbutton,
 * der Footer, das FAQ und die strukturierten Daten lesen ausschließlich
 * von hier – eine Änderung genügt, danach `npm run build` ausführen.
 */
export const site = {
  name: 'FIRST CLASS',
  descriptor: 'Schlüsseldienst',

  // Beispiel: '0821 123 456 78' – der tel:-Link wird automatisch erzeugt.
  phone: '[TELEFONNUMMER]',
  area: '[STADT UND UMGEBUNG]',
  hours: '[ÖFFNUNGSZEITEN]',
  paymentMethods: '[ZAHLUNGSARTEN]',

  // Öffentliche Adresse der Website, z. B. 'https://www.beispiel.de'.
  // Erst eintragen, wenn die Domain feststeht: Dann werden Canonical-Links,
  // Open-Graph-URLs und eine sitemap.xml erzeugt.
  url: '',

  // Ziel-URL für das Kontaktformular (z. B. ein Formular-Dienst oder ein
  // eigenes Backend, das JSON per POST annimmt). Solange leer, wird nichts
  // übermittelt und das Formular weist ehrlich darauf hin.
  formEndpoint: '',

  // Auf false setzen, falls Fahrzeugöffnungen nicht angeboten werden.
  // Karte und Unterseite verschwinden dann automatisch.
  offersCarOpening: true,
}

export const isPlaceholder = (value) => !value || /^\[.*\]$/.test(value.trim())

/** tel:-Link aus der hinterlegten Telefonnummer. */
export function telHref(phone = site.phone) {
  if (isPlaceholder(phone)) return `tel:${phone}`
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits}`
}
