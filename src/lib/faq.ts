import type { Company, FaqItem } from '../types';
import { summarizeHours } from './hours';
import { cityLine, formatRating } from './links';

/**
 * FAQ ausschließlich aus belegten Daten. Fehlt eine Angabe, verweist die
 * Antwort auf das Telefon – statt etwas zu behaupten.
 */
export function buildFaq(c: Company): FaqItem[] {
  const hours = c.hours
    ? summarizeHours(c.hours)
        .map((g) => `${g.days} ${g.times} Uhr`)
        .join('; ')
    : null;

  const items: FaqItem[] = [
    {
      q: 'Wie vereinbare ich einen Termin?',
      a: `Am schnellsten telefonisch unter ${c.phone.display}. ${
        hours ? `Erreichbar zu den Öffnungszeiten: ${hours}.` : 'Dort erfahren Sie auch, wann ein Termin möglich ist.'
      }`,
    },
    {
      q: 'Wann hat die Werkstatt geöffnet?',
      a: hours
        ? `${hours}. An Feiertagen können abweichende Zeiten gelten – im Zweifel kurz anrufen.`
        : `Die aktuellen Öffnungszeiten erfahren Sie telefonisch unter ${c.phone.display}.`,
    },
    {
      q: 'Wo finde ich die Werkstatt?',
      a: `${c.name}, ${c.address.street}, ${cityLine(c)}. Über „Route planen“ im Kontaktbereich öffnen Sie die Wegbeschreibung direkt in Google Maps.`,
    },
    {
      q: 'Welche Angaben sollte ich beim Anruf bereithalten?',
      a: 'Hilfreich sind Marke, Modell und Baujahr Ihres Fahrzeugs, der ungefähre Kilometerstand und eine kurze Beschreibung des Anliegens – etwa wann ein Geräusch auftritt oder welche Warnleuchte leuchtet. Die Angaben finden Sie meist in der Zulassungsbescheinigung Teil I.',
    },
    {
      q: 'Kann ich mein Anliegen vorab notieren?',
      a: 'Ja. Mit der Anfrage-Vorbereitung auf dieser Seite fassen Sie Fahrzeug und Anliegen in wenigen Klicks zusammen – so haben Sie beim Anruf alles beisammen. Es werden dabei keine Daten übertragen.',
    },
    {
      q: 'Wie wird die Werkstatt bewertet?',
      a: `Auf Google mit ${formatRating(c.rating.value)} von 5 Sternen bei ${c.rating.count} Bewertungen (Stand ${c.rating.asOf}). Alle Bewertungen können Sie direkt auf Google nachlesen.`,
    },
    {
      q: 'Wird meine gewünschte Leistung angeboten?',
      a: `Ob eine bestimmte Arbeit an Ihrem Fahrzeug übernommen werden kann, klärt ein kurzer Anruf unter ${c.phone.display} am schnellsten und verbindlichsten.`,
    },
  ];
  return [...items.slice(0, 2), ...c.faqExtra, ...items.slice(2)];
}
