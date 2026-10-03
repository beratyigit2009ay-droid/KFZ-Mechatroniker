'use strict';
/**
 * Eingabeprüfung mit zod (FOUNDATION-CORE) – deutsche Fehlermeldungen.
 *
 *   const { parse, schemas, z, optional, refinements } = require('../shared/validate');
 *   const Form = z.object({ email: schemas.email, name: schemas.name, message: schemas.text(2000), phone: optional(schemas.phone) });
 *   const r = parse(Form, req.body);   // -> { ok, data, errors: { feld: 'Meldung' } }
 *   if (!r.ok) return res.status(422).render('…', { errors: r.errors, values: req.body });
 *
 * z.object() entfernt unbekannte Felder (z. B. _csrf, Honeypot) automatisch.
 * Einzeilige Felder (E-Mail, Name, Firma, Ort …) lehnen CR/LF und Steuerzeichen ab
 * (Header-/E-Mail-Injection); Textfelder erlauben Zeilenumbrüche (normalisiert auf \n).
 */
const { z } = require('zod');

z.config(z.locales.de());

// eslint-disable-next-line no-control-regex
const CTRL_SINGLE = /[\u0000-\u001f\u007f\u2028\u2029]/;
// eslint-disable-next-line no-control-regex
const CTRL_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/;
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
const COMPANY_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s&.,'’()/+–-]*$/u;
const CITY_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’()/-]*$/u;
const STREET_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,'’()/-]*$/u;
const PHONE_RE = /^\+?[0-9][0-9\s()/-]{4,28}[0-9]$/;

/** Kleine Liste häufiger Passwörter (Vergleich ohne Groß-/Kleinschreibung). */
const COMMON_PASSWORDS = new Set(
  [
    '1234567890', '12345678910', '0123456789', '9876543210', '1234567891', '123456789a', '123456789q',
    '1111111111', '0000000000', '1q2w3e4r5t', '1qaz2wsx3edc', 'qwertyuiop', 'qwertzuiop', 'asdfghjkl1',
    'yxcvbnm123', 'abcdefghij', 'abcdefg123', 'abc1234567', 'password12', 'password123', 'password1!',
    'password!!', 'passwort12', 'passwort123', 'passwort1!', 'passwort!!', 'passwort1234', 'password1234',
    'iloveyou12', 'letmein123', 'welcome123', 'willkommen', 'willkommen1', 'willkommen123', 'hallo12345',
    'hallohallo', 'geheim1234', 'geheimnis1', 'sommer2024', 'sommer2025', 'sommer2026', 'winter2024',
    'winter2025', 'winter2026', 'fussball12', 'fussball123', 'schalke04!', 'borussia09', 'bayern1900',
    'admin12345', 'administrator', 'changeme123', 'trustno1234', 'dragon1234', 'monkey1234', 'superman12',
    'football12', 'baseball12', 'princess12', 'sunshine12', 'starwars12', 'computer12', 'michael123',
    'hasretnuts', 'hasretnuts1', 'hasret1234', 'hasret12345', 'memmingen1', 'memmingen12', 'kuruyemis1',
    'qwerty1234', 'qwertz1234', 'q1w2e3r4t5', 'zaq12wsxcde', 'master1234', 'shadow1234', 'killer1234',
  ].map((p) => p.toLowerCase())
);

function str(requiredMessage) {
  return z.string({
    error: (iss) => (iss.input === undefined || iss.input === null ? requiredMessage : 'Ungültige Eingabe.'),
  });
}

function collapseSpaces(v) {
  return v.replace(/\s+/g, ' ').trim();
}

/** Macht ein Feld optional: leere Strings / nur Leerzeichen werden zu undefined. */
function optional(schema) {
  return z.preprocess(
    (v) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v),
    schema.optional()
  );
}

/** Mehrfachauswahl (Checkbox-Gruppen): Einzelwert oder Array -> Array. */
function arrayOf(schema, { max = 20, min = 0, minMessage = 'Bitte wählen Sie mindestens eine Option.' } = {}) {
  return z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? [] : Array.isArray(v) ? v : [v]),
    z.array(schema).min(min, minMessage).max(max, 'Zu viele Einträge ausgewählt.')
  );
}

/** Auswahl aus festen Werten. */
function oneOf(values, message = 'Bitte wählen Sie eine gültige Option.') {
  return z.enum(values, { error: () => message });
}

const email = str('Bitte geben Sie Ihre E-Mail-Adresse ein.')
  .max(254, 'Die E-Mail-Adresse ist zu lang.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Die E-Mail-Adresse enthält unzulässige Zeichen.')
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, 'Bitte geben Sie Ihre E-Mail-Adresse ein.')
      .regex(EMAIL_RE, 'Bitte geben Sie eine gültige E-Mail-Adresse ein (z. B. name@beispiel.de).')
  );

const password = str('Bitte geben Sie ein Passwort ein.')
  .min(1, 'Bitte geben Sie ein Passwort ein.')
  .min(10, 'Das Passwort muss mindestens 10 Zeichen lang sein.')
  .max(128, 'Das Passwort darf höchstens 128 Zeichen lang sein.')
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), 'Dieses Passwort ist zu leicht zu erraten. Bitte wählen Sie ein anderes.')
  .refine((v) => !/^(.)\1+$/u.test(v), 'Bitte verwenden Sie nicht nur ein einziges, wiederholtes Zeichen.');

/** Passwortfeld beim Login: nur Pflicht + Längenobergrenze, keine Stärkeprüfung. */
const currentPassword = str('Bitte geben Sie Ihr Passwort ein.')
  .min(1, 'Bitte geben Sie Ihr Passwort ein.')
  .max(1024, 'Ungültige Eingabe.');

const name = str('Bitte geben Sie Ihren Namen ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Der Name enthält unzulässige Zeichen.')
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .min(2, 'Bitte geben Sie Ihren Namen ein (mindestens 2 Zeichen).')
      .max(100, 'Der Name ist zu lang (höchstens 100 Zeichen).')
      .regex(NAME_RE, 'Der Name darf nur Buchstaben, Leerzeichen, Punkt, Apostroph und Bindestrich enthalten.')
  );

const company = str('Bitte geben Sie den Namen Ihres Unternehmens ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Der Firmenname enthält unzulässige Zeichen.')
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .min(2, 'Bitte geben Sie den Namen Ihres Unternehmens ein.')
      .max(150, 'Der Firmenname ist zu lang (höchstens 150 Zeichen).')
      .regex(COMPANY_RE, 'Der Firmenname enthält unzulässige Zeichen.')
  );

/** Telefon – mit optional(schemas.phone) als freiwilliges Feld verwenden. */
const phone = str('Bitte geben Sie Ihre Telefonnummer ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Die Telefonnummer enthält unzulässige Zeichen.')
  .transform(collapseSpaces)
  .pipe(z.string().regex(PHONE_RE, 'Bitte geben Sie eine gültige Telefonnummer ein (Ziffern, Leerzeichen, + ( ) / -).'));

const zip = str('Bitte geben Sie Ihre Postleitzahl ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Die Postleitzahl enthält unzulässige Zeichen.')
  .transform((v) => v.trim())
  .pipe(z.string().regex(/^(\d{5}|\d{4})$/, 'Bitte geben Sie eine gültige Postleitzahl ein (5 Ziffern in Deutschland, 4 in Österreich).'));

const city = str('Bitte geben Sie Ihren Ort ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Der Ort enthält unzulässige Zeichen.')
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .min(2, 'Bitte geben Sie Ihren Ort ein.')
      .max(100, 'Der Ortsname ist zu lang.')
      .regex(CITY_RE, 'Der Ort enthält unzulässige Zeichen.')
  );

const street = str('Bitte geben Sie Straße und Hausnummer ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Die Adresse enthält unzulässige Zeichen.')
  .transform(collapseSpaces)
  .pipe(
    z
      .string()
      .min(3, 'Bitte geben Sie Straße und Hausnummer ein.')
      .max(150, 'Die Adresse ist zu lang.')
      .regex(STREET_RE, 'Die Adresse enthält unzulässige Zeichen.')
  );

/**
 * Mehrzeiliger Text. text(max, { min = 1, requiredMessage })
 * Erlaubt Zeilenumbrüche/Tabs, lehnt sonstige Steuerzeichen ab, normalisiert \r\n -> \n.
 */
function text(max = 2000, { min = 1, requiredMessage = 'Bitte füllen Sie dieses Feld aus.' } = {}) {
  return str(requiredMessage)
    .refine((v) => !CTRL_TEXT.test(v), 'Der Text enthält unzulässige Steuerzeichen.')
    .transform((v) => v.replace(/\r\n?/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(Math.max(min, 1), min > 1 ? `Bitte schreiben Sie mindestens ${min} Zeichen.` : requiredMessage)
        .max(max, `Bitte kürzen Sie Ihren Text auf höchstens ${max} Zeichen.`)
    );
}

/** Einzeiliger Freitext (z. B. Betreff, Seiten-URL-Angabe). line(max) */
function line(max = 200, { requiredMessage = 'Bitte füllen Sie dieses Feld aus.' } = {}) {
  return str(requiredMessage)
    .refine((v) => !CTRL_SINGLE.test(v), 'Die Eingabe enthält unzulässige Zeichen.')
    .transform(collapseSpaces)
    .pipe(z.string().min(1, requiredMessage).max(max, `Bitte kürzen Sie die Eingabe auf höchstens ${max} Zeichen.`));
}

/** Rabattcode: Großbuchstaben, Ziffern, Bindestrich (3–32 Zeichen); wird in Großbuchstaben umgewandelt. */
const code = str('Bitte geben Sie einen Rabattcode ein.')
  .refine((v) => !CTRL_SINGLE.test(v), 'Bitte geben Sie einen gültigen Rabattcode ein.')
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9-]{3,32}$/, 'Bitte geben Sie einen gültigen Rabattcode ein.'));

/** Menge 1–99 (akzeptiert "3" aus Formularen). */
const quantity = z.preprocess(
  (v) => (typeof v === 'string' && /^\s*\d{1,3}\s*$/.test(v) ? Number(v) : v),
  z
    .number({ error: () => 'Bitte geben Sie eine gültige Menge an.' })
    .int('Bitte geben Sie eine gültige Menge an.')
    .min(1, 'Die Menge muss mindestens 1 betragen.')
    .max(99, 'Die Menge darf höchstens 99 betragen.')
);

/** SKU/Slug-Format (Existenz immer zusätzlich über catalog.js prüfen). */
const sku = str('Ungültiger Artikel.').regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/, 'Ungültiger Artikel.');
const slug = sku;

/** Checkbox: "on"/"1"/"true" -> true, sonst false. */
const checkbox = z.preprocess((v) => v === true || v === 'on' || v === '1' || v === 'true' || v === 'ja', z.boolean());

/** Pflicht-Checkbox (z. B. Datenschutz-Einwilligung). */
function consent(message = 'Bitte bestätigen Sie die Datenschutzhinweise.') {
  return checkbox.refine((v) => v === true, message);
}

const schemas = {
  email,
  password,
  currentPassword,
  name,
  company,
  phone,
  zip,
  city,
  street,
  text,
  line,
  code,
  quantity,
  sku,
  slug,
  checkbox,
  consent,
};

/** Objekt-Prüfungen für .superRefine(): */
const refinements = {
  /** Passwort darf nicht der E-Mail-Adresse (oder deren Teil vor dem @) entsprechen. */
  passwordNotEmail({ passwordField = 'password', emailField = 'email' } = {}) {
    return (val, ctx) => {
      const p = val && val[passwordField];
      const e = val && val[emailField];
      if (typeof p !== 'string' || typeof e !== 'string' || !e) return;
      const pl = p.trim().toLowerCase();
      if (pl === e.toLowerCase() || pl === e.split('@')[0].toLowerCase()) {
        ctx.addIssue({ code: 'custom', path: [passwordField], message: 'Das Passwort darf nicht Ihrer E-Mail-Adresse entsprechen.' });
      }
    };
  },
  /** Passwort-Wiederholung muss übereinstimmen. */
  passwordsMatch({ field = 'password', confirmField = 'passwordConfirm' } = {}) {
    return (val, ctx) => {
      if (val && val[field] !== val[confirmField]) {
        ctx.addIssue({ code: 'custom', path: [confirmField], message: 'Die Passwörter stimmen nicht überein.' });
      }
    };
  },
};

/**
 * Prüft input gegen ein zod-Schema.
 * → { ok: true, data, errors: {} } | { ok: false, data: null, errors: { feld: 'deutsche Meldung', _form?: '…' } }
 * Pro Feld wird nur die erste Meldung geliefert.
 */
function parse(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (result.success) return { ok: true, data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path && issue.path.length ? String(issue.path[0]) : '_form';
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, data: null, errors };
}

module.exports = {
  z,
  parse,
  schemas,
  optional,
  arrayOf,
  oneOf,
  refinements,
  EMAIL_RE,
  CTRL_SINGLE,
  CTRL_TEXT,
  COMMON_PASSWORDS,
};
