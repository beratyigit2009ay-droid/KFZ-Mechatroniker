/* LUXURY EVENTS by DEKO.LUXURY – Interaktionen (ohne Bibliotheken) */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var store = {
    get: function (key) { try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; } },
    set: function (key, val) { try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* Speicher nicht verfügbar */ } }
  };

  var scrollLocks = 0;
  function lockScroll() { scrollLocks += 1; root.style.overflow = 'hidden'; }
  function unlockScroll() { scrollLocks = Math.max(0, scrollLocks - 1); if (!scrollLocks) root.style.overflow = ''; }

  /* ---------- Header-Zustand beim Scrollen ---------- */
  var header = $('[data-header]');
  var hero = $('.hero');
  function onScrollHeader() {
    doc.body.classList.toggle('is-scrolled', window.scrollY > 40);
  }

  /* ---------- Mobiles Menü ---------- */
  var menu = $('[data-menu]');
  var toggle = $('[data-menu-toggle]');
  var menuOpen = false;

  function openMenu() {
    if (!menu || menuOpen) return;
    menuOpen = true;
    menu.hidden = false;
    lockScroll();
    doc.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.menu-toggle__label').textContent = 'Schließen';
    requestAnimationFrame(function () {
      menu.classList.add('is-open');
      var first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    });
    updateActionBar();
  }
  function closeMenu(restoreFocus) {
    if (!menu || !menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    doc.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.menu-toggle__label').textContent = 'Menü';
    unlockScroll();
    window.setTimeout(function () { if (!menuOpen) menu.hidden = true; }, reduceMotion.matches ? 0 : 500);
    if (restoreFocus) toggle.focus();
    updateActionBar();
  }
  if (menu && toggle) {
    toggle.addEventListener('click', function () { menuOpen ? closeMenu(true) : openMenu(); });
    $$('[data-menu-link]', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
    doc.addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key === 'Tab') {
        var items = [toggle].concat($$('a, button', menu));
        var idx = items.indexOf(doc.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', function (mq) { if (mq.matches) closeMenu(false); });
  }

  /* ---------- Aktiver Navigationspunkt ---------- */
  var navLinks = $$('[data-nav]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var s = doc.getElementById(id); if (s) navIO.observe(s); });
  }

  /* ---------- Einblendungen beim Scrollen ----------
     Alles ist im Ruhezustand sichtbar. Elemente unterhalb des Sichtbereichs erhalten die
     Klasse .is-in kurz bevor sie erscheinen; erst dann spielt die Animation ab. */
  function initReveal() {
    var els = $$('[data-reveal], [data-reveal-img], [data-steps]');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      els.forEach(function (el) { if (el.matches('[data-steps]')) el.classList.add('is-in'); });
      return;
    }
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (!el.matches('[data-steps]')) el.style.setProperty('--d', Math.min(batch, 5) * 0.09 + 's');
        el.classList.add('is-in');
        batch += 1;
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px 10% 0px', threshold: 0 });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) {
        if (el.matches('[data-steps]')) el.classList.add('is-in');
        return; // bereits sichtbar: keine Animation
      }
      io.observe(el);
    });
  }

  /* ---------- Parallax (dezent, nur Desktop) ---------- */
  var parallaxOn = false;
  var heroMedia = $('[data-parallax]');
  var innerParallax = $$('[data-parallax-inner]');
  function updateParallax() {
    if (!parallaxOn) return;
    var y = window.scrollY;
    var vh = window.innerHeight;
    if (heroMedia && hero && y < hero.offsetHeight * 1.2) {
      heroMedia.style.transform = 'translate3d(0,' + (y * parseFloat(heroMedia.getAttribute('data-parallax'))).toFixed(1) + 'px,0)';
    }
    innerParallax.forEach(function (fig) {
      var r = fig.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      var img = fig.querySelector('img');
      if (img) img.style.transform = 'translate3d(0,' + (progress * -5).toFixed(2) + '%,0) scale(1.12)';
    });
  }
  function setParallax() {
    parallaxOn = !reduceMotion.matches && window.matchMedia('(min-width: 900px)').matches;
    if (!parallaxOn) {
      if (heroMedia) heroMedia.style.transform = '';
      innerParallax.forEach(function (fig) { var img = fig.querySelector('img'); if (img) img.style.transform = ''; });
    }
    updateParallax();
  }

  /* ---------- Mobile Aktionsleiste ---------- */
  var actionBar = $('[data-action-bar]');
  var contactInView = false;
  function updateActionBar() {
    if (!actionBar) return;
    var past = hero ? window.scrollY > hero.offsetHeight * 0.75 : window.scrollY > 400;
    actionBar.classList.toggle('is-visible', past && !contactInView && !menuOpen);
  }
  var contactSection = doc.getElementById('kontakt');
  if (contactSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      contactInView = entries[0].isIntersecting;
      updateActionBar();
    }, { rootMargin: '0px 0px -20% 0px' }).observe(contactSection);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      updateParallax();
      updateActionBar();
      ticking = false;
    });
  }, { passive: true });
  window.addEventListener('resize', setParallax);

  /* ---------- Portfolio-Filter ---------- */
  var grid = $('[data-portfolio]');
  var filters = $$('[data-filter]');
  if (grid && filters.length) {
    var items = $$('.pf-item', grid);
    items.forEach(function (li, i) { li.style.viewTransitionName = 'pf-' + (i + 1); });
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-pressed') === 'true') return;
        var f = btn.getAttribute('data-filter');
        var apply = function () {
          filters.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          items.forEach(function (li) { li.hidden = !(f === '*' || li.getAttribute('data-cat') === f); });
          grid.classList.toggle('is-filtered', f !== '*');
        };
        if (doc.startViewTransition && !reduceMotion.matches) doc.startViewTransition(apply);
        else apply();
      });
    });
  }

  /* ---------- Galerie / Lightbox ---------- */
  var lb = $('[data-lightbox]');
  var lbState = { list: [], index: 0 };
  function galleryItems(name) {
    return $$('[data-gallery="' + name + '"]').filter(function (el) {
      var li = el.closest('.pf-item');
      return !li || !li.hidden;
    });
  }
  function renderLightbox() {
    var el = lbState.list[lbState.index];
    if (!el) return;
    var img = $('[data-lb-img]', lb);
    var thumb = el.querySelector('img');
    img.classList.remove('is-changing');
    void img.offsetWidth;
    img.classList.add('is-changing');
    img.src = el.getAttribute('data-full') || (thumb && thumb.currentSrc) || '';
    img.alt = thumb ? thumb.alt : '';
    $('[data-lb-cat]', lb).textContent = el.getAttribute('data-category') || '';
    $('[data-lb-title]', lb).textContent = el.getAttribute('data-title') || '';
    var meta = $('[data-lb-meta]', lb);
    meta.innerHTML = '';
    [['Eventtyp', 'data-eventtyp'], ['Location', 'data-location'], ['Konzept', 'data-konzept']].forEach(function (pair) {
      var v = (el.getAttribute(pair[1]) || '').trim();
      if (!v) return;
      var row = doc.createElement('div');
      var dt = doc.createElement('dt'); dt.textContent = pair[0];
      var dd = doc.createElement('dd'); dd.textContent = v;
      row.appendChild(dt); row.appendChild(dd); meta.appendChild(row);
    });
    $('[data-lb-desc]', lb).textContent = (el.getAttribute('data-beschreibung') || '').trim();
    var n = lbState.list.length;
    $('[data-lb-count]', lb).textContent = String(lbState.index + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
    $('[data-lb-prev]', lb).hidden = n < 2;
    $('[data-lb-next]', lb).hidden = n < 2;
    [1, -1].forEach(function (d) {
      var nb = lbState.list[(lbState.index + d + n) % n];
      if (nb) { var pre = new Image(); pre.src = nb.getAttribute('data-full'); }
    });
  }
  function openLightbox(name, el) {
    if (!lb || typeof lb.showModal !== 'function') return;
    lbState.list = galleryItems(name);
    lbState.index = Math.max(0, lbState.list.indexOf(el));
    renderLightbox();
    lb.showModal();
    lockScroll();
  }
  function stepLightbox(d) {
    var n = lbState.list.length;
    if (n < 2) return;
    lbState.index = (lbState.index + d + n) % n;
    renderLightbox();
  }
  if (lb) {
    $$('[data-gallery]').forEach(function (el) {
      el.addEventListener('click', function () { openLightbox(el.getAttribute('data-gallery'), el); });
    });
    $$('[data-open-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () { openLightbox(btn.getAttribute('data-open-gallery'), null); });
    });
    $('[data-lb-prev]', lb).addEventListener('click', function () { stepLightbox(-1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { stepLightbox(1); });
    $('[data-lb-close]', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('close', unlockScroll);
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'ArrowLeft') stepLightbox(-1);
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox__inner') || e.target.classList.contains('lightbox__img-wrap')) lb.close();
    });
    var startX = null;
    lb.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Kundenstimmen ---------- */
  var track = $('[data-voices-track]');
  if (track) {
    var voices = $$('.voice', track);
    if (voices.length > 1) {
      var vi = 0;
      var count = $('[data-voices-count]');
      var showVoice = function (i) {
        vi = (i + voices.length) % voices.length;
        voices.forEach(function (v, k) { v.classList.toggle('is-active', k === vi); });
        count.textContent = (vi + 1) + ' / ' + voices.length;
      };
      track.classList.add('is-ready');
      $('[data-voices-nav]').hidden = false;
      $('[data-voices-prev]').addEventListener('click', function () { showVoice(vi - 1); });
      $('[data-voices-next]').addEventListener('click', function () { showVoice(vi + 1); });
      showVoice(0);
    }
  }

  /* ---------- Kopieren ---------- */
  function copyText(text, btn, doneLabel) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = doneLabel || 'Kopiert';
      btn.classList.add('is-done');
      window.setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 2200);
    };
    var fallback = function () {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select();
      try { doc.execCommand('copy'); done(); } catch (e) { /* Auswahl bleibt bestehen */ }
      doc.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
  }
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () { copyText(btn.getAttribute('data-copy'), btn); });
  });

  /* ---------- Anfrageformular ---------- */
  var form = $('[data-form]');
  if (form) {
    var done = $('[data-form-done]');
    var fallbackPanel = $('[data-form-fallback]');
    var statusEl = $('[data-form-status]');
    var submitBtn = $('[data-submit]', form);
    var submitLabel = $('[data-submit-label]', form);
    var showroomField = $('[data-showroom-field]', form);
    var ts = $('[data-ts]', form);
    if (ts) ts.value = String(Date.now());

    var dateInput = $('#f-datum', form);
    if (dateInput) {
      var d = new Date();
      dateInput.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    var setMode = function (mode) {
      var input = $('#anliegen-' + mode, form);
      if (input) input.checked = true;
      var showroom = mode === 'showroom';
      showroomField.hidden = !showroom;
      submitLabel.textContent = showroom ? 'Termin anfragen' : 'Anfrage senden';
    };
    $$('[data-mode-input]', form).forEach(function (r) {
      r.addEventListener('change', function () { setMode(r.value === 'Showroom-Termin' ? 'showroom' : 'event'); });
    });
    $$('[data-mode="showroom"]').forEach(function (a) {
      a.addEventListener('click', function () { setMode('showroom'); });
    });
    $$('[data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        setMode('event');
        var val = a.getAttribute('data-service');
        $$('input[name="leistungen[]"]', form).forEach(function (cb) { if (cb.value === val) cb.checked = true; });
      });
    });

    var rules = {
      name: { el: $('#f-name', form), test: function (v) { return v.trim().length > 1; } },
      email: { el: $('#f-email', form), test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } }
    };
    var setError = function (key, bad) {
      var r = rules[key];
      var field = r.el.closest('.field');
      var msg = $('#' + r.el.id + '-error');
      field.classList.toggle('has-error', bad);
      r.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) r.el.setAttribute('aria-describedby', msg.id); else r.el.removeAttribute('aria-describedby');
      msg.hidden = !bad;
    };
    Object.keys(rules).forEach(function (key) {
      rules[key].el.addEventListener('blur', function () {
        if (rules[key].el.value) setError(key, !rules[key].test(rules[key].el.value));
      });
      rules[key].el.addEventListener('input', function () {
        if (rules[key].el.closest('.field').classList.contains('has-error') && rules[key].test(rules[key].el.value)) setError(key, false);
      });
    });

    var summary = function () {
      var fd = new FormData(form);
      var lines = [];
      var add = function (label, val) { if (val && String(val).trim()) lines.push(label + ': ' + String(val).trim()); };
      add('Anliegen', fd.get('anliegen'));
      add('Name', fd.get('name'));
      add('E-Mail', fd.get('email'));
      add('Telefon', fd.get('telefon'));
      add('Eventart', fd.get('eventart'));
      add('Datum', fd.get('datum'));
      add('Location', fd.get('location'));
      add('Gäste', fd.get('gaeste'));
      add('Budget', fd.get('budget'));
      add('Wunschtermin Showroom', fd.get('wunschtermin'));
      add('Leistungen', fd.getAll('leistungen[]').join(', '));
      var msg = (fd.get('nachricht') || '').trim();
      return lines.join('\n') + (msg ? '\n\nNachricht:\n' + msg : '');
    };

    var showPanel = function (panel) {
      form.hidden = true;
      panel.hidden = false;
      panel.focus({ preventScroll: true });
      var top = panel.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 24;
      window.scrollTo({ top: top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };

    var showSuccess = function (name, note) {
      var first = (name || '').trim().split(/\s+/)[0];
      $('[data-done-name]', done).textContent = first ? ', ' + first : '';
      var noteEl = $('[data-done-note]', done);
      noteEl.hidden = !note;
      noteEl.textContent = note || '';
      showPanel(done);
    };

    var showFallback = function () {
      var fd = new FormData(form);
      var subject = 'Anfrage über die Website' + (fd.get('eventart') ? ' – ' + fd.get('eventart') : '');
      var body = summary();
      if (body.length > 1800) body = body.slice(0, 1800) + ' …';
      $('[data-fallback-mail]', fallbackPanel).href = 'mailto:deko.luxury@gmx.de?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      showPanel(fallbackPanel);
    };
    var copyReq = $('[data-copy-request]', fallbackPanel);
    if (copyReq) copyReq.addEventListener('click', function () { copyText(summary(), copyReq, 'Text kopiert'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.textContent = '';
      var firstBad = null;
      Object.keys(rules).forEach(function (key) {
        var bad = !rules[key].test(rules[key].el.value);
        setError(key, bad);
        if (bad && !firstBad) firstBad = rules[key].el;
      });
      if (firstBad) { firstBad.focus(); return; }

      var name = rules.name.el.value;
      if (form.getAttribute('data-demo') === 'true') {
        showSuccess(name, 'Vorschau: Auf der veröffentlichten Website wird Ihre Anfrage an deko.luxury@gmx.de gesendet.');
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Wird gesendet …';
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: 'http' }; }); })
        .then(function (data) {
          if (data && data.ok) showSuccess(name);
          else if (data && data.error === 'validation') statusEl.textContent = 'Bitte prüfen Sie Name und E-Mail-Adresse.';
          else showFallback();
        })
        .catch(showFallback)
        .then(function () {
          submitBtn.disabled = false;
          setMode($('#anliegen-showroom', form).checked ? 'showroom' : 'event');
        });
    });

    $('[data-form-reset]', done).addEventListener('click', function () {
      form.reset();
      setMode('event');
      if (ts) ts.value = String(Date.now());
      done.hidden = true;
      form.hidden = false;
      $('#f-name', form).focus();
    });
  }

  /* ---------- Karte & Datenschutz-Einstellungen ---------- */
  var CONSENT_KEY = 'dekoluxury-consent';
  var mapBox = $('[data-map]');
  var mapFrame = $('[data-map-frame]');
  var MAP_SRC = 'https://www.openstreetmap.org/export/embed.html?bbox=10.355%2C48.405%2C10.46%2C48.455&layer=mapnik';
  function loadMap() {
    if (!mapBox || mapFrame.firstChild) return;
    if (root.getAttribute('data-preview') === 'true') {
      // Vorschau-Umgebungen erlauben keine eingebetteten Seiten
      var note = doc.createElement('p');
      note.className = 'map__note';
      note.textContent = 'In dieser Vorschau ist die Karte deaktiviert. Auf der veröffentlichten Website erscheint hier OpenStreetMap.';
      mapFrame.appendChild(note);
      mapFrame.hidden = false;
      return;
    }
    var f = doc.createElement('iframe');
    f.src = MAP_SRC;
    f.title = 'Karte: Burgau (OpenStreetMap)';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    mapFrame.appendChild(f);
    mapFrame.hidden = false;
    mapBox.classList.add('has-frame');
    $('.map__svg', mapBox).hidden = true;
    var btn = $('[data-load-map]');
    if (btn) btn.hidden = true;
  }
  function unloadMap() {
    if (!mapBox || !mapFrame.firstChild) return;
    mapFrame.innerHTML = '';
    mapFrame.hidden = true;
    mapBox.classList.remove('has-frame');
    $('.map__svg', mapBox).hidden = false;
    var btn = $('[data-load-map]');
    if (btn) btn.hidden = false;
  }
  var consent = store.get(CONSENT_KEY) || { map: false };
  if (consent.map) loadMap();
  $$('[data-load-map]').forEach(function (b) { b.addEventListener('click', loadMap); });

  var consentDlg = $('[data-consent]');
  if (consentDlg && typeof consentDlg.showModal === 'function') {
    var mapToggle = $('[data-consent-map]', consentDlg);
    $$('[data-open-consent]').forEach(function (b) {
      b.addEventListener('click', function () {
        mapToggle.checked = !!(store.get(CONSENT_KEY) || {}).map;
        consentDlg.showModal();
      });
    });
    consentDlg.addEventListener('close', function () {
      if (consentDlg.returnValue !== 'save') return;
      consent = { map: mapToggle.checked, date: new Date().toISOString() };
      store.set(CONSENT_KEY, consent);
      if (consent.map) loadMap(); else unloadMap();
    });
  }

  /* ---------- Kleinigkeiten ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  onScrollHeader();
  setParallax();
  updateActionBar();
  initReveal();
})();
