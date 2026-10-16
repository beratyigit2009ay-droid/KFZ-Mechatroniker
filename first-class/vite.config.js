import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ isSsrBuild }) => ({
  // Relative Pfade: Die fertige Website funktioniert auf jeder Domain,
  // in jedem Unterordner und auch direkt aus dem Dateisystem.
  base: './',
  plugins: [react(), tailwindcss()],
  build: isSsrBuild
    ? { outDir: '.ssr', emptyOutDir: true, copyPublicDir: false }
    : {
        outDir: 'dist',
        emptyOutDir: true,
        modulePreload: false,
        assetsInlineLimit: 0,
        cssCodeSplit: false,
        rollupOptions: {
          // Klassisches Skript statt ES-Modul: läuft auch beim Öffnen per Doppelklick.
          output: { format: 'iife', entryFileNames: 'assets/app-[hash].js' },
        },
      },
}))
