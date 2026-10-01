/**
 * Zugriff auf den aktiven Betrieb. `@company` zeigt – je nach Build – auf
 * `src/companies/<slug>/` (siehe vite.config.ts).
 */
import company from '@company/company';
import hero from '@company/renders/hero.webp';
import brake from '@company/renders/brake.webp';
import rim from '@company/renders/rim.webp';
import engine from '@company/renders/engine.webp';
import tools from '@company/renders/tools.webp';
import spark from '@company/renders/spark.webp';
import type { ImageKey } from '../types';

export const images: Record<ImageKey, string> = { brake, rim, engine, tools, spark };
export const heroImage = hero;

/** Alternativtexte der Bildmotive */
export const imageAlt: Record<ImageKey, string> = {
  brake: 'Gelochte Bremsscheibe mit Bremssattel in Markenfarbe',
  rim: 'Leichtmetallfelge mit Bremsanlage in Nahaufnahme',
  engine: 'Kolben und Pleuel eines Verbrennungsmotors',
  tools: 'Ring-Maulschlüssel und Stecknüsse auf dunkler Werkbankmatte',
  spark: 'Zündkerzen in Nahaufnahme',
};

export default company;
