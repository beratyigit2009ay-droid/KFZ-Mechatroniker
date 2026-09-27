/**
 * Alle Betriebe. Neuer Betrieb: Ordner `src/companies/<slug>/` mit
 * `company.ts` anlegen, hier eintragen, Renderings erzeugen (`npm run renders`).
 */
import type { Company } from '../types.ts';
import patran from './patran/company.ts';
import abdullahad from './abdullahad/company.ts';
import sauter from './sauter/company.ts';
import maurer from './maurer/company.ts';

export const companies: Record<string, Company> = { patran, abdullahad, sauter, maurer };
export const DEFAULT_COMPANY = 'sauter';
