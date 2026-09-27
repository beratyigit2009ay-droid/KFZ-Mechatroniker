import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';
import { companies, DEFAULT_COMPANY } from './src/companies/registry.ts';
import { renderHead, renderNoscript } from './src/lib/seo.ts';
import type { Company } from './src/types.ts';

/**
 * Ein Build = ein Betrieb. Auswahl über den Modus oder die Umgebungsvariable COMPANY:
 *   npm run dev:patran          (= vite --mode patran)
 *   COMPANY=patran npm run dev
 * STANDALONE=1 erzeugt eine einzelne, offline lauffähige HTML-Datei.
 */
function resolveCompany(mode: string): { slug: string; company: Company } {
  const slug = process.env.COMPANY ?? (mode in companies ? mode : DEFAULT_COMPANY);
  const company = companies[slug];
  if (!company) {
    throw new Error(`Unbekannter Betrieb "${slug}". Verfügbar: ${Object.keys(companies).join(', ')}`);
  }
  return { slug, company };
}

function companyHtml(c: Company): Plugin {
  return {
    name: 'company-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace('<!--app-head-->', renderHead(c)).replace('<!--app-noscript-->', renderNoscript(c)),
    },
  };
}

export default defineConfig(({ mode }) => {
  const { slug, company } = resolveCompany(mode);
  const standalone = process.env.STANDALONE === '1';
  return {
    base: './',
    plugins: [react(), tailwindcss(), companyHtml(company), standalone ? viteSingleFile() : null],
    resolve: {
      alias: { '@company': path.resolve(import.meta.dirname, 'src/companies', slug) },
    },
    build: {
      outDir: process.env.OUT_DIR ?? 'dist',
      emptyOutDir: true,
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      reportCompressedSize: false,
    },
    server: { port: 5173, host: true },
    preview: { port: 4173, host: true },
  };
});
