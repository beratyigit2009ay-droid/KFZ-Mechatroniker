import { site } from '../config.js'
import { heroBenefits } from '../content.js'
import CallButton from '../components/CallButton.jsx'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'

const trust = ['Zuverlässig', 'Professionell', 'Transparent']

export default function Hero() {
  return (
    <section
      id="start"
      aria-labelledby="hero-title"
      className="grain relative overflow-hidden bg-ink-950 text-white"
    >
      {/* Atmosphäre: warmes Licht und feine Architekturlinien */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 right-[-18%] h-[52rem] w-[52rem] rounded-full bg-[radial-gradient(closest-side,rgb(196_158_86/0.17),transparent)]" />
        <div className="absolute bottom-[-30%] left-[-20%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(closest-side,rgb(196_158_86/0.07),transparent)]" />
        <div className="container-x relative h-full">
          <div className="grid h-full grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={`border-l border-white/[0.035] ${i >= 4 ? 'hidden lg:block' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container-x relative grid items-center gap-16 pt-32 pb-24 sm:pt-36 lg:min-h-[min(100svh,980px)] lg:grid-cols-12 lg:gap-10 lg:pt-40 lg:pb-28">
        <div className="lg:col-span-7">
          <p className="eyebrow hero-rise text-gold-400" style={{ '--i': 0 }}>
            Schlüsseldienst & Sicherheitstechnik
          </p>

          <h1
            id="hero-title"
            className="hero-rise mt-7 font-display text-[3.2rem] leading-[0.96] font-medium sm:text-[4.6rem] xl:text-[5.9rem]"
            style={{ '--i': 1 }}
          >
            Ausgesperrt?
            <span className="mt-1 block text-gold-300 italic">Wir sind für Sie da.</span>
          </h1>

          <p
            className="hero-rise mt-8 max-w-xl text-[1.08rem] leading-relaxed text-mist sm:text-lg"
            style={{ '--i': 2 }}
          >
            <strong className="font-semibold text-white">{site.name} Schlüsseldienst</strong> – Ihr
            zuverlässiger Ansprechpartner für Türöffnungen, Schlosswechsel und moderne
            Sicherheitstechnik.
          </p>

          <ul className="hero-rise mt-9 space-y-3.5" style={{ '--i': 3 }}>
            {heroBenefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-4 text-[0.98rem] text-white/90">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-500/45 bg-gold-500/10 text-gold-300">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div
            className="hero-rise mt-11 flex flex-col gap-3.5 sm:flex-row sm:items-center"
            style={{ '--i': 4 }}
          >
            <CallButton showNumber className="sm:min-w-[15.5rem]" />
            <a href="#leistungen" className="btn btn-outline-light">
              Unsere Leistungen
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>

          <ul
            className="hero-fade mt-12 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.62rem] font-semibold tracking-[0.2em] text-smoke uppercase sm:gap-x-5 sm:text-[0.68rem] sm:tracking-[0.32em]"
            style={{ '--i': 6 }}
            aria-label="Unsere Werte"
          >
            {trust.map((word, index) => (
              <li key={word} className="flex items-center gap-3 sm:gap-5">
                {index > 0 && (
                  <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-gold-500/70" />
                )}
                {word}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:col-span-5">
          <div className="relative mx-auto w-full max-w-[29rem] lg:mr-0 lg:ml-auto">
            <div
              aria-hidden="true"
              className="arch hero-fade absolute inset-0 translate-x-4 -translate-y-4 border border-gold-500/40 sm:translate-x-6 sm:-translate-y-6"
              style={{ '--i': 3 }}
            />
            <div className="arch relative overflow-hidden shadow-[0_50px_100px_-40px_rgb(0_0_0/0.9)]">
              <Photo
                name="hero"
                priority
                className="hero-photo aspect-[4/5]"
                sizes="(min-width: 1024px) 34vw, (min-width: 640px) 29rem, 92vw"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink-950/70 via-ink-950/0 to-ink-950/10" />
            </div>

            <div
              className="hero-rise absolute right-4 -bottom-8 left-4 rounded-2xl border border-white/10 bg-ink-900/85 p-5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:right-auto sm:-left-10 sm:w-[19.5rem]"
              style={{ '--i': 5 }}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30">
                  <Icon name="transparency" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-[1.35rem] leading-tight text-white">
                    Kosten vor Arbeitsbeginn
                  </p>
                  <p className="mt-1.5 text-[0.86rem] leading-snug text-mist">
                    Sie wissen vorher, woran Sie sind – erst mit Ihrer Zustimmung legen wir los.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hairline absolute inset-x-0 bottom-0" aria-hidden="true" />
    </section>
  )
}
