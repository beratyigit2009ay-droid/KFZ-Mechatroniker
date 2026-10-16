/**
 * Erzeugt die Illustrationen der Website als SVG-Dateien in public/images/.
 * Stil: goldene Linien auf Anthrazit, angelehnt an technische Zeichnungen.
 *
 *   node scripts/illustrations.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/images')

const C = {
  bgTop: '#1b1d21',
  bgBottom: '#0b0c0e',
  line: '#c49e56',
  lineLight: '#e5cc96',
  lineDark: '#8a6a2c',
  warm: '#ffd38a',
  paper: '#efe7d7',
  ink: '#0f1113',
}

const FONT = `font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"`

// ---------- gemeinsame Bausteine ----------

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBottom}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f3e6c6"/>
      <stop offset=".45" stop-color="#d5b475"/>
      <stop offset="1" stop-color="#8a6a2c"/>
    </linearGradient>
    <linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3e6c6"/>
      <stop offset=".5" stop-color="#c9a35c"/>
      <stop offset="1" stop-color="#7d5f27"/>
    </linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#25282d"/>
      <stop offset=".6" stop-color="#191b1f"/>
      <stop offset="1" stop-color="#121417"/>
    </linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#131518"/>
      <stop offset=".5" stop-color="#1a1d21"/>
      <stop offset="1" stop-color="#121417"/>
    </linearGradient>
    <linearGradient id="warmV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe2ad"/>
      <stop offset=".55" stop-color="#e9b766"/>
      <stop offset="1" stop-color="#a8762e"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.warm}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${C.warm}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#f0c47a" stop-opacity=".42"/>
      <stop offset=".45" stop-color="#d9a85a" stop-opacity=".12"/>
      <stop offset="1" stop-color="#d9a85a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx=".5" cy=".45" r=".75">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${C.line}" stroke-opacity=".065"/>
    </pattern>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000" flood-opacity=".55"/>
    </filter>
  </defs>`

function svg(w, h, body, { grid = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${grid ? `<rect width="${w}" height="${h}" fill="url(#grid)"/>` : ''}
  ${body}
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
</svg>
`
}

/** Schlüssel, Reide im Ursprung, Bart nach rechts. */
function key({ x, y, r = 0, s = 1, fill = 'url(#gold)' }) {
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" filter="url(#shadow)">
    <path fill-rule="evenodd" fill="${fill}" d="M-28 0a28 28 0 1 0 56 0a28 28 0 1 0-56 0ZM-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0Z"/>
    <rect x="24" y="-11" width="12" height="22" rx="3" fill="${fill}"/>
    <path fill="${fill}" d="M34-6H150l6 6-6 6H140v9h-7v-6h-8v11h-8v-11h-9v8h-8v-8H95v6h-8v-6H34Z"/>
    <path d="M42 0H140" stroke="#000" stroke-opacity=".28" stroke-width="2"/>
    <circle r="13.5" fill="none" stroke="#000" stroke-opacity=".18"/>
  </g>`
}

/** Profilzylinder in Frontansicht (Euro-Profil). */
function cylinderFront({ x, y, s = 1, stroke = C.line, fill = 'url(#gold)' }) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-10 13.75A17 17 0 1 1 10 13.75V49Q10 53 6 53H-6Q-10 53-10 49Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
    <circle r="11.5" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>
    <path d="M0-8V9" stroke="#1a1408" stroke-width="2.6" stroke-linecap="round"/>
  </g>`
}

function label({ x, y, text, anchor = 'start', size = 13, color = C.lineLight, opacity = 0.85 }) {
  return `<text x="${x}" y="${y}" ${FONT} font-size="${size}" letter-spacing="${size * 0.28}" fill="${color}" fill-opacity="${opacity}" text-anchor="${anchor}">${text}</text>`
}

/** Hinweislinie mit Punkt und Beschriftung. */
function callout({ from, to, text, anchor = 'start', dx = 10 }) {
  const [x1, y1] = from
  const [x2, y2] = to
  return `<g>
    <circle cx="${x1}" cy="${y1}" r="4" fill="none" stroke="${C.lineLight}" stroke-width="1.4"/>
    <circle cx="${x1}" cy="${y1}" r="1.6" fill="${C.lineLight}"/>
    <path d="M${x1} ${y1}L${x2} ${y2}H${anchor === 'start' ? x2 + 26 : x2 - 26}" fill="none" stroke="${C.line}" stroke-opacity=".7"/>
    ${label({ x: anchor === 'start' ? x2 + 26 + dx : x2 - 26 - dx, y: y2 + 4.5, text, anchor, size: 12 })}
  </g>`
}

/** Maßlinie mit Endstrichen. */
function dimension({ x1, y1, x2, y2, text, vertical = false }) {
  const t = vertical
    ? `<text transform="translate(${x1 - 12} ${(y1 + y2) / 2}) rotate(-90)" ${FONT} font-size="11" letter-spacing="3" fill="${C.line}" fill-opacity=".75" text-anchor="middle">${text}</text>`
    : `<text x="${(x1 + x2) / 2}" y="${y1 - 10}" ${FONT} font-size="11" letter-spacing="3" fill="${C.line}" fill-opacity=".75" text-anchor="middle">${text}</text>`
  const ticks = vertical
    ? `<path d="M${x1 - 7} ${y1}h14M${x1 - 7} ${y2}h14"/>`
    : `<path d="M${x1} ${y1 - 7}v14M${x2} ${y2 - 7}v14"/>`
  return `<g stroke="${C.line}" stroke-opacity=".55" fill="none">
    <path d="M${x1} ${y1}L${x2} ${y2}"/>${ticks}
  </g>${t}`
}

// ---------- Szenen ----------

const scenes = {}

/* Hero: moderne Haustür bei Nacht, Werkzeugkoffer des Monteurs davor */
scenes.hero = svg(
  800,
  1000,
  `
  <rect x="0" y="0" width="800" height="880" fill="url(#wall)" opacity=".85"/>
  <g stroke="#ffffff" stroke-opacity=".035">
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${40 + i * 66} 0V880"/>`).join('')}
  </g>
  <ellipse cx="400" cy="520" rx="330" ry="420" fill="url(#glow)" opacity=".55"/>

  <!-- Wandleuchte mit Lichtkegel -->
  <path d="M642 312L560 880H780L700 312Z" fill="url(#beam)" opacity=".75"/>
  <rect x="654" y="262" width="44" height="54" rx="4" fill="#24272c" stroke="${C.line}" stroke-opacity=".7"/>
  <rect x="660" y="310" width="32" height="5" rx="2" fill="#ffe3b0"/>
  <ellipse cx="676" cy="318" rx="40" ry="12" fill="#ffd38a" opacity=".35" filter="url(#blur)"/>

  <!-- Türrahmen und Seitenteil -->
  <rect x="168" y="156" width="452" height="726" fill="#0d0e10"/>
  <rect x="168" y="156" width="452" height="726" fill="none" stroke="url(#goldV)" stroke-width="3"/>
  <rect x="190" y="178" width="96" height="704" fill="url(#warmV)" opacity=".92"/>
  <rect x="190" y="178" width="96" height="704" fill="none" stroke="${C.lineDark}" stroke-width="2"/>
  <g stroke="#7a5420" stroke-opacity=".45">
    ${Array.from({ length: 22 }, (_, i) => `<path d="M190 ${206 + i * 31}H286"/>`).join('')}
  </g>
  <rect x="190" y="178" width="96" height="704" fill="#ffefcf" opacity=".18"/>

  <!-- Türblatt -->
  <rect x="300" y="178" width="300" height="704" fill="url(#leaf)"/>
  <g stroke="${C.line}" stroke-opacity=".18">
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${330 + i * 40} 210V850"/>`).join('')}
  </g>
  <rect x="300" y="178" width="300" height="704" fill="none" stroke="${C.line}" stroke-opacity=".55" stroke-width="1.5"/>
  <rect x="300" y="520" width="300" height="2" fill="${C.line}" opacity=".35"/>

  <!-- Stoßgriff -->
  <rect x="548" y="380" width="12" height="300" rx="6" fill="url(#gold)" filter="url(#shadow)"/>
  <rect x="534" y="410" width="18" height="8" rx="3" fill="url(#gold)"/>
  <rect x="534" y="642" width="18" height="8" rx="3" fill="url(#gold)"/>

  <!-- Schutzbeschlag mit Zylinder und Schlüssel -->
  <rect x="528" y="706" width="44" height="86" rx="10" fill="#202328" stroke="url(#gold)" stroke-width="2"/>
  ${cylinderFront({ x: 550, y: 736, s: 0.62 })}
  ${key({ x: 550, y: 805, r: -90, s: 0.42 })}

  <!-- Boden, Fußabstreifer, Werkzeugkoffer -->
  <rect x="0" y="880" width="800" height="120" fill="#0b0c0e"/>
  <path d="M0 880H800" stroke="url(#gold)" stroke-width="2"/>
  <rect x="300" y="884" width="300" height="12" fill="${C.line}" opacity=".12"/>
  <path d="M220 884L150 1000H650L580 884Z" fill="#ffd38a" opacity=".07"/>
  <g filter="url(#shadow)">
    <rect x="626" y="790" width="124" height="90" rx="10" fill="#1d2024" stroke="url(#gold)" stroke-width="2"/>
    <path d="M664 790v-16a8 8 0 0 1 8-8h12a8 8 0 0 1 8 8v16" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"/>
    <rect x="626" y="822" width="124" height="6" fill="${C.line}" opacity=".5"/>
    <rect x="678" y="816" width="20" height="18" rx="3" fill="url(#gold)"/>
  </g>

  <!-- Bemaßung und Beschriftung -->
  ${dimension({ x1: 128, y1: 178, x2: 128, y2: 882, text: '2 100', vertical: true })}
  ${callout({ from: [550, 736], to: [470, 610], text: 'PROFILZYLINDER', anchor: 'end' })}
  ${callout({ from: [548, 440], to: [500, 440], text: 'STOSSGRIFF', anchor: 'end' })}
  `,
)

/* Türöffnung: Tür einen Spalt geöffnet, warmes Licht fällt heraus */
scenes.tueroeffnung = svg(
  800,
  600,
  `
  <rect width="800" height="500" fill="url(#wall)" opacity=".9"/>
  <ellipse cx="460" cy="300" rx="320" ry="260" fill="url(#glow)" opacity=".8"/>
  <!-- Rahmen -->
  <rect x="290" y="70" width="250" height="430" fill="#ffd9a0"/>
  <rect x="290" y="70" width="250" height="430" fill="url(#warmV)" opacity=".75"/>
  <rect x="284" y="64" width="262" height="436" fill="none" stroke="url(#goldV)" stroke-width="4"/>
  <!-- Türblatt nach innen geöffnet -->
  <path d="M290 70L452 98V472L290 500Z" fill="url(#leaf)" stroke="${C.line}" stroke-opacity=".6" stroke-width="1.5"/>
  <g stroke="${C.line}" stroke-opacity=".16">
    <path d="M330 84V486M370 90V480M410 96V476"/>
  </g>
  <rect x="428" y="270" width="7" height="46" rx="3.5" fill="url(#gold)"/>
  <path d="M452 98L540 70V500L452 472Z" fill="#fff1d6" opacity=".35"/>
  <!-- Lichtfall auf dem Boden -->
  <path d="M452 500L540 500L800 600H230Z" fill="url(#beam)" opacity=".95"/>
  <rect y="500" width="800" height="100" fill="#0b0c0e" opacity=".55"/>
  <path d="M452 500L540 500L800 600H230Z" fill="#ffd38a" opacity=".16"/>
  <path d="M0 500H800" stroke="url(#gold)" stroke-width="2"/>
  <!-- Schlüssel im Vordergrund -->
  ${key({ x: 132, y: 470, r: -18, s: 0.9 })}
  ${label({ x: 60, y: 70, text: 'TÜRÖFFNUNG', size: 12 })}
  `,
)

/* Schlosswechsel: technische Zeichnung eines Profilzylinders */
scenes.schlosswechsel = svg(
  800,
  600,
  `
  <ellipse cx="420" cy="290" rx="360" ry="230" fill="url(#glow)" opacity=".45"/>
  <!-- Seitenansicht -->
  <g transform="translate(150 196)" filter="url(#shadow)">
    <path d="M0 18Q0 0 18 0H442Q460 0 460 18V70H260V116Q260 124 252 124H208Q200 124 200 116V70H0Z" fill="url(#gold)"/>
    <path d="M0 70H200M260 70H460" stroke="#000" stroke-opacity=".22" stroke-width="2"/>
    <path d="M206 70Q230 154 254 70" fill="#a8833e" stroke="#000" stroke-opacity=".25"/>
    <rect x="0" y="70" width="200" height="50" fill="url(#gold)" opacity=".85"/>
    <rect x="260" y="70" width="200" height="50" fill="url(#gold)" opacity=".85"/>
    <circle cx="230" cy="104" r="9" fill="#1a1408" opacity=".8"/>
    ${Array.from({ length: 5 }, (_, i) => `<circle cx="${40 + i * 30}" cy="35" r="5" fill="#000" opacity=".22"/>`).join('')}
    ${Array.from({ length: 5 }, (_, i) => `<circle cx="${300 + i * 30}" cy="35" r="5" fill="#000" opacity=".22"/>`).join('')}
  </g>
  <!-- Schlüssel tritt von links ein -->
  ${key({ x: 64, y: 232, s: 0.62 })}
  <!-- Frontansicht -->
  ${cylinderFront({ x: 690, y: 452, s: 1.55 })}
  ${label({ x: 690, y: 560, text: 'FRONTANSICHT', anchor: 'middle', size: 10 })}
  <!-- Bemaßung -->
  ${dimension({ x1: 150, y1: 160, x2: 380, y2: 160, text: 'A' })}
  ${dimension({ x1: 380, y1: 160, x2: 610, y2: 160, text: 'B' })}
  ${callout({ from: [380, 316], to: [300, 400], text: 'SCHLIESSBART', anchor: 'end' })}
  ${callout({ from: [380, 300], to: [470, 400], text: 'STULPSCHRAUBE' })}
  <!-- Schriftfeld -->
  <g transform="translate(48 470)">
    <rect width="250" height="82" fill="none" stroke="${C.line}" stroke-opacity=".5"/>
    <path d="M0 40H250M150 40V82" stroke="${C.line}" stroke-opacity=".5"/>
    ${label({ x: 16, y: 26, text: 'PROFILZYLINDER', size: 12 })}
    ${label({ x: 16, y: 66, text: 'DIN 18252', size: 10, opacity: 0.65 })}
    ${label({ x: 166, y: 66, text: 'BLATT 1', size: 10, opacity: 0.65 })}
  </g>
  `,
)

/* Einbruchschutz: Tür mit Querriegel und Schutzschild */
scenes.einbruchschutz = svg(
  800,
  600,
  `
  <rect width="800" height="520" fill="url(#wall)" opacity=".9"/>
  <path d="M400 70l170 70v130c0 120-74 200-170 240-96-40-170-120-170-240V140Z" fill="none" stroke="${C.line}" stroke-opacity=".14" stroke-width="2"/>
  <ellipse cx="400" cy="300" rx="300" ry="240" fill="url(#glow)" opacity=".5"/>
  <!-- Tür -->
  <rect x="262" y="86" width="276" height="434" fill="#0d0e10" stroke="url(#goldV)" stroke-width="3"/>
  <rect x="278" y="102" width="244" height="418" fill="url(#leaf)"/>
  <g stroke="${C.line}" stroke-opacity=".14">
    <rect x="300" y="126" width="200" height="140" fill="none"/>
    <rect x="300" y="344" width="200" height="150" fill="none"/>
  </g>
  <!-- Querriegel -->
  <g filter="url(#shadow)">
    <rect x="200" y="290" width="400" height="30" rx="6" fill="url(#gold)"/>
    <rect x="186" y="280" width="28" height="50" rx="5" fill="#2a2d32" stroke="url(#gold)" stroke-width="2"/>
    <rect x="586" y="280" width="28" height="50" rx="5" fill="#2a2d32" stroke="url(#gold)" stroke-width="2"/>
    <rect x="370" y="270" width="60" height="70" rx="10" fill="#202328" stroke="url(#gold)" stroke-width="2"/>
  </g>
  ${cylinderFront({ x: 400, y: 296, s: 0.62 })}
  <!-- Schloss und Schutzbeschlag -->
  <rect x="494" y="392" width="20" height="64" rx="8" fill="#202328" stroke="url(#gold)" stroke-width="1.5"/>
  <rect x="480" y="398" width="40" height="8" rx="4" fill="url(#gold)"/>
  <path d="M0 520H800" stroke="url(#gold)" stroke-width="2"/>
  <rect y="520" width="800" height="80" fill="#0b0c0e"/>
  ${callout({ from: [200, 305], to: [80, 200], text: 'QUERRIEGEL' })}
  ${callout({ from: [504, 424], to: [575, 470], text: 'SCHUTZBESCHLAG' })}
  `,
)

/* Sicherheitstechnik: Schutzbeschlag und elektronisches Codeschloss */
scenes.sicherheitstechnik = svg(
  800,
  600,
  `
  <rect width="800" height="600" fill="url(#leaf)" opacity=".6"/>
  <g stroke="${C.line}" stroke-opacity=".08">
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${30 + i * 58} 0V600"/>`).join('')}
  </g>
  <ellipse cx="400" cy="300" rx="340" ry="260" fill="url(#glow)" opacity=".55"/>
  <!-- Schutzbeschlag -->
  <g filter="url(#shadow)">
    <rect x="200" y="96" width="92" height="410" rx="46" fill="#202328" stroke="url(#gold)" stroke-width="3"/>
    <circle cx="246" cy="196" r="26" fill="url(#gold)"/>
    <path d="M246 184H392q14 0 14 12v0q0 12-14 12H246Z" fill="url(#gold)"/>
    <circle cx="246" cy="196" r="10" fill="#000" opacity=".2"/>
    <circle cx="246" cy="398" r="34" fill="#16181b" stroke="url(#gold)" stroke-width="2.5"/>
  </g>
  ${cylinderFront({ x: 246, y: 384, s: 0.8 })}
  <!-- Codeschloss -->
  <g filter="url(#shadow)">
    <rect x="500" y="130" width="156" height="300" rx="20" fill="#16181b" stroke="url(#gold)" stroke-width="2.5"/>
    <rect x="522" y="152" width="112" height="34" rx="6" fill="#0b0c0e" stroke="${C.line}" stroke-opacity=".4"/>
    <circle cx="534" cy="169" r="4" fill="#ffd38a"/>
    ${label({ x: 548, y: 174, text: '• • • •', size: 13, opacity: 0.9 })}
    ${Array.from({ length: 12 }, (_, i) => {
      const cx = 540 + (i % 3) * 38
      const cy = 222 + Math.floor(i / 3) * 46
      return `<circle cx="${cx}" cy="${cy}" r="15" fill="#202328" stroke="${C.line}" stroke-opacity=".6"/>`
    }).join('')}
    ${Array.from({ length: 12 }, (_, i) => {
      const cx = 540 + (i % 3) * 38
      const cy = 227 + Math.floor(i / 3) * 46
      const t = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][i]
      return `<text x="${cx}" y="${cy}" ${FONT} font-size="13" fill="${C.lineLight}" text-anchor="middle">${t}</text>`
    }).join('')}
  </g>
  <ellipse cx="578" cy="452" rx="70" ry="10" fill="#ffd38a" opacity=".12" filter="url(#blur)"/>
  ${callout({ from: [246, 398], to: [150, 520], text: 'ZIEHSCHUTZ' })}
  ${callout({ from: [650, 140], to: [700, 80], text: 'CODESCHLOSS', anchor: 'end' })}
  `,
)

/* Autoöffnung: Fahrzeug in Linienzeichnung, Funkschlüssel im Vordergrund */
scenes.autooeffnung = svg(
  800,
  600,
  `
  <ellipse cx="400" cy="320" rx="360" ry="220" fill="url(#glow)" opacity=".5"/>
  <path d="M0 440H800" stroke="url(#gold)" stroke-width="2"/>
  <rect y="440" width="800" height="160" fill="#0b0c0e" opacity=".7"/>
  <ellipse cx="400" cy="446" rx="300" ry="14" fill="#000" opacity=".6" filter="url(#blur)"/>
  <!-- Karosserie -->
  <g fill="none" stroke="url(#gold)" stroke-width="3" stroke-linejoin="round">
    <path d="M96 420V378Q98 352 128 346L262 326Q306 318 340 296L404 258Q432 242 470 242H560Q602 244 630 268L672 304Q706 312 712 342L716 420Z" fill="#17191c"/>
    <path d="M356 300L414 266Q434 256 462 256H548Q580 258 600 278L624 302Z" fill="#23262b" stroke-width="2"/>
    <path d="M486 256V302M350 304V418M488 304V418" stroke-width="2"/>
    <path d="M404 338h26M540 338h26" stroke-width="3" stroke-linecap="round"/>
    <path d="M104 372h44M680 344h26" stroke-width="4" stroke-linecap="round"/>
  </g>
  <!-- Radläufe -->
  <circle cx="226" cy="420" r="62" fill="#111315"/>
  <circle cx="586" cy="420" r="62" fill="#111315"/>
  <path d="M164 420A62 62 0 0 1 288 420M524 420A62 62 0 0 1 648 420" fill="none" stroke="url(#gold)" stroke-width="3"/>
  ${[226, 586]
    .map(
      (cx) => `<circle cx="${cx}" cy="420" r="48" fill="#0b0c0e" stroke="${C.line}" stroke-width="2"/>
  <circle cx="${cx}" cy="420" r="30" fill="none" stroke="${C.line}" stroke-opacity=".7"/>
  ${Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 * Math.PI) / 180
    return `<path d="M${cx} 420L${(cx + Math.cos(a) * 30).toFixed(1)} ${(420 + Math.sin(a) * 30).toFixed(1)}" stroke="${C.line}" stroke-opacity=".7"/>`
  }).join('')}
  <circle cx="${cx}" cy="420" r="6" fill="url(#gold)"/>`,
    )
    .join('')}
  <!-- Funkschlüssel -->
  <g transform="translate(640 120) rotate(18)" filter="url(#shadow)">
    <rect x="-34" y="-62" width="68" height="124" rx="30" fill="#1d2024" stroke="url(#gold)" stroke-width="2.5"/>
    <circle cx="0" cy="-26" r="13" fill="none" stroke="${C.line}"/>
    <circle cx="0" cy="12" r="13" fill="none" stroke="${C.line}"/>
    <rect x="-5" y="-31" width="10" height="9" rx="2" fill="${C.lineLight}"/>
    <path d="M-3.5-31v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="${C.lineLight}" stroke-width="1.6"/>
    <rect x="-5" y="8" width="10" height="9" rx="2" fill="none" stroke="${C.lineLight}" stroke-width="1.4"/>
    <circle cx="0" cy="44" r="5" fill="none" stroke="${C.line}" stroke-opacity=".6"/>
  </g>
  <g fill="none" stroke="${C.lineLight}" stroke-linecap="round">
    <path d="M574 160a40 40 0 0 0-10 34" stroke-opacity=".8" stroke-width="2"/>
    <path d="M552 146a64 64 0 0 0-16 56" stroke-opacity=".5" stroke-width="2"/>
    <path d="M530 132a88 88 0 0 0-22 78" stroke-opacity=".28" stroke-width="2"/>
  </g>
  `,
)

/* Beratung: Arbeitsplatz von oben – Notizblock mit Checkliste, Zylinder, Schlüssel */
scenes.beratung = svg(
  800,
  600,
  `
  <ellipse cx="380" cy="300" rx="380" ry="280" fill="url(#glow)" opacity=".5"/>
  <g transform="rotate(-6 330 300)" filter="url(#shadow)">
    <rect x="170" y="90" width="320" height="420" rx="10" fill="${C.paper}"/>
    <rect x="170" y="90" width="320" height="46" rx="10" fill="#22252a"/>
    <rect x="170" y="120" width="320" height="16" fill="#22252a"/>
    ${Array.from({ length: 7 }, (_, i) => `<circle cx="${205 + i * 42}" cy="112" r="5" fill="${C.paper}" opacity=".85"/>`).join('')}
    <text x="200" y="184" ${FONT} font-size="15" letter-spacing="4" fill="#5b574f">SICHERHEITS-CHECK</text>
    <path d="M200 198H460" stroke="#c49e56" stroke-width="2"/>
    ${['Tür & Rahmen', 'Schloss & Zylinder', 'Schutzbeschlag', 'Zusatzsicherung', 'Kosten besprochen']
      .map((t, i) => {
        const y = 244 + i * 50
        const done = i < 4
        return `<rect x="200" y="${y - 16}" width="22" height="22" rx="4" fill="none" stroke="#8a6a2c" stroke-width="2"/>
      ${done ? `<path d="M204 ${y - 5}l6 6 11-13" fill="none" stroke="#8a6a2c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      <text x="238" y="${y + 1}" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#23252a">${t.replace('&', '&amp;')}</text>`
      })
      .join('')}
  </g>
  <!-- Stift -->
  <g transform="translate(540 120) rotate(62)" filter="url(#shadow)">
    <rect x="0" y="-7" width="230" height="14" rx="7" fill="#23262b" stroke="url(#gold)" stroke-width="1.5"/>
    <rect x="160" y="-7" width="10" height="14" fill="url(#gold)"/>
    <path d="M230-7l26 7-26 7Z" fill="url(#gold)"/>
  </g>
  <!-- Zylinder und Schlüssel -->
  <g transform="translate(600 404) rotate(-14)" filter="url(#shadow)">
    <rect x="-80" y="-24" width="160" height="34" rx="10" fill="url(#gold)"/>
    <rect x="-80" y="10" width="68" height="22" fill="url(#gold)" opacity=".85"/>
    <rect x="12" y="10" width="68" height="22" fill="url(#gold)" opacity=".85"/>
    <path d="M-12 10q12 44 24 0" fill="#a8833e"/>
    <circle cx="0" cy="22" r="4" fill="#1a1408" opacity=".7"/>
  </g>
  ${key({ x: 590, y: 520, r: -160, s: 0.7 })}
  ${key({ x: 676, y: 268, r: 120, s: 0.55 })}
  `,
  { grid: false },
)

/* Schlüssel-Textur für dunkle Hintergründe */
scenes.keys = svg(
  1600,
  900,
  `
  ${key({ x: 180, y: 220, r: 24, s: 1.6 })}
  ${key({ x: 620, y: 640, r: -32, s: 1.9 })}
  ${key({ x: 1040, y: 180, r: 160, s: 1.4 })}
  ${key({ x: 1360, y: 620, r: -110, s: 1.7 })}
  ${cylinderFront({ x: 860, y: 420, s: 2.4 })}
  ${cylinderFront({ x: 360, y: 700, s: 1.6 })}
  `,
  { grid: true },
)

/* Hauseingang bei Nacht mit Vordach und Downlights */
scenes.entranceNight = svg(
  800,
  1000,
  `
  <rect width="800" height="1000" fill="url(#wall)" opacity=".8"/>
  <!-- Vordach -->
  <rect x="60" y="250" width="680" height="34" fill="#202328" stroke="url(#gold)" stroke-width="2"/>
  ${[200, 400, 600]
    .map(
      (x) => `<path d="M${x - 12} 284L${x - 110} 820H${x + 110}L${x + 12} 284Z" fill="url(#beam)" opacity=".6"/>
  <ellipse cx="${x}" cy="286" rx="14" ry="4" fill="#ffe8c0"/>
  <ellipse cx="${x}" cy="292" rx="40" ry="10" fill="#ffd38a" opacity=".35" filter="url(#blur)"/>`,
    )
    .join('')}
  <!-- Fassade mit Fugen -->
  <g stroke="#ffffff" stroke-opacity=".04">
    ${Array.from({ length: 10 }, (_, i) => `<path d="M0 ${320 + i * 52}H800"/>`).join('')}
  </g>
  <!-- Tür mit Glasseitenteil -->
  <rect x="270" y="330" width="260" height="490" fill="#0d0e10" stroke="url(#goldV)" stroke-width="3"/>
  <rect x="286" y="346" width="62" height="474" fill="url(#warmV)" opacity=".9"/>
  <rect x="360" y="346" width="154" height="474" fill="url(#leaf)" stroke="${C.line}" stroke-opacity=".5"/>
  <g stroke="${C.line}" stroke-opacity=".16">
    <path d="M390 370V800M420 370V800M450 370V800M480 370V800"/>
  </g>
  <rect x="490" y="500" width="8" height="180" rx="4" fill="url(#gold)"/>
  <!-- Hausnummer -->
  <rect x="580" y="420" width="56" height="56" rx="6" fill="none" stroke="url(#gold)" stroke-width="2"/>
  <text x="608" y="460" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="${C.lineLight}" text-anchor="middle">1</text>
  <!-- Stufen -->
  <path d="M230 820H570V850H230Z" fill="#17191c" stroke="${C.line}" stroke-opacity=".6"/>
  <path d="M190 850H610V880H190Z" fill="#141619" stroke="${C.line}" stroke-opacity=".5"/>
  <path d="M150 880H650V910H150Z" fill="#111315" stroke="${C.line}" stroke-opacity=".4"/>
  <rect y="910" width="800" height="90" fill="#0b0c0e"/>
  <path d="M0 910H800" stroke="url(#gold)" stroke-width="2"/>
  <!-- Pflanzkübel -->
  <rect x="118" y="740" width="90" height="140" rx="6" fill="#1b1e22" stroke="${C.line}" stroke-opacity=".6"/>
  <g fill="none" stroke="${C.line}" stroke-opacity=".7" stroke-width="2">
    <path d="M163 740C150 690 130 660 108 640M163 740C166 680 176 640 196 610M163 740C176 700 200 680 226 672M163 740C150 700 150 670 160 630"/>
  </g>
  `,
)

/* Über uns: sorgfältig ausgelegtes Werkzeug (Knolling) */
scenes.about = svg(
  800,
  1000,
  `
  <rect x="70" y="90" width="660" height="820" rx="26" fill="#14161a" stroke="${C.line}" stroke-opacity=".35"/>
  <rect x="96" y="116" width="608" height="768" rx="18" fill="none" stroke="${C.line}" stroke-opacity=".14" stroke-dasharray="6 8"/>
  <ellipse cx="400" cy="460" rx="360" ry="420" fill="url(#glow)" opacity=".4"/>
  <!-- Schraubendreher -->
  ${[180, 250, 320]
    .map(
      (x, i) => `<g filter="url(#shadow)">
    <rect x="${x - 16}" y="170" width="32" height="150" rx="14" fill="#23262b" stroke="url(#gold)" stroke-width="2"/>
    ${Array.from({ length: 4 }, (_, k) => `<path d="M${x - 8 + k * 5.5} 190V300" stroke="${C.line}" stroke-opacity=".35"/>`).join('')}
    <rect x="${x - 4}" y="320" width="8" height="${210 - i * 30}" fill="url(#gold)"/>
    <path d="M${x - 4} ${530 - i * 30}h8l${i === 1 ? '-4 14' : '0 10h-8'}Z" fill="url(#gold)"/>
  </g>`,
    )
    .join('')}
  <!-- Pick-Set -->
  ${Array.from({ length: 5 }, (_, i) => {
    const x = 420 + i * 22
    return `<g>
      <rect x="${x - 5}" y="170" width="10" height="70" rx="5" fill="url(#gold)" opacity=".9"/>
      <path d="M${x} 240V440${['h8', 'l8-10', 'q6-8 0-14', 'h6v-8', 'l6 6'][i]}" fill="none" stroke="${C.lineLight}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`
  }).join('')}
  <!-- Zylinder -->
  <g transform="translate(560 220)" filter="url(#shadow)">
    <rect x="-20" y="-50" width="40" height="160" rx="12" fill="url(#gold)"/>
    <rect x="-20" y="-50" width="40" height="6" fill="#000" opacity=".15"/>
    <path d="M14-10q44 30 0 60" fill="#a8833e"/>
    <circle cx="0" cy="30" r="5" fill="#1a1408" opacity=".7"/>
  </g>
  ${cylinderFront({ x: 640, y: 300, s: 1.1 })}
  <!-- Maßband -->
  <g transform="translate(590 520)" filter="url(#shadow)">
    <circle r="64" fill="#1d2024" stroke="url(#gold)" stroke-width="3"/>
    <circle r="24" fill="none" stroke="${C.line}" stroke-opacity=".6"/>
    <rect x="-70" y="40" width="150" height="22" fill="url(#gold)"/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${-64 + i * 10} 40v${i % 5 === 0 ? 12 : 6}" stroke="#1a1408" stroke-width="1.2"/>`).join('')}
  </g>
  <!-- Schlüssel -->
  ${key({ x: 190, y: 690, r: 0, s: 0.95 })}
  ${key({ x: 190, y: 800, r: 0, s: 0.95 })}
  <!-- Schlüsselring -->
  <circle cx="570" cy="760" r="54" fill="none" stroke="url(#gold)" stroke-width="5"/>
  ${key({ x: 570, y: 760, r: 60, s: 0.6 })}
  ${label({ x: 400, y: 940, text: 'SORGFÄLTIG VORBEREITET', anchor: 'middle', size: 11, opacity: 0.6 })}
  `,
  { grid: false },
)

await mkdir(out, { recursive: true })
for (const [name, content] of Object.entries(scenes)) {
  await writeFile(path.join(out, `${name}.svg`), content)
  console.log(`  ✓ images/${name}.svg (${(content.length / 1024).toFixed(1)} KB)`)
}
