/* ==========================================================================
   Hasret Nuts – Eröffnungsanimation & Logo-Drehung (Progressive Enhancement)
   Die Animation selbst ist reines CSS (intro.css). Dieses Skript ergänzt:
     · Überspringen per Klick/Tipp, Escape oder beliebiger Taste
     · einmal pro Browser-Sitzung (sessionStorage „hn_intro_seen“)
     · Aufräumen: Overlay wird danach per [hidden] entfernt
     · Logo: Hover/Fokus des Marken-Links löst eine vollständige Drehung aus
   Fällt das Skript aus, endet das Overlay trotzdem nach 1,9 s von selbst.
   Doku: docs/LOGO-UND-INTRO.md
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = false;
  try {
    reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* ältere Browser */ }

  root.classList.add('hn-motion-js');

  /* ---------------- Eröffnungsanimation ---------------- */
  function initIntro() {
    var el = doc.querySelector('[data-hn-intro]');
    if (!el || el.getAttribute('data-hn-intro-ready')) return;
    el.setAttribute('data-hn-intro-ready', '1');

    if (reduceMotion || root.classList.contains('hn-intro-skip')) {
      el.hidden = true;
      return;
    }

    try { window.sessionStorage.setItem('hn_intro_seen', '1'); } catch (e) { /* privat/gesperrt */ }

    var finished = false;
    var safety = window.setTimeout(finish, 2600);

    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      doc.removeEventListener('keydown', skip, true);
      el.removeEventListener('pointerdown', skip);
      el.removeEventListener('click', skip);
      el.hidden = true;
      // .hn-intro-on bleibt bewusst stehen: --hn-logo-delay darf sich während
      // laufender Animationen nicht ändern (sonst springt das Kopfzeilen-Logo).
      root.classList.add('hn-intro-done');
    }

    function skip() {
      if (finished || el.classList.contains('is-skipped')) return;
      el.classList.add('is-skipped');
      window.setTimeout(finish, 360);
    }

    el.addEventListener('animationend', function (event) {
      if (event.target !== el) return;
      if (event.animationName === 'hn-intro-end') finish();
    });
    el.addEventListener('pointerdown', skip);
    el.addEventListener('click', skip);
    // Jede Taste (inkl. Escape, Tab) beendet das Intro; die Taste selbst wirkt normal weiter.
    doc.addEventListener('keydown', skip, true);
  }

  /* ---------------- Logo: vollständige Drehung bei Hover/Fokus ---------------- */
  function initLogos() {
    if (reduceMotion) return;
    var logos = doc.querySelectorAll('.hn-logo');
    Array.prototype.forEach.call(logos, function (logo) {
      var trigger = logo.closest('a, button') || logo;
      var coin = logo.querySelector('.hn-logo__coin');
      if (!coin || logo.classList.contains('hn-logo--static') || logo.getAttribute('data-hn-logo-ready')) return;
      logo.setAttribute('data-hn-logo-ready', '1');

      function turn() {
        if (logo.classList.contains('is-turning')) return;
        logo.classList.add('is-turning');
      }
      coin.addEventListener('animationend', function (event) {
        if (event.target === coin) logo.classList.remove('is-turning');
      });
      coin.addEventListener('animationcancel', function (event) {
        if (event.target === coin) logo.classList.remove('is-turning');
      });
      trigger.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') turn();
      });
      trigger.addEventListener('focus', function () {
        var visible = true;
        try { visible = trigger.matches(':focus-visible'); } catch (e) { /* alter Browser */ }
        if (visible) turn();
      });
    });
  }

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    initIntro();
    initLogos();
  });
})();
