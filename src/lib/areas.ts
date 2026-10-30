/**
 * Fahrzeugbereiche für den interaktiven Fahrzeug-Check.
 * Die „Anzeichen“ sind allgemeine Kfz-Anhaltspunkte aus Sicht der Fahrerin/des
 * Fahrers – keine Aussage über das Leistungsangebot eines Betriebs.
 * Koordinaten in Prozent der Fahrzeuggrafik (viewBox 1000 × 380).
 */
export interface VehicleArea {
  id: string;
  label: string;
  x: number;
  y: number;
  signs: string[];
}

export const AREAS: VehicleArea[] = [
  {
    id: 'motor',
    label: 'Motor & Antrieb',
    x: 80,
    y: 49,
    signs: [
      'Motorkontrollleuchte leuchtet',
      'Ungewohnte Geräusche oder Vibrationen',
      'Spürbarer Leistungsverlust',
      'Unruhiger Leerlauf',
    ],
  },
  {
    id: 'bremsen',
    label: 'Bremsen',
    x: 78.3,
    y: 70.5,
    signs: [
      'Quietschen oder Schleifen beim Bremsen',
      'Längerer Bremsweg als gewohnt',
      'Vibrationen im Bremspedal',
      'Fahrzeug zieht beim Bremsen zur Seite',
    ],
  },
  {
    id: 'reifen',
    label: 'Räder & Reifen',
    x: 22.5,
    y: 70.5,
    signs: [
      'Ungleichmäßig abgefahrenes Profil',
      'Warnung zum Reifendruck',
      'Vibrationen im Lenkrad',
      'Beschädigung an Reifen oder Felge',
    ],
  },
  {
    id: 'fahrwerk',
    label: 'Fahrwerk & Lenkung',
    x: 50.5,
    y: 80,
    signs: [
      'Poltern über Unebenheiten',
      'Fahrzeug zieht zur Seite',
      'Schwammiges Fahrgefühl',
      'Geräusche beim Lenken',
    ],
  },
  {
    id: 'elektrik',
    label: 'Elektrik & Licht',
    x: 92.5,
    y: 60,
    signs: [
      'Batterie schwächelt beim Starten',
      'Leuchte ausgefallen',
      'Fehlermeldung im Display',
      'Elektrische Verbraucher fallen aus',
    ],
  },
  {
    id: 'wartung',
    label: 'Wartung & Service',
    x: 43,
    y: 38,
    signs: [
      'Service-Anzeige im Cockpit',
      'Wartung laut Serviceheft fällig',
      'Vor einer längeren Fahrt',
      'Allgemeiner Check gewünscht',
    ],
  },
];
