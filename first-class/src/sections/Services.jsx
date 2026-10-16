import { services } from '../content.js'
import { useLinks } from '../context.js'
import Icon from '../components/Icon.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ServiceCard from '../components/ServiceCard.jsx'

export default function Services() {
  const links = useLinks()
  return (
    <section
      id="leistungen"
      aria-labelledby="leistungen-title"
      className="bg-cream-100 py-24 sm:py-28 lg:py-36"
    >
      <div className="container-x">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            id="leistungen-title"
            index="01"
            eyebrow="Leistungen"
            title="Alles rund um Tür, Schloss und Sicherheit."
            intro="Von der Türöffnung bis zur durchdachten Sicherheitslösung: Wir hören zu, erklären verständlich und arbeiten sorgfältig – damit Sie sich in Ihrem Zuhause wieder sicher fühlen."
          />
          <a
            href={links.section('kontakt')}
            className="link-arrow shrink-0 text-gold-700 hover:text-ink-900"
            data-reveal
          >
            Beratung anfragen
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
        </div>

        <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-8">
          {services.map((service, index) => (
            <li
              key={service.slug}
              data-reveal
              style={{ '--delay': `${(index % 3) * 110}ms` }}
            >
              <ServiceCard service={service} number={String(index + 1).padStart(2, '0')} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
