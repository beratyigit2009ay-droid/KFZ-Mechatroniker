'use strict';
/**
 * Owner: BUILD-CORPORATE
 * Inhalte des Corporate Hub, die der Inhaber pflegen kann, ohne Templates anzufassen:
 *   - Foto-Platzhalter C-01 … C-21 (Motiv, Perspektive, Format – siehe docs/FOTO-SHOTLISTE.md)
 *   - Messe-Chronik (Stationen der Zeitleiste)
 *   - Sortiment für den Handel (fünf Produktgruppen, OHNE Preise – hier wird nichts verkauft)
 *   - Formular-Optionen (Art des Geschäfts, Sortimente, Feedback-Arten)
 *   - Kontakt-Platzhalter und häufige Fragen
 *
 * Regeln: keine erfundenen Fakten. Unbekanntes steht in eckigen Klammern ([TELEFON], [DATUM] …)
 * und wird vom Inhaber ergänzt. Keine Gesundheitsversprechen (VO (EG) Nr. 1924/2006).
 */

/* ------------------------------------------------------------------ Kontakt */

/** Kontaktangaben – Platzhalter, bis der Inhaber sie bestätigt. */
const CONTACT = Object.freeze({
  company: 'Hasret Kuruyemiş',
  owner: 'Eyyüp Koca',
  street: '[STRASSE NR.]',
  zipCity: '[PLZ] Memmingen',
  phone: '[TELEFON]',
  email: '[E-MAIL]',
  instagram: '[HANDLE]',
  linkedin: '[PROFIL]',
  replyTime: '[2 Werktagen]',
});

/* ------------------------------------------------------------ Foto-Platzhalter */

/**
 * Jede Bildposition zeigt bis zur Lieferung des Fotos einen beschrifteten Platzhalter.
 * Foto tauschen: im Template das {{ ph.photo(...) }} durch ein <img> mit derselben
 * Seitenverhältnis-Klasse (ar-4x5 …) ersetzen. Dateiname = Foto-ID.
 * ratio: CSS-Klasse ar-<ratio>; label: Beschriftung; text: Motiv + Perspektive.
 */
const PHOTOS = Object.freeze({
  'C-01': {
    ratio: '4x5',
    label: 'Foto C-01 · Hero · 4:5 hochkant · min. 2000 × 2500 px',
    text: '[FOTO-PLATZHALTER: Edles Stillleben – geröstete Pistazien und Sarma-Lokum-Scheiben (Pistazie, Rose) in Messingschalen auf dunklem Marmor. Perspektive: 45° schräg von oben, weiches Fensterlicht von links, tiefe Schatten rechts, ruhiger Hintergrund ohne Requisiten-Chaos.]',
  },
  'C-02': {
    ratio: '1x1',
    small: true,
    label: 'Foto C-02 · 1:1 · min. 1600 × 1600 px',
    text: '[FOTO-PLATZHALTER: Makro – eine Hand lässt geröstete Pistazien durch die Finger rieseln. Perspektive: Augenhöhe, Offenblende f/2.8, Hintergrund weich unscharf.]',
  },
  'C-03': {
    ratio: '3x4',
    label: 'Foto C-03 · 3:4 · min. 1800 × 2400 px',
    text: '[FOTO-PLATZHALTER: Nüsse & Knabberzeug – vier kleine Messingschalen mit Pistazien, Erdnüssen, Leblebi und Chips-Kichererbsen. Perspektive: Flatlay 90° von oben, weißes Leinen als Untergrund, Seitenlicht.]',
  },
  'C-04': {
    ratio: '3x4',
    label: 'Foto C-04 · 3:4 · min. 1800 × 2400 px',
    text: '[FOTO-PLATZHALTER: Traditionelle Süßwaren – Sarma-Lokum-Scheiben in vier Sorten auf einem Silbertablett, Teeglas und Silberbesteck als ruhige Begleiter. Perspektive: 45° Tischperspektive, Seitenlicht.]',
  },
  'C-05': {
    ratio: '3x4',
    label: 'Foto C-05 · 3:4 · min. 1800 × 2400 px',
    text: '[FOTO-PLATZHALTER: Feinkost – ein Glas Turşu „Lila Gemüse“, ein Schälchen Wildgurken und die Flasche Karadut Özü. Perspektive: Augenhöhe 0°, dunkler Holztisch, Licht von hinten links für glänzende Texturen.]',
  },
  'C-06': {
    ratio: '4x5',
    label: 'Foto C-06 · 4:5 hochkant · min. 2000 × 2500 px',
    text: '[FOTO-PLATZHALTER: Eyyüp Koca prüft eine Handvoll gerösteter Pistazien, Blick auf die Hand gerichtet. Perspektive: Halbtotale auf Augenhöhe, 50–85 mm, natürliches Seitenlicht, Lager weich unscharf im Hintergrund.]',
  },
  'C-07': {
    ratio: '16x10',
    label: 'Foto C-07 · 16:10 quer · min. 2560 × 1600 px',
    text: '[FOTO-PLATZHALTER: Ihr Messestand auf der Festiculture in der Totale – gefüllte Auslage, Besucher im Gespräch, Markenschild gut lesbar. Perspektive: leicht erhöht (Leiter oder ausgestreckter Arm), Weitwinkel 24–35 mm, ohne Blitz.]',
  },
  'C-08': {
    ratio: '21x9',
    label: 'Foto C-08 · Panorama 21:9 · min. 3200 × 1370 px',
    text: '[FOTO-PLATZHALTER: Das gesamte Sortiment als lange Reihe aus Messing- und Keramikschalen auf weißem Leinen – Pistazien, Erdnüsse, Leblebi, Sarma Lokum, Turşu im Schälchen, Karadut Özü im Kännchen. Perspektive: Flatlay exakt 90° von oben, gleichmäßiges Tageslicht, viel Weißraum links und rechts.]',
  },
  'C-09': {
    ratio: '4x5',
    label: 'Foto C-09 · 4:5 · min. 1600 × 2000 px',
    text: '[FOTO-PLATZHALTER: Rohware im Jutesack, eine Schaufel voller Pistazien ragt heraus. Perspektive: 45° von schräg oben, warmes Seitenlicht, grobe Textur im Fokus.]',
  },
  'C-10': {
    ratio: '4x5',
    label: 'Foto C-10 · 4:5 · min. 1600 × 2000 px',
    text: '[FOTO-PLATZHALTER: Zwei Hände verlesen Pistazien auf einem flachen Messingtablett, aussortierte Kerne liegen am Rand. Perspektive: Draufsicht 90°, Fensterlicht von oben links.]',
  },
  'C-11': {
    ratio: '4x5',
    label: 'Foto C-11 · 4:5 · min. 1600 × 2000 px',
    text: '[FOTO-PLATZHALTER: Gedeckter Tisch für Gäste – Tulpenglas mit Tee, Schale gemischter Nüsse, Lokum auf kleinem Teller, eine Hand greift zu. Perspektive: 45° Tischperspektive, warmes Abendlicht.]',
  },
  'C-12': {
    ratio: '4x5',
    label: 'Foto C-12 · Porträt 4:5 · min. 2000 × 2500 px',
    text: '[FOTO-PLATZHALTER: Porträt Eyyüp Koca, ruhiger Blick in die Kamera, dunkles Hemd oder Sakko. Perspektive: Augenhöhe, 85 mm, f/2, smaragdgrüne Wand oder unscharfes Lager im Hintergrund, weiches Fensterlicht von der Seite (Rembrandt-Licht).]',
  },
  'C-13': {
    ratio: '3x4',
    label: 'Foto C-13 · 3:4 · min. 1800 × 2400 px',
    text: '[FOTO-PLATZHALTER: Röstvorgang – Nüsse oder Kichererbsen in Bewegung in Röstmaschine oder Pfanne, leichter Dampf sichtbar (nur wenn selbst geröstet wird – sonst Abfüllung oder Wareneingang). Perspektive: 30° seitlich, kurze Belichtungszeit 1/500 s, Gegenlicht für den Dampf.]',
  },
  'C-14': {
    ratio: '1x1',
    label: 'Foto C-14 · 1:1 · min. 1600 × 1600 px',
    text: '[FOTO-PLATZHALTER: Hände verschließen eine Hasret-Verpackung, Logo gut lesbar. Perspektive: Draufsicht 90°, heller Arbeitstisch.]',
  },
  'C-15': {
    ratio: '3x4',
    label: 'Foto C-15 · 3:4 · min. 1800 × 2400 px',
    text: '[FOTO-PLATZHALTER: Lager mit ordentlich gestapelten, etikettierten Kartons und Säcken. Perspektive: Augenhöhe, zentrale Fluchtlinie, kühles Tageslicht.]',
  },
  'C-16': {
    ratio: '3x2',
    label: 'Foto C-16 · 3:2 quer · min. 2400 × 1600 px',
    text: '[FOTO-PLATZHALTER: Der erste Laden, das erste Lager oder die erste Lieferung – gern ein authentisches Archivbild. Perspektive: Augenhöhe, dokumentarisch, natürliches Licht.]',
  },
  'C-17': {
    ratio: '3x2',
    label: 'Foto C-17 · 3:2 quer · min. 2400 × 1600 px',
    text: '[FOTO-PLATZHALTER: Ihr Stand auf der Festiculture Paris in der Totale, Besucher an der Auslage. Perspektive: leicht erhöht, 24–35 mm, Markenschild im oberen Drittel.]',
  },
  'C-18': {
    ratio: '3x2',
    label: 'Foto C-18 · 3:2 quer · min. 2400 × 1600 px',
    text: '[FOTO-PLATZHALTER: Nahaufnahme – ein Besucher probiert, Ihre Hand reicht eine Kostprobe über die Theke. Perspektive: Augenhöhe, 50 mm, f/2.8, Hintergrund mit Messetrubel unscharf.]',
  },
  'C-19': {
    ratio: '3x2',
    label: 'Foto C-19 · 3:2 quer · min. 2400 × 1600 px',
    text: '[FOTO-PLATZHALTER: Vorfreude-Motiv – gepackte Messekisten mit Hasret-Logo oder die fertig arrangierte Auslage vor Messebeginn. Perspektive: 45° von schräg oben, sauberes Licht.]',
  },
  'C-20': {
    ratio: '21x9',
    label: 'Foto C-20 · Panorama 21:9 · min. 3200 × 1370 px',
    text: '[FOTO-PLATZHALTER: Hasret-Produkte perfekt eingeräumt in einem Supermarktregal oder auf einem Verkaufsdisplay – Frontseiten exakt ausgerichtet. Perspektive: Augenhöhe frontal, 35 mm, Regal füllt das Bild, gleichmäßiges Licht ohne Reflexe auf den Verpackungen.]',
  },
  'C-21': {
    ratio: '4x5',
    label: 'Foto C-21 · 4:5 · min. 1600 × 2000 px',
    text: '[FOTO-PLATZHALTER: Eyyüp Koca im Gespräch mit einem Händler oder beim Kommissionieren im Lager, freundlich und nahbar. Perspektive: Halbnah auf Augenhöhe, 50 mm, natürliches Licht.]',
  },
});

for (const [id, p] of Object.entries(PHOTOS)) p.id = id;

/* ------------------------------------------------------- Sortiment für den Handel */

/**
 * Die fünf Produktgruppen – bewusst OHNE Preise (der Corporate Hub verkauft nicht).
 * key: interner Wert (Formular-Checkbox), name: Anzeige, formats: Sorten/Gebinde laut Inhaber.
 */
const ASSORTMENT = Object.freeze([
  {
    key: 'sarma-lokum',
    num: '01',
    name: 'Premium Sarma Lokum',
    nameTr: 'Sarma Lokum',
    kicker: 'Traditionelle Süßwaren',
    text: 'Gerollte Fruchtgelee-Variationen in vier Sorten – ein Klassiker für Teetisch und Festtage.',
    formats: ['Pistazie', 'Haselnuss', 'Rose', 'Kokos'],
  },
  {
    key: 'tursu',
    num: '02',
    name: 'Hausgemachtes Turşu',
    nameTr: 'Hasret Ev Yapımı Turşu',
    kicker: 'Feinkost',
    text: 'Hausgemachte Feinkost-Gemüsekonserven – eingelegtes Gemüse für den gedeckten Tisch.',
    formats: ['Lila Gemüse', 'Wildgurken', '1-kg-Glas'],
  },
  {
    key: 'karadut-ozu',
    num: '03',
    name: 'Karadut Özü',
    nameTr: 'Maulbeer-Extrakt',
    kicker: 'Feinkost',
    text: 'Natürlicher Extrakt aus schwarzen Maulbeeren, 100 % Fruchtkonzentrat – tiefdunkel und intensiv fruchtig.',
    formats: ['Flasche klein · [X] ml', 'Flasche groß · [X] ml'],
  },
  {
    key: 'nuesse-knabberzeug',
    num: '04',
    name: 'Nüsse & Knabberzeug',
    nameTr: 'Kuruyemiş',
    kicker: 'Klassiker',
    text: 'Knackige Klassiker für Snackregal und Teestunde – geröstet, gesalzen oder knusprig im Chips-Stil.',
    formats: ['Leblebi', 'Chips-Kichererbsen', 'Pistazien geröstet & gesalzen', 'Erdnüsse geröstet', 'je 200 g'],
  },
  {
    key: 'trend-suesswaren',
    num: '05',
    name: 'Trend-Süßwaren',
    nameTr: 'Labubu-Schokolade',
    kicker: 'Neu im Sortiment',
    text: 'Bunte Labubu-Schokolade – ein farbenfroher Hingucker für die Kasse und das Geschenkregal.',
    formats: ['Packung · [GEWICHT] g'],
    note: 'Labubu ist eine Marke ihres jeweiligen Inhabers. Hasret Nuts ist weder offizieller Partner noch Lizenznehmer des Markeninhabers.',
  },
]);

/* --------------------------------------------------------------- Formular-Optionen */

/** Art des Geschäfts (Händleranfrage). value = interner Schlüssel, label = Anzeige/Speicherung. */
const BUSINESS_TYPES = Object.freeze([
  { value: 'supermarkt', label: 'Internationaler Supermarkt' },
  { value: 'feinkost', label: 'Feinkostgeschäft' },
  { value: 'grosshandel', label: 'Großhandel' },
  { value: 'gastronomie', label: 'Gastronomie / Catering' },
  { value: 'sonstiges', label: 'Sonstiges' },
]);

/** Feedback-Arten (Werte laut Datenbank: feedback | bug | idee). */
const FEEDBACK_KINDS = Object.freeze([
  { value: 'feedback', label: 'Feedback', hint: 'Lob, Kritik oder ein Hinweis' },
  { value: 'bug', label: 'Fehler melden', hint: 'Etwas funktioniert nicht' },
  { value: 'idee', label: 'Idee', hint: 'Ein Vorschlag für uns' },
]);

/* ------------------------------------------------------------------ Messe-Chronik */

/**
 * Stationen der Zeitleiste – neue Messen einfach als weiteren Eintrag ergänzen.
 * Messedaten erst eintragen, wenn sie offiziell bestätigt sind (sonst Platzhalter).
 * next: true = „Demnächst“-Eintrag (hervorgehoben, mit Termin-Button).
 */
const TIMELINE = Object.freeze([
  {
    meta: '[MONAT JAHR] · Memmingen',
    title: 'Der Anfang',
    text: 'Mit einer klaren Idee und einem ausgewählten Sortiment beginnt die Geschichte von Hasret Kuruyemiş: Spezialitäten in einer Qualität anzubieten, die man sonst nur vom Basar kennt.',
    photo: 'C-16',
  },
  {
    meta: '[MONAT JAHR] · Paris, Frankreich',
    title: 'Festiculture Paris',
    text: 'Unser Auftritt in Paris: Tage voller Begegnungen, Gespräche und Kostproben – und die Erkenntnis, dass Sehnsucht in jeder Sprache verstanden wird.',
    photo: 'C-17',
  },
  {
    meta: '[MONAT JAHR] · Lyon, Frankreich',
    title: 'Festiculture Lyon',
    text: 'Ein Stand, an dem man stehen bleibt: geröstete Pistazien, duftendes Sarma Lokum und viele Gespräche mit Händlern und Genießern aus ganz Europa.',
    photo: 'C-18',
  },
  {
    meta: '[DATUM] · [STADT, LAND]',
    title: 'Nächste Station: [MESSE]',
    text: 'Wir freuen uns auf Ihren Besuch. Händler und Einkäufer können vorab einen persönlichen Termin an unserem Stand vereinbaren.',
    photo: 'C-19',
    next: true,
  },
]);

/** Nächste Messe (Karte „Demnächst“ und Startseiten-Teaser). */
const NEXT_FAIR = Object.freeze({
  title: 'Festiculture · [STADT]',
  dates: '[DATUM VON] – [DATUM BIS]',
  place: 'Halle [X] · Stand [NR.]',
  teaserMeta: '[DATUM] · Halle [X] · Stand [NR.]',
  calendarNote: '[KALENDER-EINTRAG: Die .ics-Datei mit Datum, Halle und Stand wird hier verlinkt, sobald die Messedaten feststehen.]',
});

/* ---------------------------------------------------------------- Häufige Fragen */

/** Antworten in eckigen Klammern sind Platzhalter – sie erscheinen NICHT im FAQ-Markup für Google. */
const FAQ = Object.freeze([
  {
    q: 'Gibt es eine Mindestbestellmenge?',
    a: '[ANTWORT: z. B. Mindestbestellwert oder Mindestmenge pro Sorte – und ob die erste Bestellung kleiner ausfallen darf.]',
  },
  {
    q: 'Können wir die Produkte vorab probieren?',
    a: 'Ja. Nach Ihrer Anfrage stellen wir Ihnen gern ein Probierset aus den Sortimenten zusammen, die Sie interessieren.',
  },
  {
    q: 'Liefern Sie auch außerhalb Süddeutschlands?',
    a: '[ANTWORT: Liefergebiet und Bedingungen außerhalb von Bayern und Baden-Württemberg.]',
  },
  {
    q: 'Sind Allergen- und Produktdatenblätter verfügbar?',
    a: 'Ja. Für jedes Produkt erhalten Sie auf Anfrage die Angaben laut Etikett – Zutaten, Allergene, Nährwerte und Mindesthaltbarkeit. [Bitte bestätigen]',
  },
]);

/** true, wenn ein Text noch Platzhalter in eckigen Klammern enthält. */
function hasPlaceholder(text) {
  return /\[[^\]]+\]/.test(String(text || ''));
}

module.exports = {
  CONTACT,
  PHOTOS,
  ASSORTMENT,
  BUSINESS_TYPES,
  FEEDBACK_KINDS,
  TIMELINE,
  NEXT_FAIR,
  FAQ,
  hasPlaceholder,
};
