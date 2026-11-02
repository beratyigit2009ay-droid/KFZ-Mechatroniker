import { useEffect, useRef, useState } from 'react'
import { KEY_HOME, KEY_OUT, RIGHT_CUTS, buildProfile, createRefs, drawCylinder } from '../lock.js'
import CylinderScene, { CylinderDefs } from './CylinderScene.jsx'
import Logo from './Logo.jsx'
import { logo } from './logo.generated.js'

/**
 * Intro der Startseite.
 *
 * Vollversion (erster Besuch): Das Löwen-Logo erscheint – Ringe zeichnen sich,
 * ein Lichtschimmer läuft über das Siegel, der Schriftzug baut sich auf. Dann
 * fährt die Kamera in den Schlüssel im Maul des Löwen; derselbe Schlüssel
 * gleitet im Schnitt in den Zylinder, hebt die Stifte bis zur Scherlinie,
 * dreht – und die Seite öffnet sich genau entlang der Scherlinie.
 * Kurzversion (spätere Besuche): nur Schlüssel, Scherlinie, Öffnen.
 *
 * Ob und welche Version läuft, entscheidet ein Skript im <head>
 * (scripts/prerender.mjs), damit vor dem ersten Bild nichts aufblitzt.
 */

const TIMELINES = {
  full: {
    zoom: [1750, 2700],
    logoFade: [2500, 2850],
    xray: [2650, 3150],
    key: [2750, 4300],
    aligned: 4300,
    turn: 4500,
    open: 5150,
    done: 6100,
    steps: [
      [2650, 'Blick in den Schließzylinder'],
      [3300, 'Der Schlüssel hebt die Stifte an'],
      [4300, 'Alle Stifte stehen auf der Scherlinie'],
      [4500, 'Der Kern dreht sich – die Tür ist offen'],
    ],
  },
  short: {
    zoom: null,
    logoFade: null,
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

// Lage des Schlüssels im Maul des Löwen (Anteil am Siegel) – Ziel der Kamerafahrt.
const KEY_FOCUS = [0.75, 0.55]
const GOLD = '#c49e56'
const ANTHRACITE = '#15171a'
const CREAM = '#f7f2e8'
const WORD_W = logo.rule.w + 2
const WORD_H = logo.rule.y + logo.rule.h + 25

/** Kamerafahrt in den Schlüssel: vergrößern, zum Ende hin unscharf. */
function zoomFrame(el, zoom) {
  const blur = Math.max(0, (zoom - 0.45) / 0.55) * 8
  el.style.transform = `scale(${(1 + zoom * 15).toFixed(4)})`
  el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : ''
}

/** Großes Logo für den Auftakt; die Teile werden per CSS nacheinander eingeblendet. */
function IntroLogo({ logoRef, emblemRef }) {
  return (
    <div ref={logoRef} className="intro-logo" aria-hidden="true">
      <svg ref={emblemRef} className="intro-logo-emblem" viewBox="0 0 200 200" focusable="false">
        <defs>
          <clipPath id="il-gold-clip">
            <path clipRule="evenodd" d={logo.gold} />
          </clipPath>
          <linearGradient id="il-shine" x1="0" x2="1">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff6dc" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="il-dark" fill={ANTHRACITE} fillRule="evenodd" d={logo.dark} />
        <path className="il-gold" fill={GOLD} fillRule="evenodd" d={logo.gold} />
        <g clipPath="url(#il-gold-clip)">
          <rect
            className="il-shine"
            x="-90"
            y="-40"
            width="70"
            height="280"
            fill="url(#il-shine)"
          />
        </g>
        <circle
          className="il-ring"
          cx="100"
          cy="100"
          r="95.1"
          fill="none"
          stroke={GOLD}
          strokeWidth="2.8"
          pathLength="1"
        />
      </svg>
      <svg className="intro-logo-word" viewBox={`0 0 ${WORD_W} ${WORD_H}`} focusable="false">
        <path className="il-word" fill={CREAM} d={logo.word} />
        <rect
          className="il-rule"
          fill={GOLD}
          x="1"
          y={logo.rule.y}
          width={logo.rule.w}
          height={logo.rule.h}
        />
        <path className="il-sub" fill={GOLD} d={logo.sub} />
      </svg>
    </div>
  )
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

export default function KeyIntro() {
  const [done, setDone] = useState(false)
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const logoRef = useRef(null)
  const emblemRef = useRef(null)
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
    const logoEl = logoRef.current
    let originSet = false

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
      if (logoEl) logoEl.style.opacity = '0'
      showStep(T.steps.length - 1)
      root.classList.add('labels-on', 'aligned', 'turned', 'is-open')
      if (barRef.current) barRef.current.style.transform = 'scaleX(1)'
      html.classList.remove('intro-hold')
      finishTimer = window.setTimeout(finish, T.done - T.open)
    }

    const frame = (now) => {
      if (!start) start = now
      const t = now - start

      if (T.zoom && logoEl && t >= T.zoom[0]) {
        if (!originSet) {
          // Kamerafahrt zielt auf den Schlüssel im Maul des Löwen.
          const box = logoEl.getBoundingClientRect()
          const e = emblemRef.current.getBoundingClientRect()
          const ox = e.left - box.left + e.width * KEY_FOCUS[0]
          const oy = e.top - box.top + e.height * KEY_FOCUS[1]
          logoEl.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`
          originSet = true
        }
        zoomFrame(logoEl, easeInCubic(progress(t, T.zoom)))
        logoEl.style.opacity = String(1 - progress(t, T.logoFade))
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
    const begin = () => {
      if (document.hidden || raf || opened) return
      raf = requestAnimationFrame(frame)
    }
    const onVisibility = () => begin()

    const onKey = (event) => {
      if (['Escape', 'Enter', ' ', 'ArrowDown', 'PageDown'].includes(event.key)) open()
    }
    window.addEventListener('wheel', open, { passive: true })
    window.addEventListener('touchmove', open, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('fc:skip-intro', open)
    document.addEventListener('visibilitychange', onVisibility)
    begin()

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(finishTimer)
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

      <IntroLogo logoRef={logoRef} emblemRef={emblemRef} />

      <div className="intro-brand">
        <Logo className="h-14 w-auto sm:h-16" />
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
