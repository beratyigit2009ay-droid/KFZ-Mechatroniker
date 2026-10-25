/* ==========================================================================
   Hasret Nuts – Nuss-Bewegung: Parallaxe der Hero-Nüsse (Progressive Enhancement)
   Die Animation selbst ist reines CSS (nuts.css). Dieses Skript ergänzt nur die
   leichte Parallaxe beim Scrollen und zur Mausposition. Ohne JavaScript oder mit
   reduzierter Bewegung schweben die Nüsse bzw. stehen still – nichts geht verloren.
   Doku: docs/LOGO-UND-INTRO.md
   ========================================================================== */
(function () {
  'use strict';
  var field = document.querySelector('[data-nut-field]');
  if (!field) return;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (reduce) return;

  /* Nach der ersten Einflug-Animation: beim erneuten Öffnen der Startseite ohne Wartezeit */
  window.setTimeout(function () { field.style.setProperty('--nut-delay', '.2s'); }, 3600);

  var ticking = false, py = 0, mx = 0, my = 0;
  function apply() {
    ticking = false;
    field.style.setProperty('--py', py.toFixed(1));
    field.style.setProperty('--mx', mx.toFixed(3));
    field.style.setProperty('--my', my.toFixed(3));
  }
  function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(apply); } }

  /* Abstand der Nuss-Fläche zur Bildschirmmitte: Nüsse wandern beim Scrollen leicht schneller als der Inhalt */
  function onScroll() {
    if (!field.getClientRects().length) return; /* Startseite nicht sichtbar */
    var r = field.getBoundingClientRect();
    var mid = (window.innerHeight || 800) / 2;
    py = Math.max(-300, Math.min(300, mid - (r.top + r.height / 2)));
    request();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  var finePointer = false;
  try { finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  if (finePointer) {
    document.addEventListener('pointermove', function (e) {
      mx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      my = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      request();
    }, { passive: true });
  }
})();
