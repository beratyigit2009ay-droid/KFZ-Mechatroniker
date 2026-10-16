import { site, telHref } from '../config.js'
import { costFactors } from '../content.js'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'
import { requestContactPrefill } from '../prefill.js'

export default function Pricing() {
  return (
    <section id="preise" aria-labelledby="preise-title" className="bg-cream-50 pb-24 sm:pb-28 lg:pb-36">
      <div className="container-x">
        <div
          className="grain relative overflow-hidden rounded-[2rem] bg-ink-900 text-white shadow-[0_60px_120px_-60px_rgb(15_17_19/0.8)] lg:rounded-[2.5rem]"
          data-reveal
        >
          <div className="grid lg:grid-cols-12">
            <div className="relative min-h-[18rem] lg:col-span-5 lg:min-h-full">
              <Photo
                name="entranceNight"
                className="absolute inset-0 h-full w-full"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink-900 via-ink-900/30 to-transparent lg:bg-linear-to-r lg:from-transparent lg:via-ink-900/20 lg:to-ink-900" />
            </div>

            <div className="relative px-6 py-14 sm:px-12 lg:col-span-7 lg:py-20 lg:pr-16 lg:pl-6 xl:pl-10">
              <p className="eyebrow text-gold-400">
                <span className="font-display text-base tracking-normal italic">04</span>
                Preise & Transparenz
              </p>
              <h2
                id="preise-title"
                className="mt-5 font-display text-[2.4rem] leading-[1.04] font-medium sm:text-5xl lg:text-[3.4rem]"
              >
                Klare Preise.
                <span className="block text-gold-300 italic">Keine bösen Überraschungen.</span>
              </h2>
              <p className="mt-6 max-w-xl text-[1.03rem] leading-relaxed text-mist">
                Jeder Einsatz ist anders. Deshalb nennen wir keine Pauschalpreise, die am Ende nicht
                stimmen. Die Kosten können insbesondere von diesen Faktoren abhängen:
              </p>

              <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {costFactors.map((factor) => (
                  <li key={factor.title} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/40">
                      <Icon name={factor.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-[1.4rem] leading-tight text-white">
                        {factor.title}
                      </h3>
                      <p className="mt-1.5 text-[0.92rem] leading-relaxed text-mist">{factor.text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-11 rounded-2xl border border-gold-500/30 bg-gold-500/[0.07] p-6 sm:p-7">
                <p className="flex items-start gap-4">
                  <Icon name="shield" className="mt-0.5 h-6 w-6 shrink-0 text-gold-300" />
                  <span className="text-[1rem] leading-relaxed text-white/90">
                    <strong className="font-semibold text-gold-200">Unser Versprechen:</strong> Bevor
                    wir mit der Arbeit beginnen, informieren wir Sie über die vereinbarten Kosten.
                    Erst mit Ihrer Zustimmung legen wir los.
                  </span>
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
                <a
                  href="#kontakt"
                  className="btn btn-gold"
                  onClick={() => requestContactPrefill('preis')}
                >
                  Preis anfragen
                  <Icon name="arrowRight" className="h-4 w-4" />
                </a>
                <a
                  href={telHref()}
                  className="group inline-flex items-center gap-3 text-[0.95rem] text-mist transition-colors hover:text-gold-300"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-white/15 transition group-hover:ring-gold-400">
                    <Icon name="phone" className="h-4 w-4" />
                  </span>
                  <span>
                    oder direkt anrufen:{' '}
                    <span className="font-semibold text-white group-hover:text-gold-300">
                      {site.phone}
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
