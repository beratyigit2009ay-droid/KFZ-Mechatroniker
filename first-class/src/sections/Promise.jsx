import { promises } from '../content.js'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'

const numerals = ['I', 'II', 'III']

export default function Promise() {
  return (
    <section
      aria-labelledby="anspruch-title"
      className="grain relative overflow-hidden bg-ink-900 py-24 text-white sm:py-28 lg:py-36"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <Photo
          name="keys"
          decorative
          className="h-full w-full opacity-[0.13]"
          imgClassName="grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-b from-ink-900 via-ink-900/70 to-ink-900" />
      </div>

      <div className="container-x relative">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7" data-reveal>
            <p className="eyebrow text-gold-400">
              <span className="font-display text-base tracking-normal italic">02</span>
              Unser Anspruch
            </p>
            <h2
              id="anspruch-title"
              className="mt-5 font-display text-[2.5rem] leading-[1.04] font-medium sm:text-5xl lg:text-[4rem]"
            >
              <span className="text-gold-300">FIRST CLASS</span> bedeutet Service mit Anspruch.
            </h2>
          </div>
          <p
            className="text-[1.05rem] leading-relaxed text-mist lg:col-span-5 lg:pb-2"
            data-reveal
            style={{ '--delay': '120ms' }}
          >
            Wer einen Schlüsseldienst ruft, ist oft in einer unangenehmen Lage. Umso wichtiger sind
            klare Absprachen und ein respektvoller Umgang. Diese drei Grundsätze gelten bei jedem
            unserer Einsätze.
          </p>
        </div>

        <div className="hairline mt-16 lg:mt-20" aria-hidden="true" />

        <ol className="grid lg:grid-cols-3">
          {promises.map((item, index) => (
            <li
              key={item.title}
              data-reveal
              style={{ '--delay': `${index * 140}ms` }}
              className={`relative py-12 lg:px-10 lg:py-14 ${
                index > 0 ? 'border-t border-white/[0.08] lg:border-t-0 lg:border-l' : 'lg:pl-0'
              } ${index === 2 ? 'lg:pr-0' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full text-gold-300 ring-1 ring-gold-500/45">
                  <span className="absolute inset-1.5 rounded-full bg-gold-500/[0.09] ring-1 ring-gold-500/15" />
                  <Icon name={item.icon} className="relative h-6 w-6" strokeWidth={1.4} />
                </span>
                <span className="font-display text-2xl text-white/25 italic" aria-hidden="true">
                  {numerals[index]}
                </span>
              </div>
              <h3 className="mt-9 font-display text-[2.1rem] leading-none font-medium text-white">
                {item.title}
              </h3>
              <p className="mt-4 max-w-sm text-[1rem] leading-relaxed text-mist">{item.text}</p>
            </li>
          ))}
        </ol>

        <div className="hairline" aria-hidden="true" />
      </div>
    </section>
  )
}
