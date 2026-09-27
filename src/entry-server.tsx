/**
 * Server-Einstieg fürs Vorrendern (SSG): liefert das statische HTML der Seite,
 * damit Inhalte ohne JavaScript für Suchmaschinen lesbar sind.
 * Wird von scripts/build-all.mjs aufgerufen.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
