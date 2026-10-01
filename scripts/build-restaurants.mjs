/**
 * Baut die Restaurant-Entwürfe aus restaurants/<slug>/ (reines HTML/CSS/JS, kein Bundler nötig):
 *   dist/<slug>/            → Website zum Hosten (Dateien unverändert kopiert)
 *   standalone/<slug>.html  → eine einzelne Datei mit eingebetteten Schriften, CSS und JS
 *
 *   node scripts/build-restaurants.mjs
 */
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'restaurants');

const slugs = (await readdir(srcRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);

for (const slug of slugs) {
  const dir = path.join(srcRoot, slug);

  // 1) Hosting-Version
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await cp(dir, path.join(root, 'dist', slug), { recursive: true, filter: (f) => path.basename(f) !== 'README.md' });

  // 2) Einzeldatei
  let html = await readFile(path.join(dir, 'index.html'), 'utf8');
  let css = await readFile(path.join(dir, 'styles.css'), 'utf8');
  const js = await readFile(path.join(dir, 'main.js'), 'utf8');

  const fontUrls = [...new Set([...css.matchAll(/url\('(fonts\/[^']+\.woff2)'\)/g)].map((m) => m[1]))];
  for (const rel of fontUrls) {
    const b64 = (await readFile(path.join(dir, rel))).toString('base64');
    css = css.replaceAll(`url('${rel}')`, `url(data:font/woff2;base64,${b64})`);
  }

  html = html
    .replace(/\s*<link rel="preload"[^>]*as="font"[^>]*>/g, '')
    .replace('<link rel="stylesheet" href="styles.css" />', () => `<style>\n${css}\n</style>`)
    .replace('<script src="main.js" defer></script>', () => `<script>\n${js}\n</script>`);

  if (html.includes('href="styles.css"') || html.includes('src="main.js"')) {
    throw new Error(`${slug}: CSS/JS konnte nicht eingebettet werden`);
  }
  await mkdir(path.join(root, 'standalone'), { recursive: true });
  await writeFile(path.join(root, 'standalone', `${slug}.html`), html);
  console.log(`✓ ${slug} → dist/${slug}/ und standalone/${slug}.html (${(html.length / 1024).toFixed(0)} KB)`);
}
