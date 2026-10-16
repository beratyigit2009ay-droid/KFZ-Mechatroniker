/* Beef Brothers Bad Saulgau – kleines, abhängigkeitsfreies Skript.
   Jede Funktion ist für sich abgesichert: Fällt eine aus, läuft der Rest weiter. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var lite = coarse || (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 760;
  if (lite) root.classList.add('lite');

  function safe(fn) {
    try {
      fn();
    } catch (e) {
      if (window.console) console.warn(e);
    }
  }
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* ── Öffnungszeiten (Europe/Berlin) ── */
  // [Öffnen, Schließen] in Minuten; 0 = Sonntag
  var HOURS = {
    0: null,
    1: [660, 1320],
    2: [660, 1320],
    3: [660, 1320],
    4: [660, 1320],
    5: [660, 1320],
    6: [840, 1320],
  };
  var DAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  function hm(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function berlinNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) {
      map[p.type] = p.value;
    });
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
    return { day: day, min: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10) };
  }
  function openState() {
    var now = berlinNow();
    var today = HOURS[now.day];
    if (today && now.min >= today[0] && now.min < today[1]) {
      return { open: true, text: 'Jetzt geöffnet · bis ' + hm(today[1]) + ' Uhr' };
    }
    if (today && now.min < today[0]) {
      return { open: false, text: 'Öffnet heute um ' + hm(today[0]) + ' Uhr' };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      if (HOURS[d]) {
        return { open: false, text: 'Geschlossen · öffnet ' + (i === 1 ? 'morgen' : DAY_SHORT[d]) + ' ' + hm(HOURS[d][0]) + ' Uhr' };
      }
    }
    return { open: false, text: 'Geschlossen' };
  }
  function renderStatus() {
    var s = openState();
    $$('[data-open-status]').forEach(function (el) {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      var t = $('[data-open-text]', el);
      if (t) t.textContent = s.text;
    });
    var day = berlinNow().day;
    $$('.hours__table tr').forEach(function (tr) {
      tr.classList.toggle('is-today', Number(tr.getAttribute('data-day')) === day);
    });
  }
  safe(function () {
    renderStatus();
    setInterval(renderStatus, 60000);
  });

  /* ── Navigation ── */
  safe(function () {
    var nav = $('[data-nav]');
    var dock = $('.dock');
    var hero = $('[data-hero]');
    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 24);
      if (dock && hero) dock.classList.toggle('is-visible', y > hero.offsetHeight * 0.55);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // aktiven Abschnitt markieren
    var links = $$('.nav__links a');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            links.forEach(function (a) {
              a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
            });
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      links.forEach(function (a) {
        var t = $(a.getAttribute('href'));
        if (t) io.observe(t);
      });
    }
  });

  /* ── Mobiles Menü ── */
  safe(function () {
    var btn = $('[data-menu-toggle]');
    var menu = $('[data-menu]');
    var label = $('.sr-only', btn);
    var close = function () {
      btn.setAttribute('aria-expanded', 'false');
      label.textContent = 'Menü öffnen';
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (!menu.classList.contains('is-open')) menu.hidden = true;
      }, 700);
    };
    var open = function () {
      menu.hidden = false;
      // erst nach dem Einblenden die Klasse setzen, damit die Transition greift
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          menu.classList.add('is-open');
        });
      });
      btn.setAttribute('aria-expanded', 'true');
      label.textContent = 'Menü schließen';
      document.body.style.overflow = 'hidden';
    };
    btn.addEventListener('click', function () {
      btn.getAttribute('aria-expanded') === 'true' ? close() : open();
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        close();
        btn.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1000 && btn.getAttribute('aria-expanded') === 'true') close();
    });
  });

  /* ── Einblenden beim Scrollen ── */
  safe(function () {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    items.forEach(function (el) {
      io.observe(el);
    });

    var rating = $('.rating');
    if (rating) {
      var ro = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            rating.classList.add('is-in');
            ro.disconnect();
          }
        },
        { threshold: 0.4 }
      );
      ro.observe(rating);
    }
  });

  /* ── Speisekarte: Tabs ── */
  safe(function () {
    var tabs = $('[data-tabs]');
    if (!tabs) return;
    var buttons = $$('[role="tab"]', tabs);
    var ink = $('.tabs__ink', tabs);
    var moveInk = function (btn) {
      ink.style.width = btn.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
    };
    var select = function (btn, focus) {
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      });
      moveInk(btn);
      if (focus) btn.focus();
      if (btn.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) {
        tabs.scrollTo({ left: btn.offsetLeft - 16, behavior: 'smooth' });
      }
    };
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () {
        select(b);
      });
      b.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = buttons[(i + 1) % buttons.length];
        if (e.key === 'ArrowLeft') n = buttons[(i - 1 + buttons.length) % buttons.length];
        if (e.key === 'Home') n = buttons[0];
        if (e.key === 'End') n = buttons[buttons.length - 1];
        if (n) {
          e.preventDefault();
          select(n, true);
        }
      });
    });
    tabs.classList.add('is-ready');
    select(buttons[0]);
    window.addEventListener('resize', function () {
      var cur = $('[aria-selected="true"]', tabs);
      if (cur) moveInk(cur);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var cur = $('[aria-selected="true"]', tabs);
        if (cur) moveInk(cur);
      });
    }
    // Links, die direkt eine Kategorie öffnen
    $$('[data-open-tab]').forEach(function (a) {
      a.addEventListener('click', function () {
        var b = document.getElementById(a.getAttribute('data-open-tab'));
        if (b) select(b);
      });
    });
  });

  /* ── Licht folgt dem Mauszeiger ── */
  safe(function () {
    if (coarse) return;
    document.addEventListener(
      'pointermove',
      function (e) {
        var card = e.target.closest && e.target.closest('[data-spot]');
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - r.left + 'px');
        card.style.setProperty('--my', e.clientY - r.top + 'px');
      },
      { passive: true }
    );
  });

  /* ── Dezente Parallaxe ── */
  safe(function () {
    if (reduceMotion) return;
    var els = $$('[data-parallax]');
    if (!els.length) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
    };
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  });

  /* ── Glühende Funken im Hero (Canvas) ── */
  safe(function () {
    var canvas = $('[data-embers]');
    var hero = $('[data-hero]');
    if (!canvas || !canvas.getContext || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0;
    var H = 0;
    var COUNT = lite ? 26 : 64;
    var parts = [];
    var running = false;
    var visible = true;
    var last = 0;

    var resize = function () {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    // Funken entstehen vor allem rund um das Emblem
    var originX = function () {
      var wide = W >= 1000;
      var cx = wide ? W * 0.74 : W * 0.5;
      var spread = wide ? W * 0.22 : W * 0.42;
      return cx + (Math.random() - 0.5) * spread * 2;
    };
    var spawn = function (p, initial) {
      p.x = originX();
      p.y = initial ? Math.random() * H : H * (0.62 + Math.random() * 0.4);
      p.vy = 18 + Math.random() * 42; // px/s nach oben
      p.vx = (Math.random() - 0.5) * 10;
      p.r = 0.6 + Math.random() * 1.8;
      p.life = 0;
      p.max = 3 + Math.random() * 5;
      p.phase = Math.random() * Math.PI * 2;
      p.hue = 18 + Math.random() * 22;
      return p;
    };
    for (var i = 0; i < COUNT; i++) parts.push(spawn({}, true));

    var frame = function (t) {
      if (!running) return;
      var dt = Math.min((t - (last || t)) / 1000, 0.05);
      last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.life += dt;
        if (p.life > p.max || p.y < -10) spawn(p, false);
        p.y -= p.vy * dt;
        p.x += (p.vx + Math.sin(p.life * 1.6 + p.phase) * 12) * dt;
        var k = p.life / p.max;
        var alpha = Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.sin(p.life * 9 + p.phase));
        if (alpha <= 0) continue;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'hsla(' + (p.hue + 15) + ',100%,78%,' + alpha + ')');
        g.addColorStop(0.35, 'hsla(' + p.hue + ',100%,55%,' + alpha * 0.55 + ')');
        g.addColorStop(1, 'hsla(' + p.hue + ',100%,50%,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    var start = function () {
      if (running || !visible || document.hidden) return;
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    };
    var stop = function () {
      running = false;
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        hero.classList.toggle('is-off', !visible);
        visible ? start() : stop();
      }).observe(hero);
    }
    start();
  });

  /* ── Google Maps erst nach Klick (DSGVO) ── */
  safe(function () {
    var btn = $('[data-map-load]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var box = $('[data-map]');
      var f = document.createElement('iframe');
      f.src = 'https://www.google.com/maps?q=Martin-Staud-Stra%C3%9Fe+10,+88348+Bad+Saulgau&output=embed';
      f.title = 'Karte: Beef Brothers, Martin-Staud-Straße 10, Bad Saulgau';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = '';
      box.appendChild(f);
    });
  });

  /* ── Impressum / Datenschutz ── */
  safe(function () {
    $$('[data-dialog-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = document.getElementById(b.getAttribute('data-dialog-open'));
        if (d && d.showModal) d.showModal();
      });
    });
    $$('dialog.sheet').forEach(function (d) {
      d.addEventListener('click', function (e) {
        if (e.target === d) d.close();
      });
    });
  });

  safe(function () {
    var y = $('[data-year]');
    if (y) y.textContent = String(new Date().getFullYear());
  });

  // Start: Headline einblenden
  window.__bbReady = true;
  root.classList.remove('reveal-all');
  requestAnimationFrame(function () {
    root.classList.add('is-loaded');
  });
})();
