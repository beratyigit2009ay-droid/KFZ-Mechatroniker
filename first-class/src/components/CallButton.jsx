import { site, telHref } from '../config.js'
import Icon from './Icon.jsx'

/** Jeder Anrufbutton der Website nutzt diese Komponente und damit dieselbe Nummer. */
export default function CallButton({ size, className = '', label = 'Jetzt anrufen', showNumber }) {
  return (
    <a
      href={telHref()}
      className={`btn btn-gold ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
      aria-label={`${label}: ${site.phone}`}
    >
      <Icon name="phone" className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.8} />
      {showNumber ? (
        <span className="flex flex-col items-start leading-tight">
          <span>{label}</span>
          <span className="text-[0.68rem] font-medium tracking-[0.08em] normal-case opacity-80">
            {site.phone}
          </span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </a>
  )
}
