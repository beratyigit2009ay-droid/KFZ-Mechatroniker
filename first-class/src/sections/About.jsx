import { site, telHref } from '../config.js'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'

const pillars = [
  {
    icon: 'consult',
    title: 'Experten',
    text: 'Wir beraten Sie kompetent zu Schließanlagen und zur Absicherung Ihres Objekts – vom Zimmerschlüssel bis zum Sicherheitsschloss.',
  },
  {
    icon: 'key',
    title: 'Persönlich',
    text: `In unserem Ladengeschäft im ${site.shop} finden Sie Schlüssel und Schlösser vieler namhafter Hersteller – bis zu einbruchhemmenden Sicherungssystemen.`,
  },
  {
    icon: 'care',
    title: 'Erfahren',
    text: 'Unser Team besteht aus langjährigen Profis rund um Notdienst, Schlüssel und Schließanlagen. Wir bilden uns regelmäßig weiter.',
  },
]

export default function About() {
  return (
    <section
      id="ueber-uns"
      aria-labelledby="ueber-uns-title"
      className="relative overflow-hidden bg-cream-100 py-24 sm:py-28 lg:py-36"
    >
      <div className="container-x grid items-center gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="relative lg:col-span-5" data-reveal>
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 -translate-x-4 translate-y-4 rounded-[2rem] border border-gold-600/40 sm:-translate-x-6 sm:translate-y-6"
            />
            <Photo
              name="about"
              className="relative aspect-[4/5] rounded-[2rem] shadow-[0_50px_90px_-50px_rgb(15_17_19/0.7)]"
            />
            <div className="absolute -right-3 -bottom-10 max-w-[17rem] rounded-2xl bg-ink-900 p-6 text-white shadow-[0_30px_60px_-30px_rgb(15_17_19/0.8)] sm:-right-8">
              <p className="text-[0.68rem] font-semibold tracking-[0.26em] text-gold-400 uppercase">
                Wir betreuen
              </p>
              <p className="mt-3 font-display text-[1.45rem] leading-snug">
                Privatpersonen, Firmen und Hausverwaltungen.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div data-reveal style={{ '--delay': '120ms' }}>
            <p className="eyebrow text-gold-700">Über uns</p>
            <h2
              id="ueber-uns-title"
              className="mt-5 font-display text-[2.4rem] leading-[1.05] font-medium text-ink-900 sm:text-5xl lg:text-[3.5rem]"
            >
              {site.name} – Ihr Ansprechpartner für{' '}
              <span className="text-gold-700 italic">Tür und Sicherheit.</span>
            </h2>
            <p className="mt-8 max-w-2xl text-[1.03rem] leading-relaxed text-slate">
              Als Schlüsseldienst für {site.area} sind wir rund um die Uhr für Sie da – und mit
              unserem Ladengeschäft im {site.shop} auch persönlich vor Ort. Wer vor einer
              verschlossenen Tür steht, braucht jemanden, auf den Verlass ist. Genau das ist unser
              Anspruch.
            </p>
          </div>

          <ul
            className="mt-12 grid gap-8 border-t border-ink-900/10 pt-10 sm:grid-cols-3"
            data-reveal
          >
            {pillars.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} className="h-6 w-6 text-gold-700" />
                <h3 className="mt-4 font-display text-[1.5rem] leading-tight text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.93rem] leading-relaxed text-slate">{item.text}</p>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center" data-reveal>
            <a href="#kontakt" className="btn btn-outline-dark">
              Kontakt aufnehmen
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
            <a
              href={telHref()}
              className="inline-flex items-center gap-3 px-2 text-[0.95rem] font-semibold text-ink-900 transition-colors hover:text-gold-700"
            >
              <Icon name="phone" className="h-4 w-4 text-gold-700" />
              {site.phone}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
