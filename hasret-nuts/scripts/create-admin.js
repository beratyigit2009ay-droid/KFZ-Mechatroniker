#!/usr/bin/env node
'use strict';
/**
 * npm run create-admin – legt ein Administratorkonto an oder befördert ein bestehendes Konto.
 *
 * Interaktiv (empfohlen):  npm run create-admin
 * Nicht interaktiv (z. B. bei der Ersteinrichtung auf dem Server – danach Variablen wieder entfernen!):
 *   ADMIN_EMAIL=inhaber@ihre-domain.de ADMIN_PASSWORD='…' npm run create-admin
 *
 * Es werden KEINE Zugangsdaten im Code oder in Dateien gespeichert; das Passwort liegt nur als
 * scrypt-Hash in der Datenbank.
 */
const readline = require('node:readline');
const { migrate, getDb, closeDb, nowIso } = require('../shared/db');
const auth = require('../shared/auth');
const { parse, schemas } = require('../shared/validate');

let rl = null;
let masked = false;
let inputClosed = false;
const queue = [];
const waiters = [];

function getRl() {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (str) => {
      if (!masked) return write(str);
      if (str.includes('\n') || str.includes('\r')) return write('\n');
      return write('*'.repeat(str.length));
    };
    rl.on('line', (line) => {
      const w = waiters.shift();
      if (w) w.resolve(line);
      else queue.push(line);
    });
    rl.on('close', () => {
      inputClosed = true;
      while (waiters.length) waiters.shift().reject(new Error('Eingabe abgebrochen.'));
    });
  }
  return rl;
}

/** Eine Frage stellen (gepufferte Zeilen – funktioniert interaktiv und mit umgeleiteter Eingabe). */
function ask(question, { hidden = false } = {}) {
  getRl();
  process.stdout.write(question);
  if (queue.length) return Promise.resolve(queue.shift());
  if (inputClosed) return Promise.reject(new Error('Eingabe abgebrochen.'));
  masked = hidden && Boolean(process.stdin.isTTY);
  return new Promise((resolve, reject) => {
    waiters.push({
      resolve: (value) => {
        masked = false;
        resolve(value);
      },
      reject,
    });
  });
}

async function main() {
  migrate();
  const fromEnv = Boolean(process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD);
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;

  if (!email) email = await ask('E-Mail-Adresse des Administrators: ');
  const e = parse(schemas.email, email);
  if (!e.ok) throw new Error(e.errors._form || Object.values(e.errors)[0] || 'Ungültige E-Mail-Adresse');
  email = e.data;

  const existing = auth.findUserByEmail(email);
  if (!password) {
    const prompt = existing ? 'Neues Passwort (leer lassen = Passwort beibehalten): ' : 'Passwort (mind. 10 Zeichen): ';
    password = await ask(prompt, { hidden: true });
    if (password) {
      const again = await ask('Passwort wiederholen: ', { hidden: true });
      if (again !== password) throw new Error('Die Passwörter stimmen nicht überein.');
    }
  }
  if (password || !existing) {
    const p = parse(schemas.password, password || '');
    if (!p.ok) throw new Error(Object.values(p.errors)[0]);
    if (password.toLowerCase() === email.toLowerCase()) throw new Error('Das Passwort darf nicht der E-Mail-Adresse entsprechen.');
  }

  if (existing) {
    getDb()
      .prepare("UPDATE users SET role = 'admin', email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?")
      .run(nowIso(), nowIso(), existing.id);
    if (password) await auth.updatePassword(existing.id, password);
    auth.logSecurityEvent('admin_promoted', existing.id, null);
    console.log(`Konto ${email} ist jetzt Administrator${password ? ' (Passwort neu gesetzt, alle Sitzungen beendet)' : ''}.`);
  } else {
    const name = fromEnv ? process.env.ADMIN_NAME || 'Administrator' : (await ask('Name (optional): ')) || 'Administrator';
    const nameCheck = parse(schemas.name, name);
    const user = await auth.createUser({ email, password, name: nameCheck.ok ? nameCheck.data : 'Administrator', role: 'admin', emailVerified: true });
    auth.logSecurityEvent('admin_created', user.id, null);
    console.log(`Administrator ${email} wurde angelegt. Anmeldung im Shop unter /konto/anmelden, Verwaltung unter /admin.`);
  }
  if (fromEnv) console.log('Hinweis: Entfernen Sie ADMIN_EMAIL/ADMIN_PASSWORD wieder aus Umgebung und Shell-Verlauf.');
}

main()
  .catch((err) => {
    console.error(`Fehler: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (rl) rl.close();
    closeDb();
  });
