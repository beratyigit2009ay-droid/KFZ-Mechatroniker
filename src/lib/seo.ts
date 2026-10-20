import type { Company } from '../types.ts';
import { SCHEMA_DAY, WEEKDAYS } from './hours.ts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** SVG-Favicon aus Initialen und Markenfarbe. */
export function faviconDataUrl(c: Company): string {
  const size = c.initials.length > 1 ? 26 : 34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0b0c0f"/><circle cx="32" cy="32" r="23" fill="none" stroke="${c.theme.accent}" stroke-width="4" stroke-dasharray="118 200" stroke-linecap="round" transform="rotate(130 32 32)"/><text x="32" y="${32 + size * 0.36}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${size}" fill="#f3f4f6">${esc(c.initials)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Strukturierte Daten (schema.org/AutoRepair) – ausschließlich belegte Angaben. */
export function jsonLd(c: Company): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: c.name,
    description: c.seo.description,
    telephone: c.phone.tel,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.address.street,
      postalCode: c.address.zip,
      addressLocality: c.address.district ? `${c.address.city}-${c.address.district}` : c.address.city,
      addressRegion: 'Baden-Württemberg',
      addressCountry: 'DE',
    },
  };
  if (c.email && !c.emailPlaceholder) data.email = c.email;
  if (c.website) data.url = c.website;
  if (c.hours) {
    data.openingHoursSpecification = WEEKDAYS.flatMap((d) =>
      (c.hours?.[d] ?? []).map((r) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: SCHEMA_DAY[d],
        opens: r.from,
        closes: r.to,
      })),
    );
  }
  return JSON.parse(JSON.stringify(data));
}

export function renderHead(c: Company): string {
  const tags = [
    `<title>${esc(c.seo.title)}</title>`,
    `<meta name="description" content="${esc(c.seo.description)}" />`,
    c.draft
      ? `<meta name="robots" content="noindex, nofollow" />`
      : `<meta name="robots" content="index, follow" />`,
    `<meta name="theme-color" content="#07080a" />`,
    `<meta name="color-scheme" content="dark" />`,
    `<meta name="format-detection" content="telephone=no" />`,
    `<link rel="icon" href="${faviconDataUrl(c)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="de_DE" />`,
    `<meta property="og:site_name" content="${esc(c.name)}" />`,
    `<meta property="og:title" content="${esc(c.seo.title)}" />`,
    `<meta property="og:description" content="${esc(c.seo.description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    c.website ? `<link rel="canonical" href="${esc(c.website)}" />` : '',
    `<style>:root{--accent:${c.theme.accent};--accent-ink:${c.theme.accentInk};}</style>`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd(c)).replace(/</g, '\\u003c')}</script>`,
  ];
  return tags.filter(Boolean).join('\n    ');
}

/** Fallback ohne JavaScript: Name, Adresse, Telefon. */
export function renderNoscript(c: Company): string {
  return `<noscript><div style="padding:32px;font-family:system-ui,sans-serif;color:#f3f4f6;background:#07080a"><h1>${esc(c.name)}</h1><p>${esc(c.industry)}</p><p>${esc(c.address.street)}, ${esc(c.address.zip)} ${esc(c.address.city)}${c.address.district ? '-' + esc(c.address.district) : ''}</p><p><a style="color:${c.theme.accent}" href="tel:${c.phone.tel}">${esc(c.phone.display)}</a></p></div></noscript>`;
}
