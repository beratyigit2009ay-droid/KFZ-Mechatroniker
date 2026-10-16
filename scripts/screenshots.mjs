/**
 * Visuelle Kontrolle: fährt die Seite Abschnitt für Abschnitt ab und speichert
 * Screenshots (Desktop + Mobil). Erwartet einen laufenden Server.
 *
 *   node scripts/screenshots.mjs --url http://localhost:4173/sauter/ --out shots/sauter
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const url = args.url ?? 'http://localhost:4173/';
const out = path.resolve(args.out ?? 'shots');
const only = args.device ? args.device.split(',') : ['desktop', 'mobile'];
const sections = (args.sections ?? 'top,leistungen,warum,ueber-uns,werkstatt,fahrzeug,bewertungen,termin,faq,kontakt,footer').split(',');

const devices = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  for (const name of only) {
    const ctx = await browser.newContext(devices[name]);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(Number(args.wait ?? 3500));
    for (const id of sections) {
      if (id !== 'top') {
        await page.evaluate((sel) => {
          const el = sel === 'footer' ? document.querySelector('footer') : document.getElementById(sel);
          if (!el) return;
          const y = el.getBoundingClientRect().top + window.scrollY - (sel === 'footer' ? 0 : 76);
          // in Schritten scrollen, damit Scroll-Animationen auslösen
          window.scrollTo({ top: y, behavior: 'instant' });
        }, id);
        await page.waitForTimeout(1600);
      }
      await page.screenshot({ path: path.join(out, `${name}-${id}.png`) });
    }
    if (errors.length) console.log(`[${name}] Fehler:\n  ${[...new Set(errors)].join('\n  ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log('Screenshots →', out);
