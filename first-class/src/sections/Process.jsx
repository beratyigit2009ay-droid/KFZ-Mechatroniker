import { steps } from '../content.js'
import CallButton from '../components/CallButton.jsx'
import Icon from '../components/Icon.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

export default function Process({ index = '03', className = '' }) {
  return (
    <section
      id="ablauf"
      aria-labelledby="ablauf-title"
      className={`bg-cream-50 py-24 sm:py-28 lg:py-36 ${className}`}
    >
      <div className="container-x">
        <SectionHeading
          id="ablauf-title"
          index={index}
          eyebrow="Ablauf der Türöffnung"
          title="In vier klaren Schritten zurück in Ihre Wohnung."
          intro="Damit Sie jederzeit wissen, was passiert: Wir sprechen alles mit Ihnen ab, bevor wir mit der Arbeit beginnen."
          align="center"
        />

        <ol className="relative mx-auto mt-16 grid max-w-xl gap-12 lg:mt-24 lg:max-w-none lg:grid-cols-4 lg:gap-10" data-reveal="group">
          <span
            aria-hidden="true"
            className="process-line absolute top-7 bottom-7 left-7 w-px bg-linear-to-b from-gold-500 via-gold-400 to-gold-500/20 lg:top-7 lg:right-[12.5%] lg:bottom-auto lg:left-[12.5%] lg:h-px lg:w-auto lg:bg-linear-to-r"
          />
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="process-step relative flex gap-7 lg:flex-col lg:items-center lg:gap-0 lg:text-center"
              style={{ '--i': index }}
            >
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream-50 text-gold-700 ring-1 ring-gold-500/60 shadow-[0_0_0_8px_var(--color-cream-50)]">
                <Icon name={step.icon} className="h-[1.35rem] w-[1.35rem]" />
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-[0.65rem] font-semibold text-gold-300 tabular-nums">
                  {index + 1}
                </span>
              </span>
              <div className="pt-1 lg:pt-8">
                <p className="text-[0.68rem] font-semibold tracking-[0.3em] text-gold-700 uppercase">
                  Schritt {index + 1}
                </p>
                <h3 className="mt-2 font-display text-[1.75rem] leading-tight font-medium text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-slate lg:mx-auto lg:max-w-[17rem]">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div
          className="mx-auto mt-20 flex max-w-3xl flex-col items-center gap-6 rounded-[1.75rem] bg-cream-100 px-6 py-8 text-center ring-1 ring-ink-900/[0.06] sm:flex-row sm:justify-between sm:px-10 sm:text-left"
          data-reveal
        >
          <p className="font-display text-[1.6rem] leading-tight text-ink-900">
            Ausgesperrt? <span className="text-slate italic">Wir erklären Ihnen alles Weitere.</span>
          </p>
          <CallButton size="sm" className="shrink-0" />
        </div>
      </div>
    </section>
  )
}
