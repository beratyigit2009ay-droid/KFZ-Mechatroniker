import type { Company } from '../types';

export const telHref = (c: Company) => `tel:${c.phone.tel}`;

export const fullAddress = (c: Company) =>
  `${c.address.street}, ${c.address.zip} ${c.address.city}${c.address.district ? `-${c.address.district}` : ''}`;

export const cityLine = (c: Company) =>
  `${c.address.zip} ${c.address.city}${c.address.district ? `-${c.address.district}` : ''}`;

/** Google-Maps-Suche nach Name + Adresse (öffnet Eintrag inkl. Bewertungen). */
export const mapsSearchUrl = (c: Company) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.name}, ${fullAddress(c)}`)}`;

export const directionsUrl = (c: Company) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${c.name}, ${fullAddress(c)}`)}`;

export const mapsEmbedUrl = (c: Company) =>
  `https://www.google.com/maps?q=${encodeURIComponent(`${c.name}, ${fullAddress(c)}`)}&z=15&output=embed`;

export const formatRating = (v: number) => v.toFixed(1).replace('.', ',');
