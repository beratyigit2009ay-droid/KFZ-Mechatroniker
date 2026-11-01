import { testimonials } from '../content.js'
import Icon from '../components/Icon.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

export default function Testimonials() {
  return (
    <section aria-labelledby="stimmen-title" className="bg-cream-100 py-24 sm:py-28 lg:py-36">
      <div className="container-x">
        <SectionHeading
          id="stimmen-title"
          eyebrow="Kundenstimmen"
          title="Das sagen unsere Kunden."
          intro="Ob Notdienst, Ersatzschlüssel oder Autoschlüssel – ein paar Rückmeldungen unserer Kundinnen und Kunden aus der Region."
        />
        <ul className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-8">
          {testimonials.map((item, index) => (
            <li
              key={item.name}
              data-reveal
              style={{ '--delay': `${index * 110}ms` }}
              className="flex"
            >
              <figure className="flex w-full flex-col rounded-[1.75rem] bg-cream-50 p-8 ring-1 ring-ink-900/[0.06] lg:p-9">
                <Icon name="quote" className="h-8 w-8 text-gold-600" strokeWidth={1.2} />
                <blockquote className="mt-6 flex-1 font-display text-[1.45rem] leading-snug text-ink-900">
                  „{item.quote}“
                </blockquote>
                <figcaption className="mt-8 border-t border-ink-900/10 pt-5">
                  <span className="block text-[0.95rem] font-semibold text-ink-900">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-[0.82rem] text-slate">{item.topic}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
