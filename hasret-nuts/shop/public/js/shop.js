/* =========================================================================
   Hasret Nuts · Online-Shop – progressive Verbesserung (Owner: BUILD-SHOP)
   Alles funktioniert auch ohne JavaScript (Formulare, Links, GET-Filter).
   Dieses Skript ergänzt: Fly-to-Cart (Web Animations API), Live-Zähler, Filter
   ohne Neuladen, Akkordeons, Galerie, Sorten-/Bundle-Auswahl mit Live-Preis,
   Suche mit Vorschlägen, Menü/Bottom-Sheet, Code kopieren, Newsletter inline.
   CSP: keine Inline-Handler, keine eval-Konstrukte, Daten nur per textContent.
   ========================================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ------------------------------------------------------------- Helfer */
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function mq(q) { try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; } }
  function onMQ(m, fn) { if (!m) return; if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  var mqReduce = mq('(prefers-reduced-motion: reduce)');
  var mqMobile = mq('(max-width: 768px)');
  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function isMobile() { return !!(mqMobile && mqMobile.matches); }
  function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { /* ignorieren */ } } }
  function csrf() { var m = $('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  var euroFmt = (window.Intl && Intl.NumberFormat) ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }) : null;
  function euro(cents) { var v = (Number(cents) || 0) / 100; return euroFmt ? euroFmt.format(v) : v.toFixed(2).replace('.', ',') + ' €'; }
  function canFetch() { return typeof window.fetch === 'function' && typeof window.FormData === 'function' && typeof window.URLSearchParams === 'function'; }

  function postForm(form, extraHeaders) {
    var headers = { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'x-csrf-token': csrf() };
    if (extraHeaders) Object.keys(extraHeaders).forEach(function (k) { headers[k] = extraHeaders[k]; });
    return fetch(form.getAttribute('action'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: headers,
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data = null;
        try { data = JSON.parse(txt); } catch (e) { data = null; }
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  /* --------------------------------------------------------- Live-Region */
  var live = $('[data-live]'), liveT;
  function announce(msg) {
    if (!live || !msg) return;
    live.textContent = '';
    clearTimeout(liveT);
    liveT = setTimeout(function () { live.textContent = msg; }, 80);
  }

  /* ----------------------------------------- Ebenen (Menü, Filter-Sheet) */
  var scrim = $('[data-scrim]');
  function lockScroll() {
    var sw = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (sw > 0) doc.body.style.paddingRight = sw + 'px';
  }
  function unlockScroll() { root.style.overflow = ''; doc.body.style.paddingRight = ''; }
  function syncSheets() {
    var m = isMobile();
    $$('[data-filters]').forEach(function (a) {
      if (m && !a.classList.contains('is-open')) a.setAttribute('inert', ''); else a.removeAttribute('inert');
    });
  }
  var Layer = {
    cur: null,
    open: function (el, opener, focusTarget) {
      if (!el) return;
      if (this.cur) this.close(true);
      Search.close(true);
      el.classList.add('is-open');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      syncSheets();
      if (scrim) scrim.classList.add('is-on');
      if (opener) opener.setAttribute('aria-expanded', 'true');
      lockScroll();
      this.cur = { el: el, opener: opener };
      setTimeout(function () { focusEl(focusTarget || el); }, 40);
    },
    close: function (noFocus) {
      var c = this.cur;
      if (!c) return;
      this.cur = null;
      c.el.classList.remove('is-open');
      c.el.removeAttribute('role');
      c.el.removeAttribute('aria-modal');
      syncSheets();
      if (scrim) scrim.classList.remove('is-on');
      var opener = c.opener && doc.body.contains(c.opener) ? c.opener : null;
      if (!opener && c.el.hasAttribute('data-filters')) opener = $('[data-filter-open]');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      unlockScroll();
      if (!noFocus) focusEl(opener);
    }
  };
  if (scrim) scrim.addEventListener('click', function () { Layer.close(); });
  function focusables(el) {
    return $$('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', el).filter(function (x) {
      if (!x.getClientRects().length) return false;
      try { return window.getComputedStyle(x).visibility !== 'hidden'; } catch (e) { return true; }
    });
  }

  /* ---------------------------------------------------------------- Suche */
  var Search = (function () {
    var panel = $('[data-search]'), btn = $('[data-search-toggle]'), input = $('[data-search-input]');
    var list = $('[data-search-results]'), status = $('[data-search-status]');
    var open = false, timer = null, seq = 0;
    function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
    function render(data) {
      if (!list) return;
      clear(list);
      (data.results || []).forEach(function (r) {
        var li = doc.createElement('li');
        var a = doc.createElement('a'); a.className = 'sr-item'; a.href = r.href;
        var th = doc.createElement('span'); th.className = 'sr-item__thumb'; th.setAttribute('aria-hidden', 'true'); th.textContent = r.photo || '';
        var tx = doc.createElement('span'); tx.className = 'sr-item__txt';
        var st = doc.createElement('strong'); st.textContent = r.name;
        var sm = doc.createElement('small'); sm.textContent = r.subtitle;
        tx.appendChild(st); tx.appendChild(sm);
        var meta = doc.createElement('span'); meta.className = 'sr-item__meta';
        var pr = doc.createElement('strong'); pr.textContent = r.price;
        var ct = doc.createElement('span'); ct.textContent = r.category;
        meta.appendChild(pr); meta.appendChild(ct);
        a.appendChild(th); a.appendChild(tx); a.appendChild(meta);
        li.appendChild(a); list.appendChild(li);
      });
      if (status) {
        status.textContent = !data.q ? '' : data.count ? data.count + (data.count === 1 ? ' Treffer' : ' Treffer') + ' – Eingabetaste zeigt alle Ergebnisse' : 'Keine Produkte gefunden. Versuchen Sie z. B. „Lokum“ oder „Pistazien“.';
      }
    }
    function query() {
      var q = (input && input.value || '').trim();
      var my = ++seq;
      if (!q) { render({ q: '', results: [] }); return; }
      if (!canFetch()) return;
      fetch('/suche?q=' + encodeURIComponent(q.slice(0, 100)), { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d && my === seq) render(d); })
        .catch(function () { /* still: Formular funktioniert weiterhin */ });
    }
    function show() {
      if (!panel) return;
      Layer.close(true);
      open = true;
      panel.classList.add('is-open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
      setTimeout(function () { focusEl(input); if (input && input.value) query(); }, 30);
    }
    function close(noFocus) {
      if (!open || !panel) return;
      open = false;
      panel.classList.remove('is-open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (!noFocus) focusEl(btn);
    }
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); if (open) close(); else show(); });
    var closeBtn = $('[data-search-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { close(); });
    if (input) input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(query, 180); });
    doc.addEventListener('pointerdown', function (e) {
      if (!open) return;
      if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
      close(true);
    });
    return { close: close, isOpen: function () { return open; } };
  })();

  /* ------------------------------------------------------------- Menü */
  var menu = $('[data-menu]'), menuBtn = $('[data-menu-toggle]');
  if (menuBtn && menu) menuBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (Layer.cur && Layer.cur.el === menu) Layer.close(); else Layer.open(menu, menuBtn, $('[data-menu-close]', menu));
  });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); Layer.close(); }); });

  /* -------------------------------------------------------- Warenkorb-Zähler */
  var cartBtn = $('[data-cart-icon]'), badge = $('[data-cart-badge]');
  function setBadge(n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    if (badge) { badge.textContent = n > 99 ? '99+' : String(n); badge.hidden = n === 0; }
    if (cartBtn) cartBtn.setAttribute('aria-label', 'Warenkorb, ' + n + ' Artikel');
  }

  /* ------------------------------------- Fly-to-Cart (S4 · 02, WAAPI) */
  function popCart() {
    if (!cartBtn || reduced() || typeof cartBtn.animate !== 'function') return;
    cartBtn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'cubic-bezier(.34, 1.56, .64, 1)' });
  }
  function flyToCart(from, done) {
    var finished = false;
    function fin() { if (finished) return; finished = true; done(); }
    if (reduced() || !cartBtn || !from || typeof Element.prototype.animate !== 'function') { fin(); return; }
    var a = from.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
    if (!b.width || !a.width) { fin(); return; }
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    var dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
    var outer = doc.createElement('div');   // bewegt X (linear)
    var dot = doc.createElement('span');    // bewegt Y (Bogen) + Größe
    outer.className = 'fly';
    dot.className = 'fly__dot';
    outer.setAttribute('aria-hidden', 'true');
    outer.style.left = x0 + 'px';
    outer.style.top = y0 + 'px';
    outer.appendChild(dot);
    doc.body.appendChild(outer);
    outer.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + dx + 'px)' }], { duration: 800, fill: 'forwards', easing: 'linear' });
    var anim = dot.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(' + dy + 'px) scale(.4)' }], { duration: 800, fill: 'forwards', easing: 'cubic-bezier(.3, 1.4, .55, 1)' });
    function end() { if (outer.parentNode) outer.parentNode.removeChild(outer); fin(); }
    if (anim && anim.finished && anim.finished.then) anim.finished.then(end, end); else if (anim) anim.onfinish = end;
    setTimeout(end, 1300);
  }
  function markAdded(btn) {
    if (!btn) return;
    var label = $('.buy__label', btn);
    if (!label) return;
    clearTimeout(btn._addedT);
    if (!btn.classList.contains('is-added')) btn.style.minWidth = btn.offsetWidth + 'px';
    if (!btn._label) btn._label = label.textContent;
    btn.classList.add('is-added');
    label.textContent = 'Hinzugefügt';
    btn._addedT = setTimeout(function () {
      btn.classList.remove('is-added');
      label.textContent = btn._label;
      btn.style.minWidth = '';
    }, 1500);
  }
  function formError(form, msg) {
    var box = $('[data-form-error]', form);
    if (box) { box.textContent = msg; box.hidden = !msg; }
    if (msg) announce(msg);
  }

  /* ---------------------------------------------- Bundle (Messe-Bundle) */
  function bundleState(form) {
    var box = $('[data-bundle]', form);
    if (!box) return null;
    var selects = $$('[data-bundle-select]', box);
    var sum = 0, chosen = 0, firstEmpty = null;
    selects.forEach(function (s) {
      var o = s.options[s.selectedIndex];
      if (s.value && o) { chosen += 1; sum += parseInt(o.getAttribute('data-price'), 10) || 0; } else if (!firstEmpty) firstEmpty = s;
    });
    return { box: box, selects: selects, sum: sum, chosen: chosen, total: selects.length, firstEmpty: firstEmpty, price: parseInt(box.getAttribute('data-bundle-price'), 10) || 0 };
  }
  function renderBundle(form) {
    var st = bundleState(form);
    if (!st) return;
    var out = $('[data-bundle-summary]', st.box);
    if (!out) return;
    while (out.firstChild) out.removeChild(out.firstChild);
    function add(text, strong, cls) {
      var el = doc.createElement(strong ? 'strong' : 'span');
      if (cls) el.className = cls;
      el.textContent = text;
      out.appendChild(el);
    }
    if (st.chosen < st.total) {
      var left = st.total - st.chosen;
      add('Noch ' + left + (left === 1 ? ' Sorte' : ' Sorten') + ' wählen · Bundle-Preis: ');
      add(euro(st.price), true);
      return;
    }
    add('Einzeln: ');
    add(euro(st.sum), true);
    add(' · Bundle-Preis: ');
    add(euro(st.price), true);
    var save = st.sum - st.price;
    if (save > 0) { add(' · '); add('Sie sparen ' + euro(save) + '.', true, 'save'); }
  }

  /* ------------------------------------------------ In den Warenkorb */
  doc.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('[data-add-form]')) return;
    var st = bundleState(form);
    if (st && st.firstEmpty) {
      e.preventDefault();
      formError(form, 'Bitte wählen Sie für alle ' + st.total + ' Packungen eine Sorte.');
      focusEl(st.firstEmpty);
      return;
    }
    if (!canFetch()) return;
    e.preventDefault();
    var btn = e.submitter || $('[type="submit"]', form);
    if (btn && btn.classList.contains('is-busy')) return;
    if (btn) btn.classList.add('is-busy');
    formError(form, '');
    postForm(form).then(function (r) {
      if (btn) btn.classList.remove('is-busy');
      if (!r.data) { form.submit(); return; }
      if (!r.ok || !r.data.ok) {
        formError(form, r.data.error || r.data.message || 'Das hat leider nicht geklappt. Bitte versuchen Sie es erneut.');
        if (!$('[data-form-error]', form)) announce(r.data.error || r.data.message);
        return;
      }
      flyToCart(btn, function () {
        setBadge(r.data.count);
        popCart();
        markAdded(btn);
        if (btn && btn.hasAttribute('data-buybar-buy')) markAdded($('[data-main-buy]'));
        announce(r.data.message);
      });
    }).catch(function () {
      if (btn) btn.classList.remove('is-busy');
      form.submit();
    });
  });

  /* ------------------------------------------------------- Akkordeons */
  function toggleAcc(head) {
    var box = head.closest('[data-acc]');
    if (!box) return;
    var open = head.getAttribute('aria-expanded') === 'true';
    head.setAttribute('aria-expanded', String(!open));
    box.classList.toggle('is-open', !open);
  }

  /* -------------------------------- Produktkarten: Touch (Punkte / Wischen) */
  function setCardImg(cardEl, showB) {
    cardEl.classList.toggle('show-b', showB);
    $$('.dot', cardEl).forEach(function (d) { d.setAttribute('aria-pressed', String((d.getAttribute('data-dot') === 'b') === showB)); });
  }
  var touch = null;
  doc.addEventListener('touchstart', function (e) {
    var m = e.target.closest ? e.target.closest('.card') : null;
    if (!m || !e.touches || !e.touches[0] || e.target.closest('form,button,.card__buy')) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, card: m };
  }, { passive: true });
  doc.addEventListener('touchend', function (e) {
    if (!touch || !e.changedTouches || !e.changedTouches[0]) { touch = null; return; }
    var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      setCardImg(touch.card, !touch.card.classList.contains('show-b'));
      touch.card._swiped = Date.now();
    }
    touch = null;
  }, { passive: true });

  /* ------------------------------------------------- Produktdetailseite */
  var pdp = $('[data-pdp]');
  function showSlide(key) {
    if (!pdp) return;
    var found = false;
    $$('[data-slide]', pdp).forEach(function (f) {
      var on = f.getAttribute('data-slide') === key;
      if (on) found = true;
      f.classList.toggle('is-active', on);
      if (on) f.removeAttribute('aria-hidden'); else f.setAttribute('aria-hidden', 'true');
    });
    if (!found) return;
    $$('[data-thumb]', pdp).forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-thumb') === key)); });
  }
  function applyVariant(input) {
    if (!input) return;
    var price = input.getAttribute('data-price'), base = input.getAttribute('data-base'), label = input.getAttribute('data-label');
    $$('[data-price]').forEach(function (el) { if (el.tagName !== 'INPUT' && el.tagName !== 'OPTION') el.textContent = price; });
    $$('[data-base-price]').forEach(function (el) { el.textContent = base; });
    $$('[data-choice-label]').forEach(function (el) { el.textContent = label; });
    showSlide(input.getAttribute('data-photo') || 'A');
    $$('[data-allergen-row]').forEach(function (li) { li.classList.toggle('is-current', li.getAttribute('data-allergen-row') === input.value); });
  }
  if (pdp) {
    $$('[data-slide]', pdp).forEach(function (f) { if (!f.classList.contains('is-active')) f.setAttribute('aria-hidden', 'true'); });
    var checked = $('[data-variant]:checked', pdp);
    if (checked) $$('[data-allergen-row]').forEach(function (li) { li.classList.toggle('is-current', li.getAttribute('data-allergen-row') === checked.value); });
    pdp.addEventListener('change', function (e) {
      if (e.target.matches('[data-variant]')) { applyVariant(e.target); announce((e.target.getAttribute('data-label') || '') + ': ' + (e.target.getAttribute('data-price') || '')); }
      if (e.target.matches('[data-bundle-select]')) { var f = e.target.closest('form'); renderBundle(f); formError(f, ''); }
    });
    var addForm = $('#add-form');
    if (addForm && $('[data-bundle]', addForm)) renderBundle(addForm);
  }
  /* Mengen-Stepper (Produktseite) */
  function stepQty(btn) {
    var wrap = btn.closest('[data-stepper]');
    var input = wrap && $('[data-qty]', wrap);
    if (!input) return;
    var v = parseInt(input.value, 10) || 1;
    v = Math.min(99, Math.max(1, v + (parseInt(btn.getAttribute('data-step'), 10) || 0)));
    input.value = v;
    syncStepper(wrap);
  }
  function syncStepper(wrap) {
    var input = $('[data-qty]', wrap);
    if (!input) return;
    var v = parseInt(input.value, 10) || 1;
    var dec = $('[data-step="-1"]', wrap), inc = $('[data-step="1"]', wrap);
    if (dec) dec.disabled = v <= 1;
    if (inc) inc.disabled = v >= 99;
  }
  $$('[data-stepper]').forEach(function (w) {
    syncStepper(w);
    var input = $('[data-qty]', w);
    if (input) input.addEventListener('change', function () {
      var v = parseInt(input.value, 10);
      input.value = Math.min(99, Math.max(1, isNaN(v) ? 1 : v));
      syncStepper(w);
    });
  });

  /* Mobile Kaufleiste */
  var headerEl = $('[data-header]');
  function updateBuybar() {
    var bar = $('[data-buybar]'), btn = $('[data-main-buy]');
    if (!bar || !btn) return;
    var r = btn.getBoundingClientRect();
    var top = headerEl ? Math.max(0, headerEl.getBoundingClientRect().bottom) : 0;
    bar.classList.toggle('is-visible', r.height > 0 && r.bottom < top);
  }
  if ($('[data-buybar]')) {
    if ('IntersectionObserver' in window) {
      var hh = headerEl ? Math.round(headerEl.offsetHeight) : 0;
      var io = new IntersectionObserver(function () { updateBuybar(); }, { rootMargin: '-' + hh + 'px 0px 0px 0px' });
      var mb = $('[data-main-buy]'); if (mb) io.observe(mb);
    }
    (function () {
      var tick = false;
      function onScroll() { if (!tick) { tick = true; window.requestAnimationFrame(function () { tick = false; updateBuybar(); }); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    })();
  }

  /* ------------------------------------- Kategorie: Filter ohne Neuladen */
  var filterForm = $('[data-filter-form]');
  function filterUrl(form) {
    var params = new URLSearchParams();
    new FormData(form).forEach(function (v, k) {
      if (!v) return;
      if (k === 'sortierung' && v === 'empfohlen') return;
      params.append(k, v);
    });
    var qs = params.toString();
    return form.getAttribute('action') + (qs ? '?' + qs : '');
  }
  var filterSeq = 0;
  function applyFilters() {
    if (!filterForm || !canFetch() || !window.DOMParser) { if (filterForm) filterForm.submit(); return; }
    var url = filterUrl(filterForm);
    var results = $('[data-results]');
    var active = doc.activeElement;
    var activeId = active && results && results.contains(active) ? active.id : null;
    var my = ++filterSeq;
    if (results) results.setAttribute('aria-busy', 'true');
    fetch(url, { headers: { 'Accept': 'text/html' }, credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(function (html) {
        if (my !== filterSeq) return;
        var next = new DOMParser().parseFromString(html, 'text/html');
        var newResults = $('[data-results]', next);
        if (results && newResults) {
          results.innerHTML = newResults.innerHTML;
          results.setAttribute('aria-busy', 'false');
        }
        $$('[data-opt-count]', next).forEach(function (n) {
          var cur = $('[data-opt-count="' + n.getAttribute('data-opt-count') + '"]', filterForm);
          if (cur) cur.textContent = n.textContent;
        });
        $$('input', filterForm).forEach(function (inp) {
          if (!inp.id) return;
          var twin = next.getElementById(inp.id);
          if (!twin) return;
          inp.disabled = twin.disabled;
          var lab = inp.closest('.opt');
          if (lab) lab.classList.toggle('is-off', twin.disabled);
        });
        var applyBtn = $('[data-filter-apply]', filterForm), newApply = $('[data-filter-apply]', next);
        if (applyBtn && newApply) applyBtn.textContent = newApply.textContent;
        try { window.history.replaceState(null, '', url); } catch (e) { /* ignorieren */ }
        var count = $('[data-count]');
        if (count) announce(count.textContent);
        if (activeId) focusEl(doc.getElementById(activeId));
        syncFilterOpener();
      })
      .catch(function () { filterForm.submit(); });
  }
  function syncFilterOpener() {
    var openBtn = $('[data-filter-open]');
    if (openBtn && Layer.cur && Layer.cur.el === filterForm) { openBtn.setAttribute('aria-expanded', 'true'); Layer.cur.opener = openBtn; }
  }
  if (filterForm) {
    filterForm.addEventListener('change', function (e) {
      if (e.target.matches('input')) applyFilters();
    });
    filterForm.addEventListener('submit', function (e) { e.preventDefault(); applyFilters(); });
    doc.addEventListener('change', function (e) {
      if (e.target.matches && e.target.matches('[data-sort]')) applyFilters();
    });
    doc.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-filter-reset], .chip') : null;
      if (t && filterForm && (t.hasAttribute('data-filter-reset') || t.closest('[data-chips]'))) {
        e.preventDefault();
        if (t.hasAttribute('data-filter-reset') || t.classList.contains('chip--reset')) {
          $$('input[type="checkbox"]', filterForm).forEach(function (i) { i.checked = false; });
        } else {
          // Chip: Zustand aus dem Link übernehmen
          try {
            var u = new URL(t.getAttribute('href'), window.location.href);
            var sp = u.searchParams;
            $$('input[type="checkbox"]', filterForm).forEach(function (i) { i.checked = sp.getAll(i.name).indexOf(i.value) > -1; });
          } catch (err) { window.location.href = t.getAttribute('href'); return; }
        }
        applyFilters();
        var h1 = $('h1'); if (t.hasAttribute('data-filter-reset') && !Layer.cur) focusEl($('[data-count]') || h1);
      }
      var openBtn = e.target.closest ? e.target.closest('[data-filter-open]') : null;
      if (openBtn) { Layer.open(filterForm, openBtn, $('[data-filter-close]', filterForm)); }
    });
    var fClose = $('[data-filter-close]', filterForm);
    if (fClose) fClose.addEventListener('click', function () { Layer.close(); });
    var fApply = $('[data-filter-apply]', filterForm);
    if (fApply) fApply.addEventListener('click', function () { Layer.close(); var g = $('[data-count]'); if (g) focusEl(g); });
    syncSheets();
    onMQ(mqMobile, function () {
      if (!isMobile() && Layer.cur && Layer.cur.el === filterForm) Layer.close(true);
      syncSheets();
    });
  }

  /* -------------------------------------------- Warenkorb: Menge per Eingabe */
  doc.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('[data-qty-input]')) return;
    var form = input.closest('form');
    if (!form) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
  });

  /* ----------------------------------------------------------- Kasse */
  var checkout = $('[data-checkout]');
  if (checkout) {
    var address = $('[data-address]', checkout);
    var bar = $('#f-payment-bar');
    var syncDelivery = function () {
      var sel = $('[data-delivery]:checked', checkout);
      var pickup = sel && sel.value === 'abholung';
      if (address) address.classList.toggle('is-hidden', pickup);
      if (bar) {
        bar.disabled = !pickup;
        var lab = bar.closest('.choice');
        if (lab) lab.classList.toggle('is-off', !pickup);
        if (!pickup && bar.checked) { var ue = $('#f-payment-ueberweisung'); if (ue) ue.checked = true; }
      }
    };
    checkout.addEventListener('change', function (e) { if (e.target.matches('[data-delivery]')) syncDelivery(); });
    syncDelivery();
  }

  /* -------------------------------------------------------- Feedback */
  var fb = $('[data-feedback-form]');
  if (fb) {
    var bugFields = $('[data-bug-fields]', fb);
    var syncKind = function () {
      var k = $('[data-kind]:checked', fb);
      if (bugFields) bugFields.classList.toggle('is-hidden', !k || k.value !== 'bug');
    };
    var tech = $('#f-tech', fb), screenInput = $('[data-screen]', fb);
    var syncTech = function () {
      if (!screenInput) return;
      if (tech && tech.checked && window.screen) {
        var dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
        screenInput.value = window.screen.width + 'x' + window.screen.height + '@' + dpr;
      } else screenInput.value = '';
    };
    fb.addEventListener('change', function (e) {
      if (e.target.matches('[data-kind]')) syncKind();
      if (e.target === tech) syncTech();
    });
    syncKind();
    syncTech();
  }

  /* ----------------------------------------------------- Code kopieren */
  $$('[data-coupon]').forEach(function (c) {
    var btn = $('[data-copy]', c), input = $('[data-copy-source]', c), label = $('[data-copy-label]', c);
    if (!btn || !input) return;
    btn.hidden = false;
    function done(ok) {
      if (!label) return;
      clearTimeout(btn._t);
      label.textContent = ok ? 'Kopiert' : 'Bitte manuell kopieren';
      btn.classList.toggle('is-copied', ok);
      announce(ok ? 'Code ' + input.value + ' kopiert.' : 'Der Code ist markiert – bitte manuell kopieren.');
      btn._t = setTimeout(function () { label.textContent = 'Code kopieren'; btn.classList.remove('is-copied'); }, 1500);
    }
    function fallback() {
      input.focus();
      input.select();
      try { input.setSelectionRange(0, input.value.length); } catch (e) { /* ignorieren */ }
      var ok = false;
      try { ok = doc.execCommand && doc.execCommand('copy'); } catch (e) { ok = false; }
      done(!!ok);
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(input.value).then(function () { done(true); }, fallback);
      } else fallback();
    });
    input.addEventListener('focus', function () { input.select(); });
  });

  /* ------------------------------------------------------- Newsletter */
  $$('[data-nl-form]').forEach(function (form) {
    var input = $('input[type="email"]', form);
    var msg = form.parentNode ? $('[data-nl-msg]', form.parentNode) : null;
    function say(text, cls) { if (!msg) return; msg.className = 'nl__msg' + (cls ? ' ' + cls : ''); msg.textContent = text; }
    form.addEventListener('submit', function (e) {
      if (!canFetch()) return;
      e.preventDefault();
      var v = (input && input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        if (input) input.setAttribute('aria-invalid', 'true');
        say('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'is-error');
        focusEl(input);
        return;
      }
      if (input) input.removeAttribute('aria-invalid');
      postForm(form).then(function (r) {
        if (r.data && r.ok && r.data.ok) {
          form.hidden = true;
          say(r.data.message, 'is-success');
          focusEl(msg);
        } else {
          say((r.data && (r.data.error || r.data.message)) || 'Das hat leider nicht geklappt. Bitte versuchen Sie es später erneut.', 'is-error');
          if (input) input.setAttribute('aria-invalid', 'true');
        }
      }).catch(function () { form.submit(); });
    });
    if (input) input.addEventListener('input', function () { if (input.getAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); say(''); } });
  });

  /* -------------------------------------------- Vorteils-Bar (mobil) */
  (function initPerks() {
    var list = $('[data-perks]');
    if (!list) return;
    var items = $$('.perk', list), i = 0, timer = null, paused = false, resumeT;
    function tick() {
      if (paused || items.length < 2) return;
      var cur = items[i];
      cur.classList.add('is-leaving');
      cur.classList.remove('is-active');
      setTimeout(function () { cur.classList.remove('is-leaving'); }, 520);
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }
    function start() { clearInterval(timer); timer = null; if (isMobile() && !reduced()) timer = setInterval(tick, 4000); }
    function pause() { paused = true; clearTimeout(resumeT); }
    function resume(delay) { clearTimeout(resumeT); resumeT = setTimeout(function () { paused = false; }, delay || 0); }
    list.addEventListener('mouseenter', pause);
    list.addEventListener('mouseleave', function () { resume(0); });
    list.addEventListener('touchstart', pause, { passive: true });
    list.addEventListener('touchend', function () { resume(4000); }, { passive: true });
    list.addEventListener('focusin', pause);
    list.addEventListener('focusout', function () { resume(0); });
    onMQ(mqMobile, start);
    onMQ(mqReduce, start);
    start();
  })();

  /* ------------------------------------------------ Header-Schatten */
  (function initHeader() {
    if (!headerEl) return;
    var ticking = false;
    function update() { ticking = false; headerEl.classList.toggle('is-scrolled', (window.scrollY || root.scrollTop) > 8); }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* ----------------------------- Scroll-Reveal (nur unterhalb des Folds, einmalig) */
  (function initReveal() {
    if (!('IntersectionObserver' in window) || reduced()) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('is-pre');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    var vh = window.innerHeight || root.clientHeight;
    $$('.reveal').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > vh) { el.classList.add('is-pre'); io.observe(el); }
    });
  })();

  /* ---------------------------------------------- Delegierte Klicks */
  doc.addEventListener('click', function (e) {
    var t = e.target, el;
    if (!t || !t.closest) return;
    if ((el = t.closest('.acc__head'))) { toggleAcc(el); return; }
    if ((el = t.closest('.dot'))) { var cd = el.closest('.card'); if (cd) setCardImg(cd, el.getAttribute('data-dot') === 'b'); return; }
    if ((el = t.closest('[data-thumb]'))) { showSlide(el.getAttribute('data-thumb')); return; }
    if ((el = t.closest('[data-step]'))) { stepQty(el); return; }
    if ((el = t.closest('.card'))) {
      if (el._swiped && Date.now() - el._swiped < 600 && t.closest('a')) { e.preventDefault(); }
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (Search.isOpen()) { Search.close(); return; }
      if (Layer.cur) Layer.close();
      return;
    }
    if (e.key === 'Tab' && Layer.cur) {
      var f = focusables(Layer.cur.el);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = doc.activeElement, inside = Layer.cur.el.contains(a);
      if (e.shiftKey && (a === first || !inside)) { e.preventDefault(); focusEl(last); }
      else if (!e.shiftKey && (a === last || !inside)) { e.preventDefault(); focusEl(first); }
    }
  });

  /* Fehlerübersicht/Erfolgsmeldung nach dem Laden fokussieren */
  var focusTarget = $('[data-focus-on-load]') || $('.error-summary');
  if (focusTarget) setTimeout(function () { focusEl(focusTarget); }, 60);
})();
