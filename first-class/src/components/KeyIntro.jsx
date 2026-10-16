import { useEffect, useRef, useState } from 'react'
import { LogoMark } from './Logo.jsx'

/**
 * Intro der Startseite: Ein Schlüssel fährt in den Profilzylinder einer Tür.
 * Die Tür wird im Schnitt sichtbar, die Stifte heben sich mit dem Schlüssel,
 * bis alle auf der Scherlinie stehen – dann öffnet sich die Seite genau dort.
 *
 * Ob das Intro läuft, entscheidet ein kleines Skript im <head> (siehe
 * scripts/prerender.mjs), damit vor dem ersten Bild nichts aufblitzt.
 */

// Geometrie in SVG-Einheiten (Schnittansicht von der Seite)
const SHEAR = 500 // Scherlinie zwischen Kern und Gehäuse
const PINS = [390, 460, 530, 600, 670] // Stiftbohrungen
const KEY_PIN = [46, 60, 38, 54, 42] // Länge der Kernstifte
const DRIVER = 44 // Länge der Gehäusestifte
const REST = 598 // Stiftspitze ohne Schlüssel
const SPRING_TOP = 352
const RIDGE = 534 // Oberkante des Schlüsselbarts
const BLADE_BOTTOM = 602
const KEY_HOME = 300 // Schlüsselschulter liegt an der Türfläche an
const KEY_START = -820

// Zeitplan in Millisekunden
const T = { xray: [350, 1050], key: [850, 2850], aligned: 2850, open: 3450, done: 4400 }

// Schlüsselbart: Einschnitte genau unter den Stiften, Tiefe passend zur Stiftlänge
const PROFILE = [[0, RIDGE]]
PINS.forEach((x, i) => {
  const u = x - KEY_HOME
  const y = SHEAR + KEY_PIN[i]
  const h = y - RIDGE
  PROFILE.push([u - 9 - h, RIDGE], [u - 9, y], [u + 9, y], [u + 9 + h, RIDGE])
})
PROFILE.push([418, RIDGE], [442, 570])

const BLADE_PATH = `M${PROFILE.map(([u, y]) => `${u} ${y}`).join('L')}L430 ${BLADE_BOTTOM}L0 ${BLADE_BOTTOM}Z`

function profileAt(u) {
  if (u < 0 || u > 442) return Infinity
  for (let i = 1; i < PROFILE.length; i++) {
    const [u0, y0] = PROFILE[i - 1]
    const [u1, y1] = PROFILE[i]
    if (u <= u1) return u1 === u0 ? y1 : y0 + ((y1 - y0) * (u - u0)) / (u1 - u0)
  }
  return Infinity
}

function pinTip(x, keyX) {
  const u = x - keyX
  return Math.min(REST, profileAt(u - 7), profileAt(u), profileAt(u + 7))
}

function springPath(x, top, bottom) {
  const turns = 10
  let d = `M${x} ${top}`
  for (let k = 1; k < turns; k++) {
    const y = top + ((bottom - top) * k) / turns
    d += `L${x + (k % 2 ? 9 : -9)} ${y.toFixed(1)}`
  }
  return `${d}L${x} ${bottom.toFixed(1)}`
}

function keyPinPath(x, len) {
  return `M${x - 12} 0H${x + 12}V${len - 9}Q${x + 12} ${len} ${x} ${len}Q${x - 12} ${len} ${x - 12} ${len - 9}Z`
}

const clamp = (v) => Math.min(1, Math.max(0, v))
const progress = (t, [a, b]) => clamp((t - a) / (b - a))
const easeOutCubic = (x) => 1 - (1 - x) ** 3
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

const LABELS = [
  { text: 'TÜRBLATT', at: [296, 318], to: [262, 318], side: 'left' },
  { text: 'GEHÄUSE', at: [332, 372], to: [262, 372], side: 'left' },
  { text: 'ZYLINDERKERN', at: [356, 600], to: [262, 668], side: 'left' },
  { text: 'FEDER · EDELSTAHL', at: [679, 392], to: [790, 372], side: 'right' },
  { text: 'GEHÄUSESTIFT · STAHL', at: [682, 474], to: [790, 432], side: 'right' },
  { text: 'SCHERLINIE', at: [764, 500], to: [790, 500], side: 'right' },
  { text: 'KERNSTIFT · MESSING', at: [682, 522], to: [790, 562], side: 'right' },
  { text: 'SCHLÜSSEL', at: [722, 590], to: [790, 628], side: 'right' },
]

const LEGEND = [
  { label: 'Schlüssel', swatch: 'linear-gradient(135deg,#f3e6c6,#c49e56)' },
  { label: 'Kernstift · Messing', swatch: 'linear-gradient(90deg,#8a6a2c,#f1dca8,#a8833e)' },
  { label: 'Gehäusestift · Stahl', swatch: 'linear-gradient(90deg,#6d727a,#e3e6ea,#80858d)' },
  { label: 'Feder', swatch: '#c8ccd2' },
  { label: 'Scherlinie', swatch: '#ffe2a8' },
]

function Defs() {
  return (
    <defs>
      <pattern id="fc-hatch-a" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="9" height="9" fill="#1d2024" />
        <path d="M0 0V9" stroke="#c49e56" strokeOpacity=".28" strokeWidth="1.2" />
      </pattern>
      <pattern id="fc-hatch-b" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="9" height="9" fill="#25282d" />
        <path d="M0 0V9" stroke="#c49e56" strokeOpacity=".2" strokeWidth="1.2" />
      </pattern>
      <pattern id="fc-wood" width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#15171a" />
        <path d="M0 7Q15 4 30 7T60 7" fill="none" stroke="#c49e56" strokeOpacity=".07" />
      </pattern>
      <linearGradient id="fc-brass" x1="0" x2="1">
        <stop offset="0" stopColor="#7d5f27" />
        <stop offset=".45" stopColor="#f1dca8" />
        <stop offset="1" stopColor="#9c7a37" />
      </linearGradient>
      <linearGradient id="fc-steel" x1="0" x2="1">
        <stop offset="0" stopColor="#5f646b" />
        <stop offset=".45" stopColor="#e6e9ec" />
        <stop offset="1" stopColor="#7b8088" />
      </linearGradient>
      <linearGradient id="fc-key" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6ebcf" />
        <stop offset=".5" stopColor="#d5b475" />
        <stop offset="1" stopColor="#8a6a2c" />
      </linearGradient>
      <linearGradient id="fc-plate" x1="0" x2="1">
        <stop offset="0" stopColor="#8a6a2c" />
        <stop offset=".5" stopColor="#e5cc96" />
        <stop offset="1" stopColor="#a8833e" />
      </linearGradient>
      <linearGradient id="fc-scan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe2a8" stopOpacity="0" />
        <stop offset="1" stopColor="#ffe2a8" stopOpacity=".55" />
      </linearGradient>
      <filter id="fc-glow" x="-20%" y="-400%" width="140%" height="900%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
    </defs>
  )
}

/** Die Szene wird zweimal gerendert: obere und untere Bildschirmhälfte. */
function Scene({ refs, copy }) {
  const set = (key, i) => (el) => {
    if (i === undefined) refs.current[key][copy] = el
    else refs.current[key][copy][i] = el
  }
  return (
    <>
      {/* Türblatt im Schnitt, läuft über die ganze Bildschirmhöhe */}
      <rect x="296" y="-600" width="468" height="2200" fill="url(#fc-wood)" />
      <path d="M296-600V1600M764-600V1600" stroke="#c49e56" strokeOpacity=".55" strokeWidth="1.5" />

      {/* Gehäuse, Kern, Schlüsselkanal und Bohrungen */}
      <rect x="300" y="340" width="460" height="160" fill="url(#fc-hatch-a)" />
      <rect x="300" y="500" width="460" height="128" fill="url(#fc-hatch-a)" />
      <rect x="304" y="500" width="456" height="112" rx="4" fill="url(#fc-hatch-b)" />
      <rect x="300" y="530" width="460" height="75" fill="#08090a" />
      {PINS.map((x) => (
        <rect key={x} x={x - 14} y="350" width="28" height="182" fill="#08090a" />
      ))}
      <rect x="300" y="340" width="460" height="288" fill="none" stroke="#c49e56" strokeOpacity=".7" strokeWidth="1.5" />

      {/* Federn, Gehäusestifte, Kernstifte */}
      {PINS.map((x, i) => {
        const top = REST - KEY_PIN[i]
        return (
          <g key={x}>
            <path
              ref={set('springs', i)}
              d={springPath(x, SPRING_TOP, top - DRIVER)}
              fill="none"
              stroke="#c8ccd2"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <g ref={set('drivers', i)} transform={`translate(0 ${top - DRIVER})`}>
              <rect x={x - 12} y="0" width="24" height={DRIVER - 1} rx="3" fill="url(#fc-steel)" />
            </g>
            <g ref={set('keyPins', i)} transform={`translate(0 ${top})`}>
              <path d={keyPinPath(x, KEY_PIN[i])} fill="url(#fc-brass)" />
            </g>
          </g>
        )
      })}

      {/* Scherlinie */}
      <path d={`M300 ${SHEAR}H760`} stroke="#e5cc96" strokeOpacity=".4" strokeDasharray="7 6" />
      <path className="intro-shear-glow" d={`M300 ${SHEAR}H760`} stroke="#ffe2a8" strokeWidth="6" filter="url(#fc-glow)" />
      <path className="intro-shear-glow" d={`M300 ${SHEAR}H760`} stroke="#fff3d6" strokeWidth="1.6" />

      {/* Röntgen-Abdeckung: Tür zunächst geschlossen */}
      <g>
        <rect ref={set('cover')} x="300" y="330" width="460" height="310" fill="url(#fc-wood)" />
        <rect ref={set('scan')} x="300" y="300" width="460" height="30" fill="url(#fc-scan)" opacity="0" />
      </g>

      {/* Beschläge innen und außen */}
      <rect x="764" y="380" width="12" height="240" rx="5" fill="url(#fc-plate)" opacity=".85" />
      <path d="M278 316Q278 300 290 300H296V700H290Q278 700 278 684Z" fill="url(#fc-plate)" />
      <rect x="278" y="530" width="18" height="75" fill="#08090a" />

      {/* Schlüssel */}
      <g ref={set('key')} transform={`translate(${KEY_START} 0)`}>
        <path d={BLADE_PATH} fill="url(#fc-key)" />
        <path d={`M14 582H410`} stroke="#000" strokeOpacity=".28" strokeWidth="2" />
        <rect x="-18" y="520" width="18" height="96" rx="3" fill="url(#fc-key)" />
        <rect x="-44" y="548" width="28" height="40" fill="url(#fc-key)" />
        <path
          fillRule="evenodd"
          fill="url(#fc-key)"
          d="M-182 568a72 72 0 1 0 144 0a72 72 0 1 0-144 0ZM-132 568a22 22 0 1 0 44 0a22 22 0 1 0-44 0Z"
        />
        <circle cx="-110" cy="568" r="50" fill="none" stroke="#000" strokeOpacity=".16" />
      </g>

      {/* Beschriftungen (ab Tablet-Breite) */}
      {LABELS.map((l, i) => {
        const [x1, y1] = l.at
        const [x2, y2] = l.to
        const right = l.side === 'right'
        return (
          <g key={l.text} className="intro-label" style={{ '--d': `${i * 120}ms` }}>
            <circle cx={x1} cy={y1} r="3.2" fill="#ffe2a8" />
            <path d={`M${x1} ${y1}L${x2} ${y2}H${right ? x2 + 8 : x2 - 8}`} fill="none" stroke="#e5cc96" strokeOpacity=".75" />
            <text
              x={right ? x2 + 14 : x2 - 14}
              y={y2 + 3.6}
              textAnchor={right ? 'start' : 'end'}
              fontSize="10.5"
              letterSpacing="2.6"
              fill="#f1e4c4"
              fontFamily="'Manrope Variable', system-ui, sans-serif"
              fontWeight="600"
            >
              {l.text}
            </text>
          </g>
        )
      })}
    </>
  )
}

export default function KeyIntro() {
  const [done, setDone] = useState(false)
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const refs = useRef({
    key: [],
    cover: [],
    scan: [],
    springs: [[], []],
    drivers: [[], []],
    keyPins: [[], []],
  })

  useEffect(() => {
    const html = document.documentElement
    let decision = window.__fcIntro
    if (decision === undefined) {
      // Ohne vorgerendertes Kopf-Skript (Entwicklungsmodus) selbst entscheiden.
      let seen = false
      try {
        seen = sessionStorage.getItem('fc-intro') === '1'
      } catch {
        seen = false
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      decision = !reduced && (!seen || window.location.hash === '#intro') ? 'play' : 'skip'
      window.__fcIntro = decision
      if (decision === 'play') html.classList.add('intro-playing', 'intro-hold')
    }
    if (decision !== 'play' || !html.classList.contains('intro-playing')) {
      setDone(true)
      return
    }
    try {
      sessionStorage.setItem('fc-intro', '1')
    } catch {
      /* Speicher gesperrt – Intro läuft dann bei jedem Besuch */
    }

    const root = rootRef.current
    const r = refs.current
    const each = (list, fn) => list.forEach((el, i) => el && fn(el, i))

    const draw = (keyX, xray) => {
      each(r.key, (el) => el.setAttribute('transform', `translate(${keyX.toFixed(2)} 0)`))
      const coverTop = 330 + 310 * xray
      each(r.cover, (el) => {
        el.setAttribute('y', coverTop.toFixed(1))
        el.setAttribute('height', Math.max(0, 640 - coverTop).toFixed(1))
      })
      each(r.scan, (el) => {
        el.setAttribute('y', (coverTop - 30).toFixed(1))
        el.setAttribute('opacity', xray > 0 && xray < 1 ? '1' : '0')
      })
      PINS.forEach((x, i) => {
        const tip = pinTip(x, keyX)
        const top = tip - KEY_PIN[i]
        const driverTop = top - DRIVER
        for (const copy of [0, 1]) {
          r.keyPins[copy][i]?.setAttribute('transform', `translate(0 ${top.toFixed(2)})`)
          r.drivers[copy][i]?.setAttribute('transform', `translate(0 ${driverTop.toFixed(2)})`)
          r.springs[copy][i]?.setAttribute('d', springPath(x, SPRING_TOP, driverTop))
        }
      })
    }

    let raf = 0
    let opened = false
    let finishTimer = 0
    const start = performance.now()

    const finish = () => {
      html.classList.remove('intro-playing', 'intro-hold')
      setDone(true)
    }

    const open = () => {
      if (opened) return
      opened = true
      cancelAnimationFrame(raf)
      draw(KEY_HOME, 1)
      root.classList.add('labels-on', 'aligned', 'is-open')
      if (barRef.current) barRef.current.style.transform = 'scaleX(1)'
      html.classList.remove('intro-hold')
      finishTimer = window.setTimeout(finish, T.done - T.open)
    }

    const frame = (now) => {
      const t = now - start
      const k = easeOutCubic(progress(t, T.key))
      const keyX = KEY_START + (KEY_HOME - KEY_START) * k
      draw(keyX, easeInOut(progress(t, T.xray)))
      if (t > T.xray[1] - 200) root.classList.add('labels-on')
      if (t > T.aligned) root.classList.add('aligned')
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamp(t / T.open).toFixed(3)})`
      if (t >= T.open) open()
      else raf = requestAnimationFrame(frame)
    }

    const onKey = (event) => {
      if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown'].includes(event.key)) open()
    }
    window.addEventListener('wheel', open, { passive: true })
    window.addEventListener('touchmove', open, { passive: true })
    window.addEventListener('keydown', onKey)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(finishTimer)
      window.removeEventListener('wheel', open)
      window.removeEventListener('touchmove', open)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (done) return null

  const skip = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

  return (
    <div ref={rootRef} className="intro">
      <div className="intro-half intro-top">
        <svg className="intro-svg" viewBox="90 290 910 420" aria-hidden="true" focusable="false">
          <Defs />
          <Scene refs={refs} copy={0} />
        </svg>
        <div className="intro-brand">
          <LogoMark className="h-11 w-11 text-gold-400" />
          <span>
            <span className="intro-brand-name">FIRST CLASS</span>
            <span className="intro-brand-sub">Schlüsseldienst</span>
          </span>
        </div>
      </div>
      <div className="intro-half intro-bottom">
        <svg className="intro-svg" viewBox="90 290 910 420" aria-hidden="true" focusable="false">
          <Scene refs={refs} copy={1} />
        </svg>
        <div className="intro-caption">
          <ul className="intro-legend" aria-hidden="true">
            {LEGEND.map((item) => (
              <li key={item.label}>
                <span style={{ background: item.swatch }} />
                {item.label}
              </li>
            ))}
          </ul>
          <p className="intro-tagline">Präzision bis zur Scherlinie.</p>
        </div>
      </div>
      <div className="intro-seam" aria-hidden="true" />
      <div className="intro-progress" aria-hidden="true">
        <span ref={barRef} />
      </div>
      <button type="button" className="intro-skip" onClick={skip}>
        Intro überspringen
      </button>
    </div>
  )
}
