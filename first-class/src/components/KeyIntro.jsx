import { useEffect, useRef, useState } from 'react'
import { KEY_HOME, KEY_OUT, RIGHT_CUTS, buildProfile, createRefs, drawCylinder } from '../lock.js'
import CylinderScene, { CylinderDefs } from './CylinderScene.jsx'
import { LogoMark } from './Logo.jsx'
import { photos } from '../photos.generated.js'

/**
 * Intro der Startseite.
 *
 * Vollversion (erster Besuch): Haustür bei Nacht (Foto, falls vorhanden,
 * sonst Zeichnung), das Licht geht an, die Kamera fährt auf das Schloss zu, die Tür wird im Schnitt sichtbar, der
 * Schlüssel hebt die Stifte bis zur Scherlinie, dreht – und die Seite öffnet
 * sich genau entlang der Scherlinie.
 * Kurzversion (spätere Besuche): nur Schlüssel, Scherlinie, Öffnen.
 *
 * Ob und welche Version läuft, entscheidet ein Skript im <head>
 * (scripts/prerender.mjs), damit vor dem ersten Bild nichts aufblitzt.
 */

const TIMELINES = {
  full: {
    zoom: [350, 1500],
    exteriorFade: [1250, 1600],
    xray: [1450, 2050],
    key: [1850, 3650],
    aligned: 3650,
    turn: 3850,
    open: 4550,
    done: 5500,
    steps: [
      [1450, 'Blick in den Schließzylinder'],
      [2350, 'Der Schlüssel hebt die Stifte an'],
      [3650, 'Alle Stifte stehen auf der Scherlinie'],
      [3850, 'Der Kern dreht sich – die Tür ist offen'],
    ],
  },
  short: {
    zoom: null,
    exteriorFade: null,
    xray: null,
    key: [150, 1150],
    aligned: 1150,
    turn: 1250,
    open: 1850,
    done: 2800,
    steps: [
      [0, 'Der Schlüssel hebt die Stifte an'],
      [1150, 'Alle Stifte stehen auf der Scherlinie'],
      [1250, 'Die Tür ist offen'],
    ],
  },
}

const PROFILE = buildProfile(RIGHT_CUTS)

// Foto der Haustür für die Kamerafahrt; `focus` = Lage des Schlosses im Bild (0–1).
const DOOR = photos.introDoor
const DOOR_FOCUS = DOOR?.focus ?? [0.5, 0.58]
const PHOTO_WAIT = 900 // so lange darf das Foto zum Laden brauchen, sonst Zeichnung

/** Foto-Kamerafahrt: Bild wird zum Schloss hin vergrößert und unscharf. */
function photoFrame(img, zoom) {
  const blur = Math.max(0, (zoom - 0.5) / 0.5) * 7
  img.style.transform = `scale(${(1 + zoom * 8).toFixed(4)})`
  img.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : ''
}

const LEGEND = [
  { label: 'Schlüssel', swatch: 'linear-gradient(135deg,#f3e6c6,#c49e56)' },
  { label: 'Kernstift · Messing', swatch: 'linear-gradient(90deg,#8a6a2c,#f1dca8,#a8833e)' },
  { label: 'Gehäusestift · Stahl', swatch: 'linear-gradient(90deg,#6d727a,#e3e6ea,#80858d)' },
  { label: 'Feder', swatch: '#c8ccd2' },
  { label: 'Scherlinie', swatch: '#ffe2a8' },
]

const clamp = (v) => Math.min(1, Math.max(0, v))
const progress = (t, range) => (range ? clamp((t - range[0]) / (range[1] - range[0])) : 1)
const easeOutCubic = (x) => 1 - (1 - x) ** 3
const easeInCubic = (x) => x ** 3
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

// Kamerafahrt in der Außenansicht: von der ganzen Tür bis auf den Zylinder.
// Der Ausschnitt hat immer das Seitenverhältnis des Bildschirms.
const LOCK_POINT = [596, 640]
function exteriorViewBox(zoom, aspect) {
  const h0 = Math.max(920, 430 / aspect) // hochkant: Tür und Leuchte bleiben ganz im Bild
  const h = h0 * (26 / h0) ** zoom
  const w = h * aspect
  const cx = 530 + (LOCK_POINT[0] - 530) * zoom
  const cy = 500 + (LOCK_POINT[1] - 500) * zoom
  return `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`
}

/** Außenansicht: moderne Haustür bei Nacht mit Wandleuchte. */
function Exterior({ svgRef }) {
  return (
    <svg
      ref={svgRef}
      className="intro-exterior"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ix-wall" x1="0" x2="1">
          <stop offset="0" stopColor="#101214" />
          <stop offset=".5" stopColor="#1a1d21" />
          <stop offset="1" stopColor="#0f1113" />
        </linearGradient>
        <linearGradient id="ix-warm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe2ad" />
          <stop offset=".55" stopColor="#e9b766" />
          <stop offset="1" stopColor="#a8762e" />
        </linearGradient>
        <linearGradient id="ix-leaf" x1="0" x2="1">
          <stop offset="0" stopColor="#262a2f" />
          <stop offset="1" stopColor="#131518" />
        </linearGradient>
        <linearGradient id="ix-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e6c6" />
          <stop offset=".5" stopColor="#d5b475" />
          <stop offset="1" stopColor="#8a6a2c" />
        </linearGradient>
        <linearGradient id="ix-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd38a" stopOpacity=".42" />
          <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ix-glow">
          <stop offset="0" stopColor="#f0c47a" stopOpacity=".35" />
          <stop offset="1" stopColor="#f0c47a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-3000" y="-3000" width="7000" height="7000" fill="#0c0d0f" />
      <rect x="-3000" y="0" width="7000" height="900" fill="url(#ix-wall)" />
      <g stroke="#ffffff" strokeOpacity=".035">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${-20 + i * 70} 0V900`} />
        ))}
      </g>

      {/* Wandleuchte, schaltet sich ein */}
      <g className="intro-lamp">
        <path d="M688 330L612 900H800L728 330Z" fill="url(#ix-beam)" />
        <ellipse cx="560" cy="560" rx="300" ry="380" fill="url(#ix-glow)" />
      </g>
      <rect
        x="690"
        y="284"
        width="36"
        height="46"
        rx="4"
        fill="#24272c"
        stroke="#c49e56"
        strokeOpacity=".7"
      />
      <rect className="intro-lamp" x="695" y="324" width="26" height="5" rx="2" fill="#ffe3b0" />

      {/* Tür mit Glasseitenteil */}
      <rect
        x="372"
        y="172"
        width="256"
        height="728"
        fill="#0b0c0e"
        stroke="url(#ix-gold)"
        strokeWidth="3"
      />
      <rect x="384" y="184" width="54" height="716" fill="url(#ix-warm)" opacity=".9" />
      <g stroke="#7a5420" strokeOpacity=".4">
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M384 ${212 + i * 31}H438`} />
        ))}
      </g>
      <rect x="446" y="184" width="170" height="716" fill="url(#ix-leaf)" />
      <g stroke="#c49e56" strokeOpacity=".16">
        {[476, 506, 536, 566].map((x) => (
          <path key={x} d={`M${x} 210V870`} />
        ))}
      </g>
      <rect x="586" y="380" width="8" height="200" rx="4" fill="url(#ix-gold)" />
      <rect x="578" y="398" width="10" height="5" rx="2" fill="url(#ix-gold)" />
      <rect x="578" y="556" width="10" height="5" rx="2" fill="url(#ix-gold)" />

      {/* Schutzbeschlag mit Profilzylinder – Ziel der Kamerafahrt */}
      <rect
        x="584"
        y="612"
        width="24"
        height="58"
        rx="7"
        fill="#202328"
        stroke="url(#ix-gold)"
        strokeWidth="1.4"
      />
      <g transform="translate(596 632) scale(0.36)">
        <path
          d="M-10 13.75A17 17 0 1 1 10 13.75V49Q10 53 6 53H-6Q-10 53-10 49Z"
          fill="url(#ix-gold)"
        />
        <path d="M0-8V9" stroke="#1a1408" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      <rect x="-3000" y="900" width="7000" height="4000" fill="#0b0c0e" />
      <path d="M-3000 900H4000" stroke="url(#ix-gold)" strokeWidth="2" />
      <path d="M372 900L300 1000H700L628 900Z" fill="#ffd38a" opacity=".06" />
    </svg>
  )
}

export default function KeyIntro() {
  const [done, setDone] = useState(false)
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const exteriorRef = useRef(null)
  const photoRef = useRef(null)
  const stepRef = useRef(null)
  const refs = useRef(createRefs(2))

  useEffect(() => {
    const html = document.documentElement
    let mode = window.__fcIntro
    if (mode === undefined) {
      // Entwicklungsmodus ohne Kopf-Skript: Vollversion zeigen, außer bei reduzierter Bewegung.
      mode = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'skip' : 'full'
      window.__fcIntro = mode
      if (mode !== 'skip') html.classList.add('intro-playing', 'intro-hold')
    }
    if (mode === 'skip' || !html.classList.contains('intro-playing')) {
      setDone(true)
      return
    }
    window.clearTimeout(window.__fcIntroFailsafe)
    try {
      sessionStorage.setItem('fc-intro', '1')
      localStorage.setItem('fc-intro-seen', '1')
    } catch {
      /* Speicher gesperrt – dann läuft das Intro bei jedem Besuch */
    }

    const T = TIMELINES[mode]
    const root = rootRef.current
    root.classList.add(`is-${mode}`)
    const exterior = exteriorRef.current
    if (!T.zoom && exterior) exterior.style.display = 'none'
    const photoImg = photoRef.current
    const photoWrap = photoImg?.parentElement
    // Erst mit dem Foto, wenn es rechtzeitig geladen ist – sonst die Zeichnung.
    // Bis das feststeht, bleibt die Bühne dunkel.
    let usePhoto = false
    if (photoImg && T.zoom && exterior) exterior.style.visibility = 'hidden'

    let raf = 0
    let opened = false
    let finishTimer = 0
    let start = 0
    let step = -1

    const showStep = (index) => {
      if (index === step || !stepRef.current) return
      step = index
      const [num, text] = stepRef.current.children
      num.textContent = `${index + 1}/${T.steps.length}`
      text.textContent = T.steps[index][1]
      stepRef.current.animate?.(
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' },
      )
    }

    const finish = () => {
      html.classList.remove('intro-playing', 'intro-hold')
      setDone(true)
    }

    const open = () => {
      if (opened) return
      opened = true
      cancelAnimationFrame(raf)
      drawCylinder(refs.current, { keyX: KEY_HOME, profile: PROFILE, xray: 1 })
      if (exterior) exterior.style.opacity = '0'
      if (photoWrap) photoWrap.style.opacity = '0'
      showStep(T.steps.length - 1)
      root.classList.add('labels-on', 'aligned', 'turned', 'is-open')
      if (barRef.current) barRef.current.style.transform = 'scaleX(1)'
      html.classList.remove('intro-hold')
      finishTimer = window.setTimeout(finish, T.done - T.open)
    }

    const frame = (now) => {
      if (!start) start = now
      const t = now - start

      if (T.zoom) {
        const zoom = easeInCubic(progress(t, T.zoom))
        const fade = String(1 - progress(t, T.exteriorFade))
        if (usePhoto) {
          photoFrame(photoImg, zoom)
          photoWrap.style.opacity = fade
        } else if (exterior) {
          exterior.setAttribute(
            'viewBox',
            exteriorViewBox(zoom, window.innerWidth / window.innerHeight),
          )
          exterior.style.opacity = fade
        }
      }

      const keyX = KEY_OUT + (KEY_HOME - KEY_OUT) * easeOutCubic(progress(t, T.key))
      drawCylinder(refs.current, { keyX, profile: PROFILE, xray: easeInOut(progress(t, T.xray)) })

      const current = T.steps.reduce((acc, [at], i) => (t >= at ? i : acc), -1)
      if (current >= 0) showStep(current)
      if (!T.xray || t > T.xray[1] - 250) root.classList.add('labels-on')
      if (t > T.aligned) root.classList.add('aligned')
      if (t > T.turn) root.classList.add('turned')
      if (barRef.current) barRef.current.style.transform = `scaleX(${clamp(t / T.open).toFixed(3)})`

      if (t >= T.open) open()
      else raf = requestAnimationFrame(frame)
    }

    // Erst starten, wenn der Tab sichtbar ist – sonst verpasst man das Intro.
    let ready = false
    const begin = () => {
      if (!ready || document.hidden || raf || opened) return
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => begin()
    let waitTimer = 0
    const prepare = (photoOk) => {
      if (ready) return
      ready = true
      window.clearTimeout(waitTimer)
      usePhoto = photoOk
      // Bis hierher deckt die dunkle Fotofläche die Bühne ab.
      if (photoWrap) photoWrap.classList.add(photoOk ? 'is-ready' : 'is-off')
      if (exterior) {
        exterior.style.visibility = ''
        if (photoOk) exterior.style.display = 'none'
      }
      begin()
    }

    const onKey = (event) => {
      if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown'].includes(event.key)) open()
    }
    window.addEventListener('wheel', open, { passive: true })
    window.addEventListener('touchmove', open, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('fc:skip-intro', open)
    document.addEventListener('visibilitychange', onVisibility)
    if (photoImg && T.zoom) {
      waitTimer = window.setTimeout(() => prepare(false), PHOTO_WAIT)
      photoImg
        .decode()
        .then(() => prepare(photoImg.naturalWidth > 0))
        .catch(() => prepare(false))
    } else {
      prepare(false)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(finishTimer)
      window.clearTimeout(waitTimer)
      window.removeEventListener('wheel', open)
      window.removeEventListener('touchmove', open)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('fc:skip-intro', open)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  if (done) return null

  const viewBox = '90 290 910 420'
  return (
    <div ref={rootRef} className="intro">
      <div className="intro-half intro-top">
        <svg className="intro-svg" viewBox={viewBox} aria-hidden="true" focusable="false">
          <CylinderDefs p="fi" />
          <CylinderScene refs={refs} copy={0} p="fi" cover labels arc />
        </svg>
      </div>
      <div className="intro-half intro-bottom">
        <svg className="intro-svg" viewBox={viewBox} aria-hidden="true" focusable="false">
          <CylinderScene refs={refs} copy={1} p="fi" cover labels arc />
        </svg>
      </div>

      <Exterior svgRef={exteriorRef} />
      {DOOR && (
        <div
          className="intro-photo"
          style={{ '--fx': `${DOOR_FOCUS[0] * 100}%`, '--fy': `${DOOR_FOCUS[1] * 100}%` }}
        >
          <img
            ref={photoRef}
            src={DOOR.src}
            srcSet={DOOR.srcSet}
            sizes="100vw"
            width={DOOR.width}
            height={DOOR.height}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="intro-brand">
        <LogoMark className="h-11 w-11 text-gold-400" />
        <span>
          <span className="intro-brand-name">FIRST CLASS</span>
          <span className="intro-brand-sub">Schlüsseldienst</span>
        </span>
      </div>
      <div className="intro-caption" aria-hidden="true">
        <ul className="intro-legend">
          {LEGEND.map((item) => (
            <li key={item.label}>
              <span style={{ background: item.swatch }} />
              {item.label}
            </li>
          ))}
        </ul>
        <p ref={stepRef} className="intro-step">
          <span className="intro-step-num" />
          <span className="intro-step-text" />
        </p>
      </div>

      <div className="intro-seam" aria-hidden="true" />
      <div className="intro-progress" aria-hidden="true">
        <span ref={barRef} />
      </div>
      <button
        type="button"
        className="intro-skip"
        onClick={() => window.dispatchEvent(new Event('fc:skip-intro'))}
      >
        Intro überspringen
      </button>
    </div>
  )
}
