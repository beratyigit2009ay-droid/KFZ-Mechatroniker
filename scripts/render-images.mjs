/**
 * Rendert die 3D-Bildmotive für alle (oder ausgewählte) Betriebe.
 *
 *   node scripts/render-images.mjs                       # alles
 *   node scripts/render-images.mjs --company sauter      # ein Betrieb
 *   node scripts/render-images.mjs --scene hero,brake    # bestimmte Motive
 *   node scripts/render-images.mjs --out /tmp/test       # Testausgabe (PNG)
 *
 * Ergebnis: src/companies/<slug>/renders/<motiv>.webp
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);

/** Motiv → Ausgabegröße (px) und Supersampling-Faktor */
const SCENES = {
  hero: { w: 1400, h: 1400, ss: 1.5, alpha: true },
  brake: { w: 1600, h: 1200, ss: 1.5 },
  rim: { w: 1600, h: 1200, ss: 1.5 },
  tools: { w: 1600, h: 1200, ss: 1.5 },
  engine: { w: 1600, h: 1200, ss: 1.5 },
  spark: { w: 1600, h: 1200, ss: 1.5 },
};

const companiesDir = path.join(root, 'src/companies');
const slugs = args.company
  ? args.company.split(',')
  : (await readdir(companiesDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const scenes = args.scene ? args.scene.split(',') : Object.keys(SCENES);

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  server: { port: 5199, strictPort: false, hmr: false, watch: null },
});
await server.listen();
const base = server.resolvedUrls.local[0];

const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  for (const slug of slugs) {
    const { default: company } = await server.ssrLoadModule(`/src/companies/${slug}/company.ts`);
    const outDir = args.out ? path.resolve(args.out) : path.join(companiesDir, slug, 'renders');
    await mkdir(outDir, { recursive: true });
    for (const scene of scenes) {
      const spec = SCENES[scene];
      const w = Math.round(spec.w * spec.ss);
      const h = Math.round(spec.h * spec.ss);
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      page.on('console', (m) => m.type() === 'error' && console.error(`[${slug}/${scene}]`, m.text()));
      const params = new URLSearchParams({
        scene,
        w: String(w),
        h: String(h),
        accent: company.theme.accent,
        label: company.caliperLabel,
        initials: company.initials,
      });
      const t0 = Date.now();
      await page.goto(`${base}render/index.html?${params}`);
      await page.waitForFunction(() => window.__RENDER_RESULT__ || window.__RENDER_ERROR__, null, {
        timeout: 240_000,
      });
      const error = await page.evaluate(() => window.__RENDER_ERROR__);
      if (error) throw new Error(`${slug}/${scene}: ${error}`);
      const dataUrl = await page.evaluate(() => window.__RENDER_RESULT__);
      await page.close();
      const png = Buffer.from(dataUrl.split(',')[1], 'base64');
      const img = sharp(png).resize(spec.w, spec.h, { kernel: 'lanczos3' });
      const file = args.out
        ? path.join(outDir, `${slug}-${scene}.png`)
        : path.join(outDir, `${scene}.webp`);
      if (args.out) await img.png().toFile(file);
      else await img.webp({ quality: spec.alpha ? 82 : 78, alphaQuality: 90, effort: 6 }).toFile(file);
      console.log(`✓ ${slug}/${scene} (${((Date.now() - t0) / 1000).toFixed(1)} s) → ${path.relative(root, file)}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}
