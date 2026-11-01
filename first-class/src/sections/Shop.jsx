import { site, telHref } from '../config.js'
import { shopServices } from '../content.js'
import { useLinks } from '../context.js'
import { hasPhoto } from '../images.js'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

/** Ladengeschäft im City Center Gersthofen mit weiteren Leistungen. */
export default function Shop() {
  const links = useLinks()
  return (
    <section
      id="laden"
      aria-labelledby="laden-title"
      className="bg-cream-50 py-24 sm:py-28 lg:py-36"
    >
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <SectionHeading
            id="laden-title"
            eyebrow="Ladengeschäft"
            title={`Besuchen Sie uns im ${site.shop}.`}
            intro="Schlüssel und Schlösser vieler namhafter Hersteller, Ersatzschlüssel zum Mitnehmen – und dazu einige praktische Leistungen rund um den Alltag."
          />
          <div
            className="grain mt-10 overflow-hidden rounded-[1.75rem] bg-ink-900 p-7 text-white sm:p-8"
            data-reveal
          >
            <ul className="space-y-5 text-[0.95rem]">
              <li className="flex items-start gap-4">
                <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span>
                  {site.shop}
                  <span className="block text-mist">
                    {site.postalCode} {site.locality}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <span>
                  Mo–Fr 09:00–19:00 Uhr
                  <span className="block">Sa 09:00–18:00 Uhr</span>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <Icon name="phone" className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                <a href={telHref(site.phoneShop)} className="transition-colors hover:text-gold-300">
                  {site.phoneShop}
                </a>
              </li>
            </ul>
            <a href={links.to('schluessel')} className="btn btn-outline-light btn-sm mt-8">
              Schlüssel nachmachen
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 lg:pt-4">
          {hasPhoto('shop') && (
            <figure className="relative mb-4" data-reveal>
              <Photo
                name="shop"
                sizes="(min-width: 1024px) 54vw, 92vw"
                className="aspect-[16/9] rounded-[1.5rem] shadow-[0_40px_80px_-50px_rgb(15_17_19/0.7)]"
              />
              <figcaption className="absolute bottom-4 left-4 rounded-full bg-ink-950/70 px-3 py-1.5 text-[0.66rem] font-semibold tracking-[0.2em] text-cream-100 uppercase backdrop-blur-md">
                Symbolbild
              </figcaption>
            </figure>
          )}
          <ul className="grid content-start gap-4 sm:grid-cols-2">
            {shopServices.map((item, index) => (
              <li
                key={item.title}
                data-reveal
                style={{ '--delay': `${index * 90}ms` }}
                className="rounded-[1.5rem] bg-cream-100 p-7 ring-1 ring-ink-900/[0.06]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-gold-300">
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-6 font-display text-[1.6rem] leading-tight text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-slate">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
