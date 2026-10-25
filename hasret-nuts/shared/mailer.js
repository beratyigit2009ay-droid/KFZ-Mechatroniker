'use strict';
/**
 * E-Mail-Versand (FOUNDATION-CORE).
 *
 *   const mailer = require('../shared/mailer');
 *   await mailer.sendMail({ to, subject, text, html, replyTo });
 *   await mailer.send('verifyEmail', user.email, { name: user.name, url });   // Vorlage + Versand
 *   mailer.templates.orderConfirmation({ order, items, shopUrl })            // -> { subject, text, html }
 *
 * Transport (MAIL_TRANSPORT):
 *   smtp   – Produktion: nodemailer über SMTP_HOST/PORT/USER/PASS
 *   file   – Entwicklung (Standard): .eml-Dateien in var/mail, erster Link wird geloggt
 *   memory – Tests (Standard bei NODE_ENV=test): Mails landen im Array mailer.outbox
 *
 * Schutz vor Header-Injection: CR/LF werden aus Betreff und Namen entfernt, alle
 * Adressen streng validiert (keine Kommas, Klammern, Zeilenumbrüche).
 * sendMail() wirft bei ungültigen Adressen oder Versandfehlern – Aufrufer fangen das ab
 * und zeigen dem Nutzer eine neutrale Meldung.
 */
const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');
const config = require('./config');
const { templates } = require('./mail-templates');
const { EMAIL_RE } = require('./validate');

/** Nur bei MAIL_TRANSPORT=memory befüllt (Tests). Einträge: { to, toList, from, replyTo, subject, text, html, date } */
const outbox = [];

let smtpTransport = null;
let smtpKey = null;
let fileTransport = null;

function stripHeaderChars(value, max = 200) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\r\n\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
    .trim()
    .slice(0, max);
}

function validAddress(address) {
  return typeof address === 'string' && address.length <= 254 && EMAIL_RE.test(address);
}

function normalizeRecipients(to) {
  const list = (Array.isArray(to) ? to : [to]).map((a) => (typeof a === 'string' ? a.trim() : a));
  if (list.length === 0 || list.length > 10) throw mailError('Ungültige Empfängerliste');
  for (const a of list) if (!validAddress(a)) throw mailError('Ungültige Empfängeradresse');
  return list;
}

function mailError(message) {
  const err = new Error(message);
  err.code = 'MAIL_INVALID';
  return err;
}

function fromHeader() {
  const f = config.mail.from;
  if (!f || !validAddress(f.address)) throw mailError('MAIL_FROM ist nicht konfiguriert');
  return { name: stripHeaderChars(f.name || 'Hasret Nuts', 80), address: f.address };
}

function getSmtp() {
  const s = config.mail.smtp;
  const key = JSON.stringify([s.host, s.port, s.secure, s.user]);
  if (!smtpTransport || smtpKey !== key) {
    smtpTransport = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      requireTLS: !s.secure,
      auth: s.user ? { user: s.user, pass: s.pass } : undefined,
      tls: { minVersion: 'TLSv1.2' },
    });
    smtpKey = key;
  }
  return smtpTransport;
}

function getFileTransport() {
  if (!fileTransport) fileTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  return fileTransport;
}

function firstLink(text) {
  const m = /https?:\/\/[^\s<>"]+/.exec(String(text || ''));
  return m ? m[0] : null;
}

/**
 * Versendet eine E-Mail. → Promise<{ messageId, accepted }>
 * @param {{to: string|string[], subject: string, text: string, html?: string, replyTo?: string}} msg
 */
async function sendMail({ to, subject, text, html, replyTo } = {}) {
  const toList = normalizeRecipients(to);
  const cleanSubject = stripHeaderChars(subject, 200);
  if (!cleanSubject) throw mailError('Betreff fehlt');
  if (typeof text !== 'string' || !text) throw mailError('Text fehlt');
  let reply;
  const replyCandidate = replyTo || (config.mail.replyTo && config.mail.replyTo.address);
  if (replyCandidate) {
    if (!validAddress(String(replyCandidate).trim())) throw mailError('Ungültige Antwortadresse');
    reply = String(replyCandidate).trim();
  }
  const from = fromHeader();
  const message = {
    from,
    to: toList,
    subject: cleanSubject,
    text,
    html: typeof html === 'string' && html ? html : undefined,
    replyTo: reply,
    disableFileAccess: true,
    disableUrlAccess: true,
  };

  const transport = config.mail.transport;
  if (transport === 'memory') {
    const entry = {
      to: toList.join(', '),
      toList,
      from: `${from.name} <${from.address}>`,
      replyTo: reply || null,
      subject: cleanSubject,
      text,
      html: message.html || null,
      date: new Date(),
    };
    outbox.push(entry);
    return { messageId: `memory-${outbox.length}`, accepted: toList };
  }

  if (transport === 'file') {
    const info = await getFileTransport().sendMail(message);
    fs.mkdirSync(config.mail.dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const slug = cleanSubject
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    const file = path.join(config.mail.dir, `${stamp}-${slug || 'mail'}.eml`);
    fs.writeFileSync(file, info.message);
    const link = firstLink(text);
    console.log(`[mail] an ${toList.join(', ')} · ${cleanSubject} → ${path.relative(config.rootDir, file)}${link ? `\n[mail] Link: ${link}` : ''}`);
    return { messageId: info.messageId, accepted: toList };
  }

  const info = await getSmtp().sendMail(message);
  return { messageId: info.messageId, accepted: info.accepted };
}

/**
 * Rendert eine Vorlage und versendet sie. → Promise<{ messageId, accepted }>
 *   await mailer.send('resetPassword', email, { name, url, ttlMinutes: 60 })
 */
async function send(templateName, to, data = {}, opts = {}) {
  const tpl = templates[templateName];
  if (typeof tpl !== 'function') throw new Error(`Unbekannte Mail-Vorlage: ${templateName}`);
  const { subject, text, html } = tpl(data);
  return sendMail({ to, subject, text, html, replyTo: opts.replyTo });
}

/** Empfängeradresse des Inhabers (OWNER_EMAIL). */
function ownerEmail() {
  return config.mail.ownerEmail;
}

module.exports = { sendMail, send, templates, outbox, ownerEmail, stripHeaderChars, validAddress };
