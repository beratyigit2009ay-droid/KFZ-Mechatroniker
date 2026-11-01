import { facts } from '../content.js'

/** Kennzahlen direkt unter dem Hero. */
export default function Facts() {
  return (
    <section aria-label="FIRST CLASS in Zahlen" className="grain relative bg-ink-900 text-white">
      <div className="container-x">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              data-reveal
              style={{ '--delay': `${index * 90}ms` }}
              className={`py-9 pr-4 sm:py-11 lg:px-8 ${index % 2 === 1 ? 'pl-5 sm:pl-8' : ''} ${
                index > 0 ? 'lg:border-l lg:border-white/[0.08]' : 'lg:pl-0'
              } ${index % 2 === 1 ? 'border-l border-white/[0.08]' : ''} ${
                index > 1 ? 'border-t border-white/[0.08] lg:border-t-0' : ''
              }`}
            >
              <dt className="sr-only">{fact.label}</dt>
              <dd>
                <span className="block font-display text-[2.1rem] leading-none text-gold-300 sm:text-[2.6rem]">
                  {fact.value}
                </span>
                <span className="mt-3 block max-w-[15rem] text-[0.88rem] leading-snug text-mist">
                  {fact.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="hairline" aria-hidden="true" />
    </section>
  )
}
