import { useLinks } from '../context.js'
import Icon from './Icon.jsx'
import Photo from './Photo.jsx'

export default function ServiceCard({ service, number }) {
  const links = useLinks()
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-cream-50 shadow-[0_1px_0_rgb(15_17_19/0.04),0_34px_60px_-42px_rgb(15_17_19/0.45)] ring-1 ring-ink-900/[0.07] transition-[transform,box-shadow] duration-500 ease-[var(--ease-soft)] hover:-translate-y-1.5 hover:shadow-[0_1px_0_rgb(15_17_19/0.04),0_50px_80px_-44px_rgb(15_17_19/0.6)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Photo
          name={service.image}
          className="h-full w-full"
          imgClassName="transition-transform duration-[1400ms] ease-[var(--ease-soft)] group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink-950/55 via-ink-950/0 to-ink-950/15" />
        <span className="absolute top-5 left-5 flex h-12 w-12 items-center justify-center rounded-full bg-ink-950/70 text-gold-300 ring-1 ring-gold-400/40 backdrop-blur-md">
          <Icon name={service.icon} className="h-5 w-5" />
        </span>
        {number && (
          <span
            aria-hidden="true"
            className="absolute right-6 bottom-3 font-display text-[3.2rem] leading-none text-white/90 italic"
          >
            {number}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-7 pt-7 pb-8 lg:px-8">
        <h3 className="font-display text-[1.95rem] leading-tight font-medium text-ink-900">
          {service.title}
        </h3>
        <p className="mt-3 text-[0.98rem] leading-relaxed text-slate">{service.teaser}</p>
        <div className="mt-auto pt-8">
          <a
            href={links.to(service.slug)}
            className="link-arrow rounded-full border border-ink-900/15 px-5 py-3 text-ink-900 transition-colors duration-300 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-gold-300 after:absolute after:inset-0 after:content-['']"
          >
            Mehr erfahren
            <span className="sr-only"> über {service.title}</span>
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-linear-to-r from-gold-300 via-gold-500 to-gold-600 transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-x-100"
      />
    </article>
  )
}
