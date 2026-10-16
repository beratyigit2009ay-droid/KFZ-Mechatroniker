import { site, telHref } from '../config.js'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'

const values = [
  { icon: 'consult', title: 'Ehrliche Beratung', text: 'Wir empfehlen nur, was Ihnen wirklich hilft.' },
  { icon: 'care', title: 'Sorgfältige Arbeit', text: 'Respekt vor Ihrer Tür und Ihrem Zuhause.' },
  { icon: 'transparency', title: 'Klare Absprachen', text: 'Vorgehen und Kosten – vor Beginn besprochen.' },
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
              sizes="(min-width: 1024px) 38vw, (min-width: 640px) 28rem, 92vw"
            />
            <div className="absolute -right-3 -bottom-10 max-w-[16.5rem] rounded-2xl bg-ink-900 p-6 text-white shadow-[0_30px_60px_-30px_rgb(15_17_19/0.8)] sm:-right-8">
              <Icon name="key" className="h-6 w-6 text-gold-300" />
              <p className="mt-4 font-display text-[1.45rem] leading-snug">
                „Wir arbeiten so, wie wir es uns selbst von einem Handwerker wünschen würden.“
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div data-reveal style={{ '--delay': '120ms' }}>
            <p className="eyebrow text-gold-700">
              <span className="font-display text-base tracking-normal italic">05</span>
              Über uns
            </p>
            <h2
              id="ueber-uns-title"
              className="mt-5 font-display text-[2.4rem] leading-[1.05] font-medium text-ink-900 sm:text-5xl lg:text-[3.5rem]"
            >
              {site.name} – Ihr Ansprechpartner für{' '}
              <span className="text-gold-700 italic">Tür und Sicherheit.</span>
            </h2>
          </div>

          <div
            className="mt-8 max-w-2xl space-y-5 text-[1.03rem] leading-relaxed text-slate"
            data-reveal
            style={{ '--delay': '200ms' }}
          >
            <p>
              Wer vor einer verschlossenen Tür steht, braucht vor allem eines: jemanden, auf den
              Verlass ist. Genau das ist unser Anspruch. Wir nehmen Ihr Anliegen ernst, hören zu und
              erklären verständlich, was zu tun ist.
            </p>
            <p>
              Wir arbeiten sorgfältig und mit Respekt vor Ihrem Eigentum. Bevor wir beginnen,
              besprechen wir mit Ihnen das Vorgehen und die Kosten. So können Sie in Ruhe
              entscheiden – auch dann, wenn die Situation gerade stressig ist.
            </p>
            <p>
              Ob Türöffnung, Schlosswechsel oder Beratung zu mehr Sicherheit: Unser Ziel ist, dass
              Sie sich nach unserem Besuch gut aufgehoben fühlen – und in Ihrem Zuhause sicher.
            </p>
          </div>

          <ul
            className="mt-12 grid gap-6 border-t border-ink-900/10 pt-10 sm:grid-cols-3"
            data-reveal
            style={{ '--delay': '260ms' }}
          >
            {values.map((value) => (
              <li key={value.title}>
                <Icon name={value.icon} className="h-6 w-6 text-gold-700" />
                <h3 className="mt-4 font-display text-[1.4rem] leading-tight text-ink-900">
                  {value.title}
                </h3>
                <p className="mt-1.5 text-[0.92rem] leading-relaxed text-slate">{value.text}</p>
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
