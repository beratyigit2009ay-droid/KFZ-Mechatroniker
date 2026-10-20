import type { OpeningHours, TimeRange, Weekday } from '../types.ts';

export const WEEKDAYS: Weekday[] = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'];
export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mo: 'Montag',
  di: 'Dienstag',
  mi: 'Mittwoch',
  do: 'Donnerstag',
  fr: 'Freitag',
  sa: 'Samstag',
  so: 'Sonntag',
};
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mo: 'Mo',
  di: 'Di',
  mi: 'Mi',
  do: 'Do',
  fr: 'Fr',
  sa: 'Sa',
  so: 'So',
};
export const SCHEMA_DAY: Record<Weekday, string> = {
  mo: 'Monday',
  di: 'Tuesday',
  mi: 'Wednesday',
  do: 'Thursday',
  fr: 'Friday',
  sa: 'Saturday',
  so: 'Sunday',
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const formatRange = (r: TimeRange) => `${r.from}–${r.to}`;
export const formatRanges = (ranges: TimeRange[] | undefined) =>
  ranges && ranges.length ? ranges.map(formatRange).join(' · ') : 'Geschlossen';

/** Aktueller Wochentag und Minute in Europe/Berlin – unabhängig von der Zeitzone des Geräts. */
export function berlinNow(date = new Date()): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const map: Record<string, Weekday> = {
    Mon: 'mo',
    Tue: 'di',
    Wed: 'mi',
    Thu: 'do',
    Fri: 'fr',
    Sat: 'sa',
    Sun: 'so',
  };
  return { day: map[get('weekday')] ?? 'mo', minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export type OpenState =
  | { kind: 'unknown' }
  | { kind: 'open'; until: string }
  | { kind: 'closed'; nextDay: Weekday; nextFrom: string; today: boolean };

/** Status laut regulärer Öffnungszeiten (Feiertage/Betriebsurlaub sind nicht berücksichtigt). */
export function openState(hours: OpeningHours | null, date = new Date()): OpenState {
  if (!hours) return { kind: 'unknown' };
  const { day, minutes } = berlinNow(date);
  const today = hours[day] ?? [];
  for (const r of today) {
    if (minutes >= toMinutes(r.from) && minutes < toMinutes(r.to)) return { kind: 'open', until: r.to };
  }
  const later = today.find((r) => toMinutes(r.from) > minutes);
  if (later) return { kind: 'closed', nextDay: day, nextFrom: later.from, today: true };
  const idx = WEEKDAYS.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const d = WEEKDAYS[(idx + i) % 7];
    const first = hours[d]?.[0];
    if (first) return { kind: 'closed', nextDay: d, nextFrom: first.from, today: false };
  }
  return { kind: 'unknown' };
}

export function describeOpenState(s: OpenState): string {
  switch (s.kind) {
    case 'open':
      return `Jetzt geöffnet · bis ${s.until} Uhr`;
    case 'closed':
      return s.today
        ? `Geschlossen · öffnet heute ${s.nextFrom} Uhr`
        : `Geschlossen · öffnet ${WEEKDAY_SHORT[s.nextDay]} ${s.nextFrom} Uhr`;
    default:
      return 'Öffnungszeiten telefonisch erfragen';
  }
}

/** Kompakte Zusammenfassung, z. B. „Mo–Do 07:30–12:00 · 13:00–17:30“ – gruppiert gleiche Tage. */
export function summarizeHours(hours: OpeningHours): { days: string; times: string }[] {
  const groups: { days: Weekday[]; key: string }[] = [];
  for (const d of WEEKDAYS) {
    const ranges = hours[d];
    if (!ranges?.length) continue;
    const key = formatRanges(ranges);
    const last = groups[groups.length - 1];
    const prevDay = last ? last.days[last.days.length - 1] : null;
    if (last && last.key === key && prevDay && WEEKDAYS.indexOf(prevDay) === WEEKDAYS.indexOf(d) - 1) {
      last.days.push(d);
    } else {
      groups.push({ days: [d], key });
    }
  }
  return groups.map((g) => ({
    days:
      g.days.length > 2
        ? `${WEEKDAY_SHORT[g.days[0]]}–${WEEKDAY_SHORT[g.days[g.days.length - 1]]}`
        : g.days.map((d) => WEEKDAY_SHORT[d]).join(', '),
    times: g.key,
  }));
}
