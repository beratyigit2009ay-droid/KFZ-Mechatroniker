/**
 * Baut alle Betriebe:
 *   dist/<slug>/          → Website zum Hosten (vorgerendert, Assets getrennt)
 *   dist/index.html       → Übersicht
 *   standalone/<slug>.html → eine einzelne Datei, offline per Doppelklick lauffähig
 *
 *   node scripts/build-all.mjs                  # alle
 *   node scripts/build-all.mjs --company sauter # einer
 *   node scripts/build-all.mjs --no-standalone
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const pick = argv.includes('--company') ? argv[argv.indexOf('--company') + 1].split(',') : null;
const withStandalone = !argv.includes('--no-standalone');

const slugs = (await readdir(path.join(root, 'src/companies'), { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((s) => !pick || pick.includes(s));

const vite = (args, env) =>
  execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), ...args], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, ...env },
  });

if (!pick) await rm(path.join(root, 'dist'), { recursive: true, force: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const meta = [];

for (const slug of slugs) {
  const t0 = Date.now();
  const out = path.join(root, 'dist', slug);

  // 1) Client-Build
  vite(['build'], { COMPANY: slug, OUT_DIR: out });

  // 2) Vorrendern
  const ssrOut = path.join(root, '.ssr', slug);
  vite(['build', '--ssr', 'src/entry-server.tsx', '--outDir', ssrOut], { COMPANY: slug, OUT_DIR: ssrOut });
  const { render } = await import(pathToFileURL(path.join(ssrOut, 'entry-server.js')).href + `?v=${Date.now()}`);
  const indexFile = path.join(out, 'index.html');
  const html = await readFile(indexFile, 'utf8');
  if (!html.includes('<!--app-html-->')) throw new Error(`${slug}: Platzhalter <!--app-html--> fehlt`);
  // Das SSR-Bundle kennt nur absolute Asset-Pfade → relativ machen (Seite liegt in Unterordnern)
  const markup = render().replaceAll('"/assets/', '"./assets/');
  await writeFile(indexFile, html.replace('<!--app-html-->', markup));
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? slug;
  const accent = html.match(/--accent:(#[0-9a-fA-F]{3,8})/)?.[1] ?? '#fff';
  meta.push({ slug, title, accent });

  // 3) Einzeldatei – ebenfalls vorgerendert, damit Inhalte auch ohne laufendes Skript sichtbar sind
  if (withStandalone) {
    const tmp = path.join(root, '.standalone', slug);
    vite(['build'], { COMPANY: slug, OUT_DIR: tmp, STANDALONE: '1' });
    const ssrTmp = path.join(root, '.standalone', `${slug}-ssr`);
    vite(['build', '--ssr', 'src/entry-server.tsx', '--outDir', ssrTmp], {
      COMPANY: slug,
      OUT_DIR: ssrTmp,
      STANDALONE: '1',
    });
    const { render: renderStandalone } = await import(
      pathToFileURL(path.join(ssrTmp, 'entry-server.js')).href + `?v=${Date.now()}`
    );
    const single = await readFile(path.join(tmp, 'index.html'), 'utf8');
    if (!single.includes('<!--app-html-->')) throw new Error(`${slug}: Platzhalter in Einzeldatei fehlt`);
    await mkdir(path.join(root, 'standalone'), { recursive: true });
    // Funktions-Ersetzung, damit "$" in Base64-Daten nicht als Ersetzungsmuster gilt
    await writeFile(
      path.join(root, 'standalone', `${slug}.html`),
      single.replace('<!--app-html-->', () => renderStandalone()),
    );
  }
  console.log(`✓ ${slug} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// Restaurant-Entwürfe (reines HTML/CSS/JS aus restaurants/)
if (!pick) {
  execFileSync(process.execPath, [path.join(root, 'scripts/build-restaurants.mjs')], { cwd: root, stdio: 'inherit' });
  meta.push({ slug: 'beef-brothers', title: 'Beef Brothers Bad Saulgau', accent: '#ff5a1f' });
}

await rm(path.join(root, '.ssr'), { recursive: true, force: true });
await rm(path.join(root, '.standalone'), { recursive: true, force: true });

// Übersichtsseiten
const overview = (hrefFor) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Website-Entwürfe · Übersicht</title>
<style>
:root{color-scheme:dark}body{margin:0;background:#07080a;color:#f3f4f6;font:16px/1.5 system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:64px 20px}h1{font-size:clamp(28px,5vw,44px);letter-spacing:-.02em;margin:0 0 8px}
p{color:#8b919b;margin:0 0 40px}ul{list-style:none;padding:0;display:grid;gap:12px}
a{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 24px;border:1px solid rgb(255 255 255/.1);border-radius:18px;color:inherit;text-decoration:none;background:#0e1014;transition:border-color .3s}
a:hover{border-color:var(--c)}span{font-weight:600}small{color:#8b919b}i{width:12px;height:12px;border-radius:50%;background:var(--c);flex:none}
</style></head><body><main><h1>Website-Entwürfe</h1><p>Konzeptentwürfe – eine Website pro Betrieb.</p><ul>
${meta
  .map((m) => `<li><a href="${hrefFor(m.slug)}" style="--c:${m.accent}"><i></i><span style="flex:1">${esc(m.title.split(' | ')[0])}</span><small>${esc(m.slug)}</small></a></li>`)
  .join('\n')}
</ul></main></body></html>`;

if (!pick) {
  await writeFile(path.join(root, 'dist', 'index.html'), overview((s) => `./${s}/`));
  if (withStandalone) await writeFile(path.join(root, 'standalone', 'index.html'), overview((s) => `./${s}.html`));
}
console.log('Fertig → dist/' + (withStandalone ? ' und standalone/' : ''));
