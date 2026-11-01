import { useEffect, useRef, useState } from 'react'
import CylinderScene, { CylinderDefs } from '../components/CylinderScene.jsx'
import Icon from '../components/Icon.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { useLinks } from '../context.js'
import {
  KEY_HOME,
  RIGHT_CUTS,
  WRONG_CUTS,
  bladePath,
  buildProfile,
  createRefs,
  drawCylinder,
} from '../lock.js'

const KEY_START = -150 // Schlüssel steht vor dem Schloss
const KEYS = {
  right: { label: 'Passender Schlüssel', profile: buildProfile(RIGHT_CUTS) },
  wrong: { label: 'Falscher Schlüssel', profile: buildProfile(WRONG_CUTS) },
}

const LEGEND = [
  ['Kernstift (Messing)', 'linear-gradient(90deg,#8a6a2c,#f1dca8,#a8833e)'],
  ['Gehäusestift (Stahl)', 'linear-gradient(90deg,#6d727a,#e3e6ea,#80858d)'],
  ['Feder', '#c8ccd2'],
  ['Scherlinie', '#ffe2a8'],
]

function listPins(numbers) {
  if (numbers.length === 1) return `Stift ${numbers[0]}`
  return `Stift ${numbers.slice(0, -1).join(', ')} und ${numbers.at(-1)}`
}

export default function LockExplainer({ className = 'bg-cream-50' }) {
  const links = useLinks()
  const refs = useRef(createRefs(1))
  const sectionRef = useRef(null)
  const touched = useRef(false)
  const [keyType, setKeyType] = useState('right')
  const [insert, setInsert] = useState(0)
  const [turn, setTurn] = useState(null) // null | 'open' | 'blocked'

  const profile = KEYS[keyType].profile
  const keyX = KEY_START + ((KEY_HOME - KEY_START) * insert) / 100

  // Zeichnen bei jeder Änderung (direkt am SVG, ohne Neuaufbau)
  const [pinInfo, setPinInfo] = useState(() => ({ misaligned: [1, 2, 3, 4, 5] }))
  useEffect(() => {
    refs.current.blade.forEach((el) => el?.setAttribute('d', bladePath(profile)))
    const result = drawCylinder(refs.current, { keyX, profile })
    const misaligned = result.map((s, i) => (s.aligned ? null : i + 1)).filter(Boolean)
    setPinInfo({ misaligned })
  }, [keyX, profile])

  // Einmal vorführen, sobald der Bereich ins Bild kommt – solange niemand selbst probiert.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || touched.current) return
        observer.disconnect()
        const start = performance.now()
        const step = (now) => {
          if (touched.current) return
          const t = Math.min(1, (now - start) / 1800)
          setInsert(Math.round(100 * (1 - (1 - t) ** 3)))
          if (t < 1) raf = requestAnimationFrame(step)
          else window.setTimeout(() => !touched.current && setTurn('open'), 350)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.55 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const interact = () => {
    touched.current = true
    setTurn(null)
  }

  const fullyIn = insert === 100
  const aligned = fullyIn && pinInfo.misaligned.length === 0

  let status
  if (turn === 'open') {
    status = {
      tone: 'open',
      title: 'Geöffnet',
      text: 'Alle Trennfugen liegen auf der Scherlinie, deshalb dreht sich der Kern – das Schloss öffnet.',
    }
  } else if (turn === 'blocked') {
    status = {
      tone: 'blocked',
      title: 'Blockiert',
      text: fullyIn
        ? `${listPins(pinInfo.misaligned)} ${pinInfo.misaligned.length > 1 ? 'liegen' : 'liegt'} nicht auf der Scherlinie. Ein Stift sperrt den Kern – er lässt sich nicht drehen.`
        : 'Der Schlüssel steckt noch nicht ganz. Solange ein Stift die Scherlinie kreuzt, dreht sich nichts.',
    }
  } else if (insert < 4) {
    status = {
      tone: 'idle',
      title: 'Verriegelt',
      text: 'Ohne Schlüssel drücken die Federn alle Stifte nach unten. Die Gehäusestifte ragen in den Kern und sperren ihn.',
    }
  } else if (!fullyIn) {
    status = {
      tone: 'idle',
      title: 'Schlüssel wird eingeführt',
      text: 'Die Zacken heben die Stifte unterschiedlich weit an. Entscheidend ist die Position, wenn der Schlüssel ganz steckt.',
    }
  } else if (aligned) {
    status = {
      tone: 'ready',
      title: 'Bereit zum Drehen',
      text: 'Alle fünf Trennfugen liegen exakt auf der Scherlinie. Probieren Sie, den Schlüssel zu drehen.',
    }
  } else {
    status = {
      tone: 'blocked',
      title: 'Passt nicht',
      text: `${listPins(pinInfo.misaligned)} ${pinInfo.misaligned.length > 1 ? 'stehen' : 'steht'} zu hoch oder zu tief. Der Schlüssel sieht ähnlich aus – öffnen kann er nicht.`,
    }
  }

  const rootState = [
    turn === 'open' && 'aligned turned',
    turn === 'blocked' && 'show-blocked is-shaking',
    fullyIn && !aligned && 'show-blocked',
  ]
    .filter(Boolean)
    .join(' ')

  const statusIcon = { open: 'check', ready: 'key', blocked: 'info', idle: 'lock' }[status.tone]
  const statusColor = {
    open: 'text-gold-300 ring-gold-400/60 bg-gold-500/15',
    ready: 'text-gold-300 ring-gold-400/40 bg-gold-500/10',
    blocked: 'text-[#f2a395] ring-[#f2a395]/50 bg-[#f2a395]/10',
    idle: 'text-mist ring-white/15 bg-white/5',
  }[status.tone]

  return (
    <section
      id="technik"
      ref={sectionRef}
      aria-labelledby="technik-title"
      className={`py-24 sm:py-28 lg:py-36 ${className}`}
    >
      <div className="container-x">
        <SectionHeading
          id="technik-title"
          eyebrow="Technik verständlich"
          title="So funktioniert Ihr Schließzylinder."
          intro="Im Zylinder sitzen Stiftpaare aus Kern- und Gehäusestift. Nur der passende Schlüssel hebt jedes Paar so weit an, dass die Trennfuge genau auf der Scherlinie liegt. Probieren Sie es selbst aus."
        />

        <div
          className={`grain mt-14 grid overflow-hidden rounded-[2rem] bg-ink-900 text-white shadow-[0_60px_120px_-60px_rgb(15_17_19/0.8)] lg:mt-16 lg:grid-cols-12 lg:rounded-[2.5rem] ${rootState}`}
          data-reveal
        >
          <div className="relative border-b border-white/[0.07] lg:col-span-7 lg:border-r lg:border-b-0">
            <svg
              viewBox="60 296 740 380"
              className="block h-auto w-full"
              role="img"
              aria-label="Schnitt durch einen Profilzylinder mit Schlüssel, Kernstiften, Gehäusestiften und Federn"
            >
              <CylinderDefs p="fx" />
              <CylinderScene refs={refs} p="fx" keyX={KEY_START} arc numbers slabHeight={400} />
            </svg>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 px-6 pb-6 text-[0.78rem] text-mist sm:px-8">
              {LEGEND.map(([label, swatch]) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: swatch }}
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-8 p-6 sm:p-8 lg:col-span-5 lg:p-10">
            <fieldset>
              <legend className="text-[0.7rem] font-semibold tracking-[0.26em] text-gold-400 uppercase">
                Schlüssel wählen
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
                {Object.entries(KEYS).map(([type, key]) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={keyType === type}
                    onClick={() => {
                      interact()
                      setKeyType(type)
                    }}
                    className={`rounded-full px-3 py-2.5 text-[0.82rem] font-semibold transition-colors ${
                      keyType === type ? 'bg-gold-400 text-ink-950' : 'text-mist hover:text-white'
                    }`}
                  >
                    {key.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="key-insert"
                  className="text-[0.7rem] font-semibold tracking-[0.26em] text-gold-400 uppercase"
                >
                  Schlüssel einführen
                </label>
                <span className="text-sm text-mist tabular-nums" aria-hidden="true">
                  {insert} %
                </span>
              </div>
              <input
                id="key-insert"
                type="range"
                min="0"
                max="100"
                step="1"
                value={insert}
                aria-valuetext={`Schlüssel zu ${insert} Prozent eingeführt`}
                onChange={(event) => {
                  interact()
                  setInsert(Number(event.target.value))
                }}
                className="lock-range mt-4 w-full"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                touched.current = true
                setTurn(aligned ? 'open' : 'blocked')
              }}
              className="btn btn-gold w-full"
            >
              <Icon name="key" className="h-4 w-4" strokeWidth={1.8} />
              Schlüssel drehen
            </button>

            <div
              role="status"
              className="flex gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.08]"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${statusColor}`}
              >
                <Icon name={statusIcon} className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-display text-[1.35rem] leading-tight text-white">
                  {status.title}
                </span>
                <span className="mt-1 block text-[0.92rem] leading-relaxed text-mist">
                  {status.text}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div
          className="mt-8 flex flex-col gap-4 rounded-[1.5rem] bg-cream-100 p-6 ring-1 ring-ink-900/[0.06] sm:flex-row sm:items-center sm:justify-between sm:p-7"
          data-reveal
        >
          <p className="max-w-2xl text-[0.98rem] leading-relaxed text-slate">
            <strong className="font-semibold text-ink-900">Mehr Schutz:</strong> Sicherheitszylinder
            bieten zusätzlichen Schutz, etwa gegen Aufbohren oder Manipulation. Welcher zu Ihrer Tür
            passt, klären wir gern mit Ihnen.
          </p>
          <a
            href={links.to('sicherheitstechnik')}
            className="link-arrow shrink-0 text-gold-700 hover:text-ink-900"
          >
            Sicherheitstechnik
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
