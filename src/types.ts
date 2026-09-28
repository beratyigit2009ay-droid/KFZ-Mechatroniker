/**
 * Datenmodell eines Betriebs.
 *
 * Grundregel: Hier steht nur, was über den Betrieb belegt ist. Alles, was fehlt,
 * bleibt `null` bzw. ein leeres Array – die Oberfläche blendet den jeweiligen
 * Baustein dann aus oder zeigt einen neutralen Hinweis („telefonisch erfragen“).
 */

export type Weekday = 'mo' | 'di' | 'mi' | 'do' | 'fr' | 'sa' | 'so';

export interface TimeRange {
  /** "07:30" */
  from: string;
  /** "12:00" */
  to: string;
}

/** Nicht aufgeführte Tage gelten als geschlossen. `null` = Öffnungszeiten unbekannt. */
export type OpeningHours = Partial<Record<Weekday, TimeRange[]>>;

export type IconName = 'wrench' | 'service' | 'repair' | 'maintenance' | 'garage' | 'plus';

/** Schlüssel der Bildmotive (siehe `assets.ts` des Betriebs). */
export type ImageKey = 'brake' | 'rim' | 'engine' | 'tools' | 'spark';

export interface Service {
  id: string;
  /** Leistung exakt so, wie sie für den Betrieb belegt ist. */
  title: string;
  kicker: string;
  text: string;
  icon: IconName;
  image: ImageKey;
}

export interface Highlight {
  value: string;
  unit?: string;
  label: string;
  text: string;
  /** Wert wird beim Einblenden hochgezählt (nur rein numerische Werte). */
  countUp?: boolean;
}

export interface Review {
  author: string;
  text: string;
  rating: number;
  date?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface GalleryItem {
  image: ImageKey;
  title: string;
  caption: string;
}

export interface Company {
  slug: string;
  /** Vollständiger Name wie recherchiert. */
  name: string;
  /** Wortmarke im Logo. */
  shortName: string;
  /** Zusatzzeile im Logo. */
  descriptor: string;
  initials: string;
  /** Schriftzug auf dem Bremssattel der 3D-Visualisierung. */
  caliperLabel: string;
  owner: string | null;
  industry: string;
  address: {
    street: string;
    zip: string;
    city: string;
    /** Ortsteil, falls Teil der Adresse. */
    district?: string;
  };
  phone: {
    display: string;
    /** E.164, z. B. "+4975831825" */
    tel: string;
    /** Mobilnummer? (nur informativ, keine SMS-/Messenger-Annahme) */
    mobile: boolean;
  };
  email: string | null;
  /**
   * `true` = Platzhalteradresse für den Entwurf (reservierte Endung `.example`,
   * nicht zustellbar). Wird dann nicht ins Impressum und nicht in die
   * strukturierten Daten übernommen. Vor Veröffentlichung durch die echte
   * Adresse ersetzen und entfernen.
   */
  emailPlaceholder?: boolean;
  website: string | null;
  rating: {
    value: number;
    count: number;
    source: 'Google';
    /** Stand der Recherche, z. B. "09/2026". */
    asOf: string;
  };
  hours: OpeningHours | null;
  theme: {
    accent: string;
    /** Textfarbe auf Akzentflächen. */
    accentInk: string;
  };
  seo: {
    title: string;
    description: string;
  };
  hero: {
    eyebrow: string;
    /** Zwei Zeilen; `accentLine` wird in Akzentfarbe gesetzt. */
    title: [string, string];
    accentLine: 0 | 1;
    text: string;
  };
  marquee: string[];
  services: Service[];
  highlights: Highlight[];
  about: {
    kicker: string;
    title: string;
    text: string[];
  };
  gallery: GalleryItem[];
  /** Nur echte, freigegebene Bewertungstexte eintragen. */
  reviews: Review[];
  /** Zusätzliche, betriebsspezifische Fragen. */
  faqExtra: FaqItem[];
  /**
   * `true`, solange die Bilder 3D-Visualisierungen bzw. Symbolbilder sind.
   * Nach dem Austausch gegen echte Werkstattfotos auf `false` setzen.
   */
  symbolicImages: boolean;
  /** Entwurfsmodus: noindex + dezenter Hinweis im Footer. */
  draft: boolean;
}
