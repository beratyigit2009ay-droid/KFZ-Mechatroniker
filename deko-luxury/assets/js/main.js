/* LUXURY EVENTS by DEKO.LUXURY – Interaktionen (ohne Bibliotheken) */

/* ==========================================================================
   KONTAKTDATEN – hier eintragen, dann sind alle Buttons der Website verknüpft
   (Startbereich, Kontakt, Footer, Mini-Leiste). Leer = Button zeigt einen Hinweis.
   ========================================================================== */
var KONTAKT = {
  email: 'deko.luxury@gmx.de',
  // Empfänger der Formular-Anfragen. Leer ('') = email oben.
  anfrageAn: '',
  // Versand des Formulars: true = kostenloser Dienst FormSubmit (für GitHub Pages, ohne PHP).
  // false = Versand über anfrage.php (Webhosting mit PHP; Empfänger dann in anfrage.php).
  formDienst: true,
  telefon: '+49 179 4310823',
  whatsapp: '491794310823',  // international, ohne + und Leerzeichen
  instagram: 'https://www.instagram.com/deko.luxury/',
  google: 'https://share.google/bSpoMTGI2UBNDgjTF',  // Google-Profil (Bewertungen, Route)
  whatsappText: 'Hallo DEKO.LUXURY, wir interessieren uns für eine Dekoration.'
};

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

  /* ---------- Einblendungen beim Scrollen (IntersectionObserver) ----------
     Ohne JavaScript ist alles sichtbar. Elemente, die beim Laden schon im Bild sind, bleiben
     unverändert (.is-shown). Alles darunter wartet unsichtbar (.rv-wait) und gleitet sanft herein,
     sobald es den Sichtbereich erreicht. Was gleichzeitig hereinkommt, erscheint nacheinander (Stagger). */
  function initReveal() {
    var els = $$('[data-reveal], [data-reveal-img]');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      els.forEach(function (el) { el.classList.add('is-shown'); });
      return;
    }
    var reveal = function (el, delay) {
      el.style.setProperty('--d', delay.toFixed(3) + 's');
      el.classList.remove('rv-wait');
      el.classList.add('is-in');
    };
    var row = function (e) { return Math.round(e.boundingClientRect.top / 24); };
    var io = new IntersectionObserver(function (entries) {
      // Stagger je Gruppe (z. B. Kartenraster): von oben links nach unten rechts, Gruppen leicht versetzt
      var groups = [];
      entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return (row(a) - row(b)) || (a.boundingClientRect.left - b.boundingClientRect.left); })
        .forEach(function (entry) {
          var parent = entry.target.parentElement;
          var g = groups.filter(function (x) { return x.parent === parent; })[0];
          if (!g) { g = { parent: parent, els: [] }; groups.push(g); }
          g.els.push(entry.target);
        });
      groups.forEach(function (g, gi) {
        g.els.forEach(function (el, i) {
          reveal(el, Math.min(0.6, gi * 0.06 + i * 0.075));
          io.unobserve(el);
        });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    var vh = window.innerHeight;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('is-shown'); return; }
      el.classList.add('rv-wait');
      io.observe(el);
    });
    // Sicherheitsnetz: nichts bleibt versteckt, falls ein Beobachter-Ereignis ausbleibt
    var sweep = function () {
      $$('.rv-wait').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { io.unobserve(el); reveal(el, 0); }
      });
    };
    if (doc.readyState === 'complete') window.setTimeout(sweep, 1200);
    else window.addEventListener('load', function () { window.setTimeout(sweep, 1200); });
    window.addEventListener('pageshow', sweep);
  }

  /* ---------- Zeitstrahl: goldene Linie zeichnet sich beim Hineinscrollen ---------- */
  var timeline = $('[data-timeline]');
  function sizeTimeline() {
    if (!timeline) return;
    var nodes = $$('.tl__node', timeline);
    if (nodes.length < 2) return;
    var h = nodes[nodes.length - 1].getBoundingClientRect().top - nodes[0].getBoundingClientRect().top;
    timeline.style.setProperty('--tl-h', Math.max(0, h).toFixed(0) + 'px');
  }
  if (timeline) {
    // Messen erst nach dem Laden, damit der Seitenaufbau nicht ausgebremst wird
    if (doc.readyState === 'complete') sizeTimeline(); else window.addEventListener('load', sizeTimeline);
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      timeline.classList.add('is-drawn');
    } else {
      var tlIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        timeline.classList.add('is-drawn');
        tlIO.disconnect();
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });
      tlIO.observe(timeline);
    }
  }

  /* ---------- Hero: Parallax-Ebenen (Maus und Scrollen, sparsam) ---------- */
  var layers = hero ? $$('[data-depth]', hero) : [];
  var heroVisible = true;
  var px = { mx: 0, my: 0, tx: 0, ty: 0, raf: null };
  function renderLayers() {
    px.mx += (px.tx - px.mx) * 0.08;
    px.my += (px.ty - px.my) * 0.08;
    var sy = Math.min(window.scrollY, window.innerHeight * 1.2);
    layers.forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-depth')) || 0;
      el.style.transform = 'translate3d(' + (px.mx * d * 26).toFixed(2) + 'px,' + (px.my * d * 18 + sy * d * 0.22).toFixed(2) + 'px,0)';
    });
    px.raf = (Math.abs(px.tx - px.mx) > 0.002 || Math.abs(px.ty - px.my) > 0.002) ? window.requestAnimationFrame(renderLayers) : null;
  }
  function kickLayers() {
    if (!layers.length || reduceMotion.matches || !heroVisible) return;
    if (!px.raf) px.raf = window.requestAnimationFrame(renderLayers);
  }
  if (layers.length && !reduceMotion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      px.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      px.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kickLayers();
    }, { passive: true });
  }
  // Endlos-Animationen im Hero pausieren, sobald er nicht sichtbar ist
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      hero.classList.toggle('is-off', !heroVisible);
    }).observe(hero);
  }

  /* ---------- Parallax beim Scrollen ----------
     Bevorzugt per CSS-Scroll-Timeline (Klasse .sd, läuft im Compositor und ruckelt auch auf dem
     iPhone nicht). Ältere Browser am Computer bekommen eine schlanke JS-Variante; auf älteren
     Smartphones bleibt es bei den Einblendungen, damit nichts nachzieht. */
  var canSD = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: cover 0% cover 100%'));
  if (canSD && !reduceMotion.matches) root.classList.add('sd');
  var par = (!canSD && !reduceMotion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) ? {
    content: $('.hero__content'), arch: $('.hero__arch'),
    frame: $('.about__frame'), img: $('.about__par'),
    mark: $('.footer__mark'), markY: 0, heroOn: false
  } : null;
  var clamp01 = function (v) { return v < 0 ? 0 : (v > 1 ? 1 : v); };
  function updateParallax() {
    if (!par) return;
    var vh = window.innerHeight;
    var y = window.scrollY;
    var wide = window.innerWidth > 900;
    if (wide && y < vh * 1.3) {
      var p = clamp01(y / (vh * 0.85));
      if (par.content) { par.content.style.opacity = (1 - 0.65 * p).toFixed(3); par.content.style.transform = 'translate3d(0,' + (-56 * p).toFixed(1) + 'px,0)'; }
      if (par.arch) par.arch.style.transform = 'translate3d(0,' + (96 * clamp01(y / vh)).toFixed(1) + 'px,0)';
      par.heroOn = true;
    } else if (!wide && par.heroOn) {
      [par.content, par.arch].forEach(function (el) { if (el) { el.style.opacity = ''; el.style.transform = ''; } });
      par.heroOn = false;
    }
    if (par.frame && par.img) {
      var r = par.frame.getBoundingClientRect();
      var q = clamp01((vh - r.top) / (vh + r.height));
      par.img.style.transform = 'translate3d(0,' + (-3.5 + 7 * q).toFixed(2) + '%,0) scale(1.08)';
    }
    if (par.mark) {
      var m = par.mark.getBoundingClientRect();
      var top = m.top - par.markY; // Position ohne eigene Verschiebung
      par.markY = 56 * (1 - clamp01((vh - top) / m.height));
      par.mark.style.transform = 'translate3d(0,' + par.markY.toFixed(1) + 'px,0)';
    }
  }

  /* ---------- Scroll-Fortschritt (Fallback ohne CSS-Scroll-Timeline) ---------- */
  var progressBar = $('[data-progress]');
  var progressJS = !!progressBar && !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
  function updateProgress() {
    if (!progressJS) return;
    var max = root.scrollHeight - window.innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0).toFixed(4) + ')';
  }

  /* ---------- Mini-Leiste „Beratung anfragen“ ---------- */
  var actionBar = $('[data-action-bar]');
  var contactInView = false;
  function updateActionBar() {
    if (!actionBar) return;
    var past = hero ? window.scrollY > hero.offsetHeight * 0.4 : window.scrollY > 400;
    actionBar.classList.toggle('is-visible', past && !contactInView && !menuOpen);
  }
  // Ausblenden, solange Kontaktformular oder Footer im Bild sind
  var barHiders = [doc.getElementById('kontakt'), $('.footer')].filter(Boolean);
  if (barHiders.length && 'IntersectionObserver' in window) {
    var hiding = {};
    var barIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { hiding[barHiders.indexOf(en.target)] = en.isIntersecting; });
      contactInView = Object.keys(hiding).some(function (k) { return hiding[k]; });
      updateActionBar();
    }, { rootMargin: '0px 0px -20% 0px' });
    barHiders.forEach(function (el) { barIO.observe(el); });
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      kickLayers();
      updateActionBar();
      updateProgress();
      updateParallax();
      ticking = false;
    });
  }, { passive: true });
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () { sizeTimeline(); updateProgress(); updateParallax(); }, 150);
  });

  /* ---------- Eröffnung (Tor) ---------- */
  var intro = $('[data-intro]');
  var introMs = 0;
  if (intro) {
    if (root.classList.contains('no-intro')) {
      intro.parentNode.removeChild(intro);
    } else {
      introMs = 3000;
      var introOver = false;
      var skipEvents = ['keydown', 'wheel', 'scroll'];
      var endIntro = function () {
        introOver = true;
        skipEvents.forEach(function (type) { window.removeEventListener(type, skipIntro); });
        if (intro.parentNode) intro.parentNode.removeChild(intro);
      };
      var skipIntro = function () {
        if (introOver) return;
        introOver = true;
        // Hero-Animationen sofort starten statt auf das Ende der Eröffnung zu warten
        var now = doc.timeline && doc.timeline.currentTime ? doc.timeline.currentTime / 1000 : 0;
        if (now < 3) root.style.setProperty('--intro', now.toFixed(2) + 's');
        intro.classList.add('is-skipped');
        window.setTimeout(endIntro, 480);
      };
      // Sicherung: Das Logo der Eröffnung verschwindet garantiert, sobald die Torflügel aufgehen
      // (Safari/iPhone ignorierte das reine CSS-Ausblenden über „visibility“). Die Flügel tragen
      // in diesem Moment dasselbe Logo, daher ist der Wechsel unsichtbar.
      var hideIntroLogo = function () {
        var logo = $('.gate__logo', intro);
        if (logo) logo.style.display = 'none';
      };
      intro.addEventListener('animationstart', function (e) { if (e.animationName === 'gate-l') hideIntroLogo(); });
      window.setTimeout(hideIntroLogo, 3200);
      intro.addEventListener('click', skipIntro);
      skipEvents.forEach(function (type) { window.addEventListener(type, skipIntro, { passive: true }); });
      window.setTimeout(endIntro, 4200);
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

  /* ---------- Galerie / Lightbox ---------- */
  var lb = $('[data-lightbox]');
  var lbState = { list: [], index: 0 };
  function galleryItems(name) {
    return $$('[data-gallery="' + name + '"]');
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

  /* ---------- Hinweis (Toast) ---------- */
  var toastEl = $('[data-toast]');
  var toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    $('[data-toast-text]', toastEl).textContent = text;
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    requestAnimationFrame(function () { requestAnimationFrame(function () { toastEl.classList.add('is-on'); }); });
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-on');
      window.setTimeout(function () { if (!toastEl.classList.contains('is-on')) toastEl.hidden = true; }, 500);
    }, 4200);
  }

  /* ---------- Kontakt-Buttons aus KONTAKT verknüpfen ---------- */
  var onlyDigits = function (s) { return String(s || '').replace(/[^\d+]/g, ''); };
  var contactLinks = {
    email: KONTAKT.email ? { href: 'mailto:' + KONTAKT.email, label: KONTAKT.email } : null,
    phone: KONTAKT.telefon ? { href: 'tel:' + onlyDigits(KONTAKT.telefon), label: KONTAKT.telefon } : null,
    whatsapp: KONTAKT.whatsapp ? { href: 'https://wa.me/' + onlyDigits(KONTAKT.whatsapp).replace('+', '') + '?text=' + encodeURIComponent(KONTAKT.whatsappText || ''), label: 'Chat starten', external: true } : null,
    instagram: KONTAKT.instagram ? { href: KONTAKT.instagram, label: '@' + KONTAKT.instagram.replace(/\/+$/, '').split('/').pop(), external: true } : null,
    google: KONTAKT.google ? { href: KONTAKT.google, label: 'Auf Google ansehen', external: true } : null
  };
  var missingText = {
    phone: 'Die Telefonnummer folgt in Kürze. Schreibt uns bis dahin gern an ' + KONTAKT.email + ' oder über das Formular.',
    whatsapp: 'WhatsApp folgt in Kürze. Schreibt uns bis dahin gern an ' + KONTAKT.email + ' oder über das Formular.',
    instagram: 'Unser Instagram-Profil wird hier in Kürze verlinkt.'
  };
  $$('[data-contact]').forEach(function (a) {
    var type = a.getAttribute('data-contact');
    var link = contactLinks[type];
    var label = $('[data-contact-label]', a);
    if (link) {
      a.href = link.href;
      if (link.external) { a.target = '_blank'; a.rel = 'noopener'; }
      if (label && type !== 'email') label.textContent = link.label;
      a.classList.remove('is-todo');
      return;
    }
    a.classList.add('is-todo');
    a.addEventListener('click', function (e) {
      e.preventDefault();
      toast(missingText[type] || 'Folgt in Kürze.');
    });
  });

  /* ---------- Bestätigung (Dialog) ---------- */
  var thanks = $('[data-thanks]');
  function showThanks(title, text, actions) {
    if (!thanks) return;
    $('[data-thanks-title]', thanks).textContent = title;
    $('[data-thanks-text]', thanks).textContent = text;
    var box = $('[data-thanks-actions]', thanks);
    box.textContent = '';
    (actions || []).forEach(function (el) { box.appendChild(el); });
    if (typeof thanks.showModal === 'function') {
      if (!thanks.open) { thanks.showModal(); lockScroll(); }
    } else {
      toast(title + ' ' + text);
    }
  }
  if (thanks) thanks.addEventListener('close', unlockScroll);

  /* ---------- Anfrageformular ---------- */
  var form = $('[data-form]');
  if (form) {
    var statusEl = $('[data-form-status]');
    var submitBtn = $('[data-submit]', form);
    var submitLabel = $('[data-submit-label]', form);
    var eventSelect = $('#f-eventart', form);
    var message = $('#f-nachricht', form);
    var reachError = $('[data-reach-error]', form);
    var ts = $('[data-ts]', form);
    if (ts) ts.value = String(Date.now());

    // „… anfragen“-Links bei den Leistungen wählen die passende Event-Art bzw. Leistung vor
    $$('[data-event], [data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        var ev = a.getAttribute('data-event');
        if (ev && eventSelect) {
          for (var k = 0; k < eventSelect.options.length; k++) {
            if (eventSelect.options[k].text === ev) { eventSelect.selectedIndex = k; break; }
          }
        }
        var service = a.getAttribute('data-service');
        if (service && message && !message.value.trim()) message.value = 'Wir interessieren uns für: ' + service + '.\n';
      });
    });

    var fields = {
      name: { el: $('#f-name', form), test: function (v) { return v.trim().length > 1; } },
      email: { el: $('#f-email', form), test: function (v) { return !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
      telefon: { el: $('#f-telefon', form), test: function (v) { return !v.trim() || v.replace(/\D/g, '').length >= 6; } }
    };
    var setError = function (key, bad) {
      var f = fields[key];
      var msg = $('#' + f.el.id + '-error');
      var base = f.el.getAttribute('data-describedby') || '';
      f.el.closest('.field').classList.toggle('has-error', bad);
      f.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      var ids = ((bad ? msg.id + ' ' : '') + base).trim();
      if (ids) f.el.setAttribute('aria-describedby', ids); else f.el.removeAttribute('aria-describedby');
      msg.hidden = !bad;
    };
    var reachable = function () { return !!(fields.email.el.value.trim() || fields.telefon.el.value.trim()); };
    var setReach = function (bad) {
      reachError.hidden = !bad;
      ['email', 'telefon'].forEach(function (k) {
        var box = fields[k].el.closest('.field');
        if (bad) box.classList.add('has-error');
        else if (fields[k].test(fields[k].el.value)) box.classList.remove('has-error');
      });
    };
    Object.keys(fields).forEach(function (key) {
      var f = fields[key];
      f.el.addEventListener('blur', function () { if (f.el.value) setError(key, !f.test(f.el.value)); });
      f.el.addEventListener('input', function () {
        if (f.el.closest('.field').classList.contains('has-error') && f.test(f.el.value)) setError(key, false);
        if (!reachError.hidden && reachable()) setReach(false);
      });
    });

    // Übersichtliche Zusammenfassung: erst was gewünscht ist, dann die Kontaktdaten.
    // wa = true formatiert Überschriften fett für WhatsApp.
    var summary = function (wa) {
      var fd = new FormData(form);
      var val = function (k) { return String(fd.get(k) || '').trim(); };
      var head = function (t) { return wa ? '*' + t + '*' : t.toUpperCase(); };
      var lines = ['Hallo DEKO.LUXURY,', '', 'hier ist meine Anfrage über eure Website:', '', head('Was ich mir wünsche')];
      lines.push('Event-Art: ' + (val('eventart') || 'noch offen'));
      lines.push('Datum / Wunschzeitraum: ' + (val('datum') || 'noch offen'));
      if (val('nachricht')) lines.push('Nachricht:', val('nachricht'));
      lines.push('', head('Kontakt'), 'Name: ' + val('name'));
      if (val('email')) lines.push('E-Mail: ' + val('email'));
      if (val('telefon')) lines.push('Telefon: ' + val('telefon'));
      return lines.join('\n');
    };
    var subjectLine = function (prefix) {
      var fd = new FormData(form);
      var val = function (k) { return String(fd.get(k) || '').trim(); };
      return prefix + [val('eventart') || 'Beratung', val('datum'), val('name')].filter(Boolean).join(' · ');
    };
    // Telefonnummer für WhatsApp-Links: nur Ziffern, international (0176… → 49176…)
    var waNumber = function (tel) {
      var d = String(tel).replace(/\D/g, '');
      if (/^\s*\+/.test(tel)) return d;
      if (d.indexOf('00') === 0) return d.slice(2);
      if (d.indexOf('0') === 0) return '49' + d.slice(1);
      return d;
    };
    var firstName = function () { return (fields.name.el.value || '').trim().split(/\s+/)[0]; };
    var done = function (preview) {
      var n = firstName();
      showThanks('Danke' + (n ? ', ' + n : '') + '!',
        preview ? 'Das ist nur die Vorschau – hier wird nichts verschickt. Auf der echten Website kommt die Anfrage per E-Mail bei uns an.' : 'Eure Anfrage ist bei uns angekommen. Wir melden uns schnell.');
      form.reset();
      if (ts) ts.value = String(Date.now());
    };

    // Versand über den Formular-Dienst FormSubmit: kommt als übersichtliche Tabelle per E-Mail an.
    // Beim allerersten Absenden schickt FormSubmit stattdessen eine Mail „Activate Form“ an den Empfänger.
    var sendService = function () {
      var fd = new FormData(form);
      var val = function (k) { return String(fd.get(k) || '').trim(); };
      var data = {
        _subject: subjectLine('Neue Anfrage: '),
        _template: 'table',
        _captcha: 'false',
        _honey: val('website'),
        'Event-Art': val('eventart') || 'nicht angegeben',
        'Datum / Zeitraum': val('datum') || 'nicht angegeben',
        'Nachricht': val('nachricht') || '–',
        'Name': val('name'),
        'E-Mail': val('email') || '–',
        'Telefon': val('telefon') || '–'
      };
      if (val('telefon')) data.WhatsApp = 'https://wa.me/' + waNumber(val('telefon'));
      if (val('email')) data._replyto = val('email');
      // Als einfaches Formular (kein JSON), damit der Browser keine Vorab-Anfrage braucht
      return fetch('https://formsubmit.co/ajax/' + (KONTAKT.anfrageAn || KONTAKT.email), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (r) { return { ok: !!r && (r.success === true || r.success === 'true') }; });
    };
    // Versand über anfrage.php (Webhosting mit PHP)
    var sendPhp = function () {
      return fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json().catch(function () { return { ok: false, error: 'http' }; }); })
        .then(function (r) { return { ok: !!(r && r.ok), validation: !!(r && r.error === 'validation') }; });
    };
    // Klappt der Versand nicht: fertig ausgefüllte E-Mail oder WhatsApp-Nachricht zum Selbst-Absenden
    var fallback = function () {
      var subject = subjectLine('Beratungsanfrage: ');
      var cut = function (t) { return t.length > 1800 ? t.slice(0, 1800) + ' …' : t; };
      var actions = [];
      var mail = doc.createElement('a');
      mail.className = 'btn btn--foil';
      mail.href = 'mailto:' + (KONTAKT.anfrageAn || KONTAKT.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(cut(summary(false)));
      mail.textContent = 'Per E-Mail senden';
      actions.push(mail);
      if (KONTAKT.whatsapp) {
        var wa = doc.createElement('a');
        wa.className = 'btn btn--ghost';
        wa.href = 'https://wa.me/' + onlyDigits(KONTAKT.whatsapp).replace('+', '') + '?text=' + encodeURIComponent(cut(summary(true)));
        wa.target = '_blank';
        wa.rel = 'noopener';
        wa.textContent = 'Per WhatsApp senden';
        actions.push(wa);
      }
      showThanks('Fast geschafft.', 'Ein Klick noch: Sendet uns eure Anfrage per E-Mail oder WhatsApp – alle Angaben sind schon eingetragen.', actions);
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.textContent = '';
      var firstBad = null;
      Object.keys(fields).forEach(function (key) {
        var bad = !fields[key].test(fields[key].el.value);
        setError(key, bad);
        if (bad && !firstBad) firstBad = fields[key].el;
      });
      if (!firstBad && !reachable()) { setReach(true); firstBad = fields.email.el; }
      if (firstBad) { firstBad.focus(); return; }

      if (form.getAttribute('data-demo') === 'true') { done(true); return; }
      // Spamschutz: Bots füllen das versteckte Feld aus oder senden sofort ab
      var hp = form.elements.website;
      if ((hp && hp.value) || (ts && Date.now() - Number(ts.value) < 3000)) { done(false); return; }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Wird gesendet …';
      (KONTAKT.formDienst ? sendService() : sendPhp())
        .then(function (r) {
          if (r.ok) done(false);
          else if (r.validation) statusEl.textContent = 'Bitte prüft Name und E-Mail oder Telefon.';
          else fallback();
        })
        .catch(fallback)
        .then(function () {
          submitBtn.disabled = false;
          submitLabel.textContent = 'Anfrage senden';
        });
    });
  }

  /* ---------- FAQ: weiches Auf- und Zuklappen ---------- */
  $$('.faq__item').forEach(function (d) {
    var sum = $('summary', d);
    var body = $('.faq__a', d);
    var anim = null;
    sum.addEventListener('click', function (e) {
      if (reduceMotion.matches || !body.animate) return;
      e.preventDefault();
      if (anim) { anim.cancel(); anim = null; }
      var ease = 'cubic-bezier(0.22, 0.61, 0.24, 1)';
      if (d.open) {
        anim = body.animate({ height: [body.offsetHeight + 'px', '0px'], opacity: [1, 0] }, { duration: 380, easing: ease });
        anim.onfinish = function () { d.open = false; anim = null; };
      } else {
        d.open = true;
        anim = body.animate({ height: ['0px', body.offsetHeight + 'px'], opacity: [0, 1] }, { duration: 480, easing: ease });
        anim.onfinish = function () { anim = null; };
      }
    });
  });

  /* ---------- Öffnungszeiten: heutigen Tag hervorheben ---------- */
  var todayRow = $('.hours__table [data-day="' + new Date().getDay() + '"]');
  if (todayRow) {
    todayRow.classList.add('is-today');
    var badge = doc.createElement('span');
    badge.className = 'hours__today';
    badge.textContent = 'Heute';
    $('th', todayRow).appendChild(badge);
  }

  /* ---------- Nach oben ---------- */
  $$('[data-to-top]').forEach(function (b) {
    b.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      var brand = $('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  });

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
      var over = !!(e.target.closest && e.target.closest('.gal__card'));
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
  updateActionBar();
  initReveal();
  kickLayers();
  updateProgress();
  updateParallax();
  window.addEventListener('load', updateProgress);
})();
