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

  /* ---------- Linienzeichnungen zeichnen sich beim Hineinscrollen ---------- */
  var drawings = $$('[data-draw]');
  if (drawings.length) {
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      drawings.forEach(function (el) { el.classList.add('is-drawn'); });
    } else {
      var drawIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-drawn');
          drawIO.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
      drawings.forEach(function (el) { drawIO.observe(el); });
    }
  }

  /* ---------- Parallax (dezent, nur Desktop) ---------- */
  var parallaxOn = false;
  var innerParallax = $$('[data-parallax-inner]');
  function updateParallax() {
    if (!parallaxOn) return;
    var vh = window.innerHeight;
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
      innerParallax.forEach(function (fig) { var img = fig.querySelector('img'); if (img) img.style.transform = ''; });
    }
    updateParallax();
  }

  /* ---------- Mobile Aktionsleiste ---------- */
  var actionBar = $('[data-action-bar]');
  var contactInView = false;
  function updateActionBar() {
    if (!actionBar) return;
    var past = hero ? window.scrollY > hero.offsetHeight * 0.4 : window.scrollY > 400;
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

  /* ---------- Eröffnung (Vorhang) ---------- */
  var intro = $('[data-intro]');
  var introMs = 0;
  if (intro) {
    if (root.classList.contains('no-intro')) {
      intro.parentNode.removeChild(intro);
    } else {
      introMs = 1350;
      var endIntro = function () { if (intro.parentNode) intro.parentNode.removeChild(intro); };
      intro.addEventListener('click', function () {
        intro.classList.add('is-skipped');
        window.setTimeout(endIntro, 500);
      });
      window.setTimeout(endIntro, 2500);
    }
  }

  /* ---------- Hero: wechselnde Arbeiten im Bogenfenster ---------- */
  var slideBox = $('[data-slides]');
  if (slideBox) {
    var slides = $$('.hero__slide', slideBox);
    var capText = $('.hero__cap-text', slideBox);
    var capCat = $('[data-slide-cat]', slideBox);
    var capTitle = $('[data-slide-title]', slideBox);
    var capCount = $('[data-slide-count]', slideBox);
    var pauseBtn = $('[data-slide-pause]', slideBox);
    var si = 0;
    var slideTimer = null;
    var userPaused = false;
    var heroInView = true;
    var pad = function (n) { return String(n).padStart(2, '0'); };

    var showSlide = function (i) {
      slides[si].classList.remove('is-active');
      si = (i + slides.length) % slides.length;
      var s = slides[si];
      s.loading = 'eager';
      s.classList.add('is-active');
      capCat.textContent = s.getAttribute('data-cat') || '';
      capTitle.textContent = s.getAttribute('data-title') || '';
      capCount.textContent = pad(si + 1) + ' / ' + pad(slides.length);
      capText.classList.remove('is-changing');
      void capText.offsetWidth;
      capText.classList.add('is-changing');
    };
    var scheduleSlide = function (delay) {
      window.clearTimeout(slideTimer);
      if (userPaused || reduceMotion.matches || !heroInView || doc.hidden || slides.length < 2) return;
      slideTimer = window.setTimeout(function () { showSlide(si + 1); scheduleSlide(5600); }, delay);
    };

    if (slides.length < 2) {
      pauseBtn.hidden = true;
    } else {
      if (reduceMotion.matches) {
        userPaused = true;
        pauseBtn.setAttribute('aria-pressed', 'true');
        pauseBtn.setAttribute('aria-label', 'Bildwechsel starten');
      }
      pauseBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn.setAttribute('aria-pressed', String(userPaused));
        pauseBtn.setAttribute('aria-label', userPaused ? 'Bildwechsel starten' : 'Bildwechsel pausieren');
        if (!userPaused) { showSlide(si + 1); scheduleSlide(5600); } else { window.clearTimeout(slideTimer); }
      });
      // restliche Bilder nach dem Laden der Seite vorladen
      window.addEventListener('load', function () {
        window.setTimeout(function () { slides.forEach(function (s) { s.loading = 'eager'; }); }, 1200);
      });
      if ('IntersectionObserver' in window) {
        var firstCall = true;
        new IntersectionObserver(function (entries) {
          heroInView = entries[0].isIntersecting;
          if (firstCall) { firstCall = false; return; }
          if (heroInView) scheduleSlide(3000); else window.clearTimeout(slideTimer);
        }).observe(slideBox);
      }
      doc.addEventListener('visibilitychange', function () { if (!doc.hidden) scheduleSlide(3000); });
      scheduleSlide(introMs + 5200);
    }
  }

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
          var shown = items.filter(function (li) {
            li.hidden = !(f === '*' || li.getAttribute('data-cat') === f);
            li.classList.remove('is-solo');
            return !li.hidden;
          });
          if (f !== '*' && shown.length === 1) shown[0].classList.add('is-solo');
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
    var today = (function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(new Date());
    if (dateInput) dateInput.min = today;

    var setMode = function (mode) {
      var input = $('#anliegen-' + mode, form);
      if (input) input.checked = true;
      var showroom = mode === 'showroom';
      showroomField.hidden = !showroom;
      submitLabel.textContent = showroom ? 'Termin anfragen' : 'Anfrage senden';
    };
    $$('[data-mode-input]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        var showroom = r.value === 'Showroom-Termin';
        setMode(showroom ? 'showroom' : 'event');
        // Das Feld für den Wunschtermin steht in Schritt 1
        if (showroom && current !== 1) showStep(1, false);
      });
    });
    $$('[data-mode="showroom"]').forEach(function (a) {
      a.addEventListener('click', function () { setMode('showroom'); showStep(1, false); });
    });
    $$('[data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        setMode('event');
        var val = a.getAttribute('data-service');
        $$('input[name="leistungen[]"]', form).forEach(function (cb) { if (cb.value === val) cb.checked = true; });
        if (val === 'Hochzeiten') $('#e-1', form).checked = true;
        showStep(1, false);
      });
    });

    var rules = {
      datum: { step: 1, el: dateInput, test: function (v) { return !v || v >= today; } },
      name: { step: 3, el: $('#f-name', form), test: function (v) { return v.trim().length > 1; } },
      email: { step: 3, el: $('#f-email', form), test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } }
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

    /* Geführte Anfrage in drei Schritten */
    var steps = $$('.fstep', form);
    var stepBtns = $$('.form__step', form);
    var stepBar = $('[data-step-bar]', form);
    var stepLive = $('[data-step-live]', form);
    var summaryBox = $('[data-summary]', form);
    var summaryList = $('[data-summary-list]', form);
    var STEP_NAMES = ['Anlass', 'Wünsche', 'Kontakt'];
    var current = 1;

    var validateStep = function (n) {
      var firstBad = null;
      Object.keys(rules).forEach(function (key) {
        var r = rules[key];
        if (r.step !== n || !r.el) return;
        var bad = !r.test(r.el.value);
        setError(key, bad);
        if (bad && !firstBad) firstBad = r.el;
      });
      return firstBad;
    };

    var fmtDate = function (v) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
      return m ? m[3] + '.' + m[2] + '.' + m[1] : '';
    };
    var renderSummary = function () {
      var fd = new FormData(form);
      var val = function (k) { return String(fd.get(k) || '').trim(); };
      var showroom = val('anliegen') === 'Showroom-Termin';
      var msg = val('nachricht');
      if (msg.length > 90) msg = msg.slice(0, 88).trim() + ' …';
      var rows = [
        { step: 1, label: 'Anlass', parts: [val('eventart'), fmtDate(val('datum')), val('gaeste'), val('location'), showroom && val('wunschtermin') ? 'Showroom: ' + val('wunschtermin') : ''] },
        { step: 2, label: 'Wünsche', parts: [fd.getAll('leistungen[]').join(', '), val('budget') ? 'Budget ' + val('budget') : '', msg ? '„' + msg + '“' : ''] }
      ];
      summaryList.textContent = '';
      rows.forEach(function (row) {
        var wrap = doc.createElement('div');
        wrap.className = 'summary__row';
        var dt = doc.createElement('dt');
        dt.textContent = row.label;
        var dd = doc.createElement('dd');
        var text = row.parts.filter(Boolean).join(' · ');
        dd.textContent = text || 'Noch offen – gern im Gespräch';
        if (!text) dd.className = 'is-empty';
        var act = doc.createElement('dd');
        act.className = 'summary__act';
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'summary__edit';
        btn.setAttribute('data-goto', String(row.step));
        btn.setAttribute('aria-label', row.label + ' ändern');
        btn.textContent = 'Ändern';
        act.appendChild(btn);
        wrap.appendChild(dt);
        wrap.appendChild(dd);
        wrap.appendChild(act);
        summaryList.appendChild(wrap);
      });
      summaryBox.hidden = false;
    };

    var scrollToForm = function () {
      var top = form.getBoundingClientRect().top;
      var headerH = header ? header.offsetHeight : 0;
      if (top < headerH || top > window.innerHeight * 0.5) {
        window.scrollTo({ top: top + window.scrollY - headerH - 16, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    };

    var showStep = function (n, focus) {
      current = n;
      steps.forEach(function (fs) { fs.classList.toggle('is-current', Number(fs.getAttribute('data-step')) === n); });
      stepBtns.forEach(function (btn) {
        var i = Number(btn.getAttribute('data-goto'));
        if (i === n) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
        btn.classList.toggle('is-done', i < n);
      });
      if (stepBar) stepBar.style.setProperty('--progress', String(n / steps.length));
      if (n === steps.length) renderSummary();
      if (focus === false) return;
      if (stepLive) stepLive.textContent = 'Schritt ' + n + ' von ' + steps.length + ': ' + STEP_NAMES[n - 1];
      $('.fstep__title', steps[n - 1]).focus({ preventScroll: true });
      scrollToForm();
    };

    var goTo = function (n) {
      n = Math.max(1, Math.min(steps.length, n));
      // Vorwärts nur, wenn die übersprungenen Schritte gültig sind
      for (var s = current; s < n; s++) {
        var bad = validateStep(s);
        if (bad) {
          if (s !== current) showStep(s, false);
          bad.focus();
          return;
        }
      }
      showStep(n);
    };

    form.addEventListener('click', function (e) {
      var t = e.target.closest('[data-goto], [data-step-next], [data-step-back]');
      if (!t || !form.contains(t)) return;
      if (t.hasAttribute('data-goto')) goTo(Number(t.getAttribute('data-goto')));
      else if (t.hasAttribute('data-step-next')) goTo(current + 1);
      else goTo(current - 1);
    });
    // Datumsfehler verschwindet, sobald ein gültiges Datum gewählt ist
    if (dateInput) dateInput.addEventListener('change', function () { if (rules.datum.test(dateInput.value)) setError('datum', false); });

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
      // Enter in Schritt 1 oder 2 führt zum nächsten Schritt statt abzusenden
      if (current < steps.length) { goTo(current + 1); return; }
      statusEl.textContent = '';
      for (var s = 1; s <= steps.length; s++) {
        var firstBad = validateStep(s);
        if (firstBad) {
          if (s !== current) showStep(s, false);
          firstBad.focus();
          return;
        }
      }

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
      summaryBox.hidden = true;
      showStep(1);
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

  /* ---------- Goldstaub im Hero ----------
     Startet erst, wenn die Seite fertig geladen ist, zeichnet vorbereitete Lichtpunkte
     (keine Verläufe pro Bild) und pausiert, sobald der Hero nicht sichtbar ist. */
  var dust = $('[data-dust]');
  // Nur auf größeren Bildschirmen: auf Handys hat schnelles Laden Vorrang
  if (dust && hero && dust.getContext && !reduceMotion.matches && window.matchMedia('(min-width: 900px)').matches) {
    var startDust = function () {
      var dctx = dust.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var narrow = window.innerWidth < 700;
      var DW = 0, DH = 0, motes = [], dustRaf = null, dustVisible = true, skip = false;
      var sprite = doc.createElement('canvas');
      var SP = 32;
      sprite.width = sprite.height = SP * 2;
      var sctx = sprite.getContext('2d');
      var sg = sctx.createRadialGradient(SP, SP, 0, SP, SP, SP);
      sg.addColorStop(0, 'rgba(255, 238, 196, 1)');
      sg.addColorStop(0.35, 'rgba(214, 182, 112, 0.55)');
      sg.addColorStop(1, 'rgba(205, 176, 122, 0)');
      sctx.fillStyle = sg; sctx.fillRect(0, 0, SP * 2, SP * 2);
      var sizeDust = function () {
        var r = hero.getBoundingClientRect();
        DW = r.width; DH = r.height;
        dust.width = Math.round(DW * dpr); dust.height = Math.round(DH * dpr);
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      var mote = function (anywhere) {
        return {
          x: Math.random() * DW, y: anywhere ? Math.random() * DH : DH + 12,
          r: 0.6 + Math.pow(Math.random(), 2.2) * 2.8,
          vy: 0.06 + Math.random() * 0.22,
          sway: Math.random() * 6.28, swaySpeed: 0.002 + Math.random() * 0.004,
          a: 0.22 + Math.random() * 0.5, tw: Math.random() * 6.28
        };
      };
      sizeDust();
      for (var mi = 0; mi < (narrow ? 14 : 38); mi++) motes.push(mote(true));
      var drawDust = function () {
        dustRaf = window.requestAnimationFrame(drawDust);
        if (narrow) { skip = !skip; if (skip) return; }
        dctx.clearRect(0, 0, DW, DH);
        for (var k = 0; k < motes.length; k++) {
          var m = motes[k];
          m.y -= narrow ? m.vy * 2 : m.vy; m.sway += m.swaySpeed; m.tw += 0.018;
          if (m.y < -12) { motes[k] = mote(false); continue; }
          var size = m.r * 6.4;
          dctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(m.tw));
          dctx.drawImage(sprite, m.x + Math.sin(m.sway) * 16 - size / 2, m.y - size / 2, size, size);
        }
        dctx.globalAlpha = 1;
      };
      var runDust = function () {
        var on = dustVisible && !doc.hidden;
        if (on && !dustRaf) dustRaf = window.requestAnimationFrame(drawDust);
        if (!on && dustRaf) { window.cancelAnimationFrame(dustRaf); dustRaf = null; }
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { dustVisible = entries[0].isIntersecting; runDust(); }).observe(hero);
      }
      doc.addEventListener('visibilitychange', runDust);
      var dustResize = null;
      window.addEventListener('resize', function () { window.clearTimeout(dustResize); dustResize = window.setTimeout(sizeDust, 200); });
      runDust();
    };
    var whenIdle = window.requestIdleCallback || function (fn) { return window.setTimeout(fn, 1); };
    var queueDust = function () { window.setTimeout(function () { whenIdle(startDust); }, 2500); };
    if (doc.readyState === 'complete') queueDust(); else window.addEventListener('load', queueDust);
  }

  /* ---------- „Ansehen“-Cursor über Galeriebildern ---------- */
  var viewCursor = $('[data-view-cursor]');
  if (viewCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    root.classList.add('has-view-cursor');
    var vx = -200, vy = -200, tx = -200, ty = -200, vRaf = null, onImage = false;
    var moveCursor = function () {
      vx += (tx - vx) * 0.22; vy += (ty - vy) * 0.22;
      viewCursor.style.transform = 'translate3d(' + vx.toFixed(1) + 'px,' + vy.toFixed(1) + 'px,0)';
      vRaf = (Math.abs(tx - vx) > 0.2 || Math.abs(ty - vy) > 0.2) ? window.requestAnimationFrame(moveCursor) : null;
    };
    doc.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var over = !!(e.target.closest && e.target.closest('.pf-card'));
      if (over !== onImage) {
        onImage = over;
        if (over) { vx = tx; vy = ty; }
        viewCursor.classList.toggle('is-on', over);
        viewCursor.style.scale = over ? '1' : '0.6';
      }
      if (!vRaf) vRaf = window.requestAnimationFrame(moveCursor);
    }, { passive: true });
    doc.documentElement.addEventListener('pointerleave', function () { onImage = false; viewCursor.classList.remove('is-on'); });
  }

  /* ---------- Kleinigkeiten ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  onScrollHeader();
  setParallax();
  updateActionBar();
  initReveal();
})();
