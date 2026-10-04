/* Hasret Nuts · Konto & Verwaltung (Owner: BUILD-AUTH)
   Progressive Verbesserung – alle Formulare funktionieren auch ohne JavaScript.
   - Passwort anzeigen/verbergen ([data-pw])
   - Hinweis zur Passwortlänge und Übereinstimmung ([data-pw-meter], [data-pw-match])
   - Nachfrage vor folgenreichen Aktionen ([data-confirm="Text"])
   CSP: externe Datei, keine Inline-Handler. */
(function () {
  'use strict';

  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 4l16 16"/><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16.4 16.4 0 0 1-2.9 3.6M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18 12 18c1.5 0 2.9-.4 4.1-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* Passwort anzeigen / verbergen */
  $$('[data-pw] input[type="password"]').forEach(function (input) {
    var wrap = input.closest('[data-pw]');
    if (!wrap || wrap.querySelector('.pw__toggle')) return;
    wrap.classList.add('pw');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw__toggle';
    btn.setAttribute('aria-controls', input.id);
    var render = function (shown) {
      btn.innerHTML = (shown ? EYE_OFF : EYE) + '<span>' + (shown ? 'Verbergen' : 'Anzeigen') + '</span>';
      btn.setAttribute('aria-label', shown ? 'Passwort verbergen' : 'Passwort anzeigen');
      btn.setAttribute('aria-pressed', shown ? 'true' : 'false');
    };
    render(false);
    btn.addEventListener('click', function () {
      var shown = input.type === 'password';
      input.type = shown ? 'text' : 'password';
      render(shown);
      input.focus({ preventScroll: true });
    });
    // Beim Absenden wieder verbergen (Passwort-Manager, Bildschirmfotos)
    var form = input.form;
    if (form) form.addEventListener('submit', function () { input.type = 'password'; render(false); });
    input.parentNode.appendChild(btn);
  });

  /* Länge des neuen Passworts (mind. 10 Zeichen) */
  $$('[data-pw-meter]').forEach(function (meter) {
    var input = document.getElementById(meter.getAttribute('data-pw-meter'));
    if (!input) return;
    var fill = meter.querySelector('.pw-meter__fill');
    var text = meter.querySelector('.pw-meter__text');
    var min = 10;
    var update = function () {
      var n = input.value.length;
      var p = Math.min(1, n / min);
      if (fill) fill.style.setProperty('--p', String(p));
      meter.classList.toggle('is-ok', n >= min);
      if (text) text.textContent = n >= min ? 'Länge in Ordnung' : n === 0 ? 'Mindestens 10 Zeichen' : 'Noch ' + (min - n) + ' Zeichen';
    };
    input.addEventListener('input', update);
    meter.hidden = false;
    update();
  });

  /* Wiederholung stimmt überein? */
  $$('[data-pw-match]').forEach(function (out) {
    var ids = out.getAttribute('data-pw-match').split(',');
    var a = document.getElementById(ids[0]);
    var b = document.getElementById(ids[1]);
    if (!a || !b) return;
    var update = function () {
      if (!b.value) { out.textContent = ''; out.classList.remove('is-ok'); return; }
      var same = a.value === b.value;
      out.textContent = same ? 'Die Passwörter stimmen überein.' : 'Die Passwörter stimmen noch nicht überein.';
      out.classList.toggle('is-ok', same);
    };
    a.addEventListener('input', update);
    b.addEventListener('input', update);
    out.hidden = false;
  });

  /* Nachfrage vor folgenreichen Aktionen */
  $$('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) e.preventDefault();
    });
  });

  /* Doppeltes Absenden verhindern */
  $$('form[data-once]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      if (form.getAttribute('data-sent') === '1') { e.preventDefault(); return; }
      form.setAttribute('data-sent', '1');
      $$('button[type="submit"]', form).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); b.classList.add('is-busy'); });
      setTimeout(function () { form.removeAttribute('data-sent'); }, 8000);
    });
  });
})();
