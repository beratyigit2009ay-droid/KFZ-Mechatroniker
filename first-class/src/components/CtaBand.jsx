import { site } from '../config.js'
import { useLinks } from '../context.js'
import CallButton from './CallButton.jsx'
import Icon from './Icon.jsx'

export default function CtaBand({ topic, className = 'bg-cream-50' }) {
  const links = useLinks()
  return (
    <section aria-labelledby="cta-title" className={`pb-24 lg:pb-32 ${className}`}>
      <div className="container-x">
        <div
          className="grain relative overflow-hidden rounded-[2rem] bg-ink-900 px-6 py-14 text-white sm:px-12 lg:rounded-[2.5rem] lg:px-16 lg:py-20"
          data-reveal
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(196_158_86/0.16),transparent)]"
          />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-gold-400">{site.name} Schlüsseldienst</p>
              <h2
                id="cta-title"
                className="mt-5 font-display text-[2.3rem] leading-[1.05] font-medium sm:text-5xl"
              >
                Wir sind für Sie da. <span className="text-gold-300 italic">Rufen Sie an.</span>
              </h2>
              <p className="mt-5 text-[1.02rem] leading-relaxed text-mist">
                Sie erhalten eine klare Information zu den Kosten, bevor die Arbeit beginnt.
                Einsatzgebiet: <span className="text-white">{site.area}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3.5 sm:flex-row lg:flex-col">
              <CallButton showNumber />
              <a href={links.contact(topic)} className="btn btn-outline-light">
                Rückruf anfragen
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
