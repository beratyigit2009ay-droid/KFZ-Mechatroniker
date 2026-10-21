/* ==========================================================================
   Hasret Nuts · Corporate Hub – Interaktion & Bewegung (Progressive Enhancement)
   Portiert aus der freigegebenen Live-Vorschau (hasret-website.html, C5-Animationen).
   Ohne JavaScript bleibt alles sichtbar und bedienbar; Formulare funktionieren serverseitig.
     · Sticky-Blur-Kopfzeile (Sensor + IntersectionObserver statt Scroll-Listener)
     · Globales Fade-In Up (0.8s ease-out, 32 px, Staffelung 120 ms, threshold .15, einmalig)
     · Messe-Chronik: goldener Lichtpunkt + Fortschrittslinie, 3D-Scale-In der Fotos
     · Mobiles Menü (Fokusfalle, Escape, Scroll-Sperre)
     · Formulare: deutsche Fehlermeldungen vor dem Absenden, Doppelklick-Schutz
     · Feedback: Fehler-Felder ein-/ausblenden, technische Angaben nur mit Häkchen
   CSP: keine Inline-Handler, keine eval-Konstrukte. Owner: BUILD-CORPORATE
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var hasIO = 'IntersectionObserver' in window;

  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function vh() { return window.innerHeight || root.clientHeight || 800; }
  function domOrder(a, b) {
    if (a === b) return 0;
    return (a.compareDocumentPosition(b) & 4) ? -1 : 1; /* 4 = FOLLOWING */
  }
  function focusQuiet(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { /* ignorieren */ } }
  }

  /* ---------- Sticky-Blur-Kopfzeile: 24-px-Sensor, kein Scroll-Listener ---------- */
  function initHeader() {
    var header = $('.site-header');
    var sentinel = $('.hdr-sentinel');
    if (!header || !sentinel) return;
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        header.classList.toggle('is-scrolled', !e.isIntersecting);
      }).observe(sentinel);
    } else {
      var set = function () { header.classList.toggle('is-scrolled', (window.pageYOffset || 0) > 24); };
      window.addEventListener('scroll', set, { passive: true });
      set();
    }
  }

  /* ---------- Globales Fade-In Up ---------- */
  var Reveal = (function () {
    var io = null;

    function markVisible(el) {
      el.classList.remove('is-pending');
      el.classList.add('is-visible');
    }

    function init() {
      if (!hasIO || reduced()) return;
      io = new IntersectionObserver(function (entries) {
        var batch = [];
        entries.forEach(function (entry) { if (entry.isIntersecting) batch.push(entry.target); });
        batch.sort(domOrder);
        batch.forEach(function (el, i) {
          el.style.setProperty('--i', String(Math.min(i, 5)));
          markVisible(el);
          io.unobserve(el);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    }

    /* Nur verbergen, was gerade unterhalb des ersten Bildschirms liegt; der Rest bleibt sichtbar. */
    function prepare(scope) {
      var els = $$('.reveal:not(.is-visible)', scope || doc);
      if (!io) { els.forEach(markVisible); return []; }
      var h = vh();
      var below = [];
      var inView = [];
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top > h) below.push(el);
        else {
          markVisible(el);
          if (r.bottom > 0) inView.push(el);
        }
      });
      if (below.length) {
        root.classList.add('rv-instant');
        below.forEach(function (el) { el.classList.add('is-pending'); });
        void root.offsetHeight; /* verborgenen Zustand ohne Übergang festschreiben */
        root.classList.remove('rv-instant');
        below.forEach(function (el) { io.observe(el); });
      }
      return inView;
    }

    /* Einstieg für Elemente im ersten Bildschirm (sanftes Aufsteigen). */
    function enter(list) {
      if (reduced()) return;
      list.forEach(function (el, i) {
        el.style.setProperty('--i', String(Math.min(i, 5)));
        el.classList.add('is-entering');
        el.addEventListener('animationend', function done(ev) {
          if (ev.target !== el) return;
          el.classList.remove('is-entering');
          el.style.setProperty('--i', '0');
          el.removeEventListener('animationend', done);
        });
      });
    }

    /* Späte Layoutverschiebungen (Schriftwechsel) können wartende Elemente in den
       sichtbaren Bereich schieben – diese sofort zeigen. */
    function sweep() {
      if (!io) return;
      var h = vh();
      var batch = $$('.reveal.is-pending').filter(function (el) {
        if (!el.getClientRects().length) return false;
        var r = el.getBoundingClientRect();
        return r.top < h && r.bottom > 0;
      });
      batch.forEach(function (el, i) {
        el.style.setProperty('--i', String(Math.min(i, 5)));
        markVisible(el);
        io.unobserve(el);
      });
    }

    return { init: init, prepare: prepare, enter: enter, sweep: sweep };
  })();

  /* Übergabe von der Eröffnungsanimation: Der Einstieg beginnt, wenn sich die Türen öffnen
     (ca. 1,05 s) oder sobald das Intro übersprungen bzw. beendet wurde. */
  function afterIntro(cb) {
    var intro = $('[data-hn-intro]');
    var running = intro && root.classList.contains('hn-intro-on') && !root.classList.contains('hn-intro-skip') && !reduced();
    if (!running) { cb(); return; }
    var done = false;
    var mo = null;
    function go() {
      if (done) return;
      done = true;
      if (mo) mo.disconnect();
      cb();
    }
    var elapsed = (window.performance && performance.now) ? performance.now() : 0;
    window.setTimeout(go, Math.max(0, 1050 - elapsed));
    if ('MutationObserver' in window) {
      mo = new MutationObserver(function () {
        if (intro.hidden || intro.classList.contains('is-skipped')) go();
      });
      mo.observe(intro, { attributes: true, attributeFilter: ['class', 'hidden'] });
    }
  }

  /* ---------- Messe-Chronik: Lichtpunkt, Fortschrittslinie, 3D-Scale-In ---------- */
  function initTimeline() {
    var tl = doc.getElementById('hn-timeline');
    if (!tl) return null;
    var items = $$('.timeline__item', tl);
    var ticking = false;

    function anchorOf(item) {
      var node = $('.timeline__node', item);
      return item.offsetTop + (node ? node.offsetTop + node.offsetHeight / 2 : 0);
    }

    function update() {
      ticking = false;
      if (!tl.getClientRects().length) return;
      var r = tl.getBoundingClientRect();
      var focusLine = vh() * 0.55;
      var raw = focusLine - r.top;
      /* progress = clamp((innerHeight * .55 − rect.top) / rect.height, 0, 1) */
      var p = Math.min(1, Math.max(0, raw / Math.max(1, r.height)));
      tl.style.setProperty('--progress', p.toFixed(4));
      tl.style.setProperty('--tl-h', (tl.offsetHeight || r.height).toFixed(1) + 'px');
      items.forEach(function (item) {
        if (item.classList.contains('is-active')) return; /* bleibt aktiv */
        if (raw >= anchorOf(item)) item.classList.add('is-active');
      });
    }

    function request() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    /* Startzustand: Bereits passierte Einträge sind sofort aktiv; Fotos unterhalb des
       Bildschirms werden „scharf gestellt“ (is-armed) und springen später im 3D-Scale-In auf. */
    function arm() {
      tl.classList.add('tl-instant');
      update();
      var h = vh();
      items.forEach(function (item) {
        if (item.classList.contains('is-active')) { item.classList.remove('is-armed'); return; }
        var media = $('.timeline__media', item);
        var below = media ? media.getBoundingClientRect().top > h : false;
        item.classList.toggle('is-armed', below && hasIO && !reduced());
      });
      void tl.offsetHeight;
      tl.classList.remove('tl-instant');
    }

    /* Nach späten Layoutverschiebungen: Fotos, die schon im Bild sind, sofort zeigen. */
    function settle() {
      if (!tl.getClientRects().length) return;
      var h = vh();
      items.forEach(function (item) {
        if (!item.classList.contains('is-armed') || item.classList.contains('is-active')) return;
        var media = $('.timeline__media', item);
        if (media && media.getBoundingClientRect().top < h) item.classList.remove('is-armed');
      });
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    arm();
    return { update: request, settle: settle };
  }

  /* ---------- Mobiles Menü ---------- */
  var Drawer = (function () {
    var btn, drawer, closeBtn, hideTimer = null, lastFocus = null;

    function focusables() {
      return $$('a[href], button:not([disabled])', drawer).filter(function (el) { return el.offsetParent !== null; });
    }

    function open() {
      if (!drawer) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      lastFocus = doc.activeElement;
      drawer.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-label', 'Menü schließen');
      root.classList.add('is-locked');
      void drawer.offsetHeight;
      drawer.classList.add('is-open');
      focusQuiet($('.drawer__nav a', drawer) || closeBtn);
    }

    function close(restoreFocus) {
      if (!drawer || drawer.hidden) return;
      drawer.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Menü öffnen');
      root.classList.remove('is-locked');
      var finish = function () { drawer.hidden = true; hideTimer = null; };
      if (reduced()) finish(); else hideTimer = setTimeout(finish, 420);
      if (restoreFocus) focusQuiet(btn || lastFocus);
    }

    function init() {
      btn = $('.burger');
      drawer = doc.getElementById('site-drawer');
      closeBtn = drawer ? $('.drawer__close', drawer) : null;
      if (!btn || !drawer) return;
      btn.addEventListener('click', function () { if (drawer.hidden) open(); else close(true); });
      if (closeBtn) closeBtn.addEventListener('click', function () { close(true); });
      /* Sprungmarken auf derselben Seite (z. B. #kontakt): Menü schließen, dann springen */
      $$('a[href^="#"]', drawer).forEach(function (a) {
        a.addEventListener('click', function () { close(false); });
      });
      doc.addEventListener('keydown', function (e) {
        if (drawer.hidden) return;
        if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(true); return; }
        if (e.key === 'Tab') {
          var f = focusables();
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      var mqDesk = window.matchMedia ? window.matchMedia('(min-width: 1081px)') : null;
      if (mqDesk) {
        var onDesk = function (m) {
          if (!m.matches || drawer.hidden) return;
          var hadFocus = drawer.contains(doc.activeElement);
          close(false);
          if (hadFocus) focusQuiet($('.main-nav a[aria-current]') || $('.main-nav a') || doc.getElementById('main'));
        };
        if (mqDesk.addEventListener) mqDesk.addEventListener('change', onDesk);
        else if (mqDesk.addListener) mqDesk.addListener(onDesk);
      }
    }

    return { init: init };
  })();

  /* ---------- Sprung zum Footer-Kontakt: Fokus mitführen ---------- */
  function initAnchors() {
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href="#kontakt"], a[href="#main"]') : null;
      if (!a) return;
      var target = doc.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
      focusQuiet(target);
      try { history.replaceState(null, '', a.getAttribute('href')); } catch (err) { /* ignorieren */ }
    });
  }

  /* ---------- Formulare: deutsche Hinweise vor dem Absenden ---------- */
  function initForms() {
    $$('form[data-validate]').forEach(function (form) {
      var submit = $('button[type="submit"]', form);
      var fields = $$('input, select, textarea', form).filter(function (el) {
        return el.willValidate && el.type !== 'submit' && el.type !== 'hidden' && !el.closest('.hp-field');
      });

      function messageFor(el) {
        var v = el.validity;
        if (v.valueMissing) return el.getAttribute('data-msg-missing') || 'Bitte füllen Sie dieses Feld aus.';
        if (v.typeMismatch) return el.getAttribute('data-msg-invalid') || 'Bitte prüfen Sie Ihre Eingabe.';
        if (v.tooLong) return 'Bitte kürzen Sie Ihre Eingabe.';
        return el.getAttribute('data-msg-invalid') || 'Bitte prüfen Sie Ihre Eingabe.';
      }

      function errorBox(el) {
        var name = el.name;
        return doc.getElementById('f-' + name + '-err');
      }

      function setError(el, msg) {
        var err = errorBox(el);
        var wrap = el.closest('.fld, .fieldset');
        var group = el.type === 'radio' ? $$('input[name="' + el.name + '"]', form) : [el];
        if (msg) {
          group.forEach(function (g) { g.setAttribute('aria-invalid', 'true'); });
          if (err) { var t = $('span', err); if (t) t.textContent = msg; err.hidden = false; }
          if (wrap) wrap.classList.add('is-invalid');
        } else {
          group.forEach(function (g) { g.removeAttribute('aria-invalid'); });
          if (err) { var t2 = $('span', err); if (t2) t2.textContent = ''; err.hidden = true; }
          if (wrap) wrap.classList.remove('is-invalid');
        }
      }

      function validate(el) {
        if (el.setCustomValidity) el.setCustomValidity('');
        var ok = el.validity.valid;
        var msg = ok ? '' : messageFor(el);
        if (!ok && el.setCustomValidity) el.setCustomValidity(msg); /* auch die native Meldung auf Deutsch */
        setError(el, msg);
        return ok;
      }

      fields.forEach(function (el) {
        var recheck = function () { if (el.getAttribute('aria-invalid') === 'true') validate(el); };
        el.addEventListener('input', recheck);
        el.addEventListener('change', recheck);
        el.addEventListener('blur', function () {
          if (el.type === 'radio') return;
          if (el.getAttribute('aria-invalid') === 'true' || (el.value && el.type !== 'checkbox')) validate(el);
        });
      });

      form.addEventListener('submit', function (e) {
        if (form.getAttribute('data-sending') === '1') { e.preventDefault(); return; }
        var firstInvalid = null;
        var seenRadio = {};
        fields.forEach(function (el) {
          if (el.type === 'radio') {
            if (seenRadio[el.name]) return;
            seenRadio[el.name] = true;
          }
          if (!validate(el) && !firstInvalid) firstInvalid = el;
        });
        if (firstInvalid) {
          e.preventDefault();
          firstInvalid.focus();
          return;
        }
        form.setAttribute('data-sending', '1');
        if (submit) {
          submit.classList.add('is-busy');
          submit.setAttribute('aria-busy', 'true');
          var label = submit.getAttribute('data-busy-label');
          if (label) submit.firstChild.nodeValue = label + ' ';
        }
      });

      /* Zurück-Navigation (bfcache): Sende-Zustand zurücksetzen */
      window.addEventListener('pageshow', function (ev) {
        if (!ev.persisted) return;
        form.removeAttribute('data-sending');
        if (submit) { submit.classList.remove('is-busy'); submit.removeAttribute('aria-busy'); }
      });
    });

  }

  /* ---------- Fokus nach dem Absenden ----------
     Erfolg (#danke) und Serverfehler (#fehler) sind Sprungziele mit tabindex="-1": Der Browser
     fokussiert sie schon ohne JavaScript. Hier nur absichern – erst nach "load", weil das
     Scrollen zum Fragment den Fokus sonst wieder auf das Dokument setzt. */
  function initFocus() {
    var target = $('.error-anchor') || $('.error-summary');
    if (!target) {
      var ok = $('[data-focus-on-load]');
      if (ok) target = $('[tabindex="-1"]', ok);
    }
    if (!target && location.hash === '#danke') {
      /* Seite neu geladen, Erfolgsmeldung schon angezeigt: zum Formular springen */
      var alt = doc.getElementById('anfrage') || doc.getElementById('feedback-formular');
      if (alt) alt.scrollIntoView({ block: 'start' });
      return;
    }
    if (!target) return;
    var run = function () { window.setTimeout(function () { if (doc.activeElement !== target) focusQuiet(target); }, 0); };
    if (doc.readyState === 'complete') run();
    else window.addEventListener('load', run);
  }

  /* ---------- Feedback: Fehler-Felder und technische Angaben ---------- */
  function initFeedback() {
    var form = $('form[data-feedback]');
    if (!form) return;
    var bugFields = $('[data-bug-fields]', form);
    var tech = doc.getElementById('f-technik');
    var hidden = doc.getElementById('f-browser');
    var preview = $('[data-tech-preview]', form);

    function syncKind() {
      var checked = $('input[name="art"]:checked', form);
      var isBug = !!checked && checked.value === 'bug';
      if (bugFields) bugFields.setAttribute('data-collapsed', isBug ? 'false' : 'true');
    }
    $$('input[name="art"]', form).forEach(function (r) { r.addEventListener('change', syncKind); });
    syncKind();

    function techInfo() {
      var w = window.innerWidth || root.clientWidth || 0;
      var h = window.innerHeight || root.clientHeight || 0;
      var dpr = window.devicePixelRatio ? Math.round(window.devicePixelRatio * 100) / 100 : 1;
      var ua = String(navigator.userAgent || '').replace(/[\r\n]+/g, ' ');
      return (ua + ' · Fenster ' + w + '×' + h + ' px · Pixeldichte ' + dpr).slice(0, 480);
    }

    function syncTech() {
      if (!tech || !hidden) return;
      if (tech.checked) {
        hidden.value = techInfo();
        if (preview) { preview.textContent = 'Wird mitgesendet: ' + hidden.value; preview.hidden = false; }
      } else {
        hidden.value = '';
        if (preview) { preview.textContent = ''; preview.hidden = true; }
      }
    }
    if (tech) tech.addEventListener('change', syncTech);
    form.addEventListener('submit', syncTech);
    syncTech();
  }

  /* ---------- „Zum Kalender hinzufügen“ – Hinweis ein-/ausblenden ---------- */
  function initKalender() {
    var b = $('[data-kalender]');
    var note = b ? doc.getElementById(b.getAttribute('aria-controls')) : null;
    if (!b || !note) return;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      note.classList.toggle('is-open', !open);
    });
  }

  /* ---------- Start ---------- */
  function boot() {
    initHeader();
    Reveal.init();
    var inView = Reveal.prepare(doc);
    afterIntro(function () { Reveal.enter(inView); });
    var timeline = initTimeline();
    Drawer.init();
    initAnchors();
    initForms();
    initFocus();
    initFeedback();
    initKalender();

    var settle = function () { Reveal.sweep(); if (timeline) { timeline.update(); timeline.settle(); } };
    try {
      if (doc.fonts) {
        if (doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(settle);
        if (doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', settle);
      }
    } catch (e) { /* ignorieren */ }
    window.addEventListener('load', settle);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
