import { site, telHref } from '../config.js'
import Icon from './Icon.jsx'

/** Fixierter Anrufbutton am unteren Bildschirmrand – nur auf kleineren Geräten. */
export default function MobileCallBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/92 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      <a
        href={telHref()}
        className="btn btn-gold w-full"
        aria-label={`Jetzt anrufen: ${site.phone}`}
      >
        <Icon name="phone" className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} />
        <span>Jetzt anrufen</span>
        <span className="hidden font-medium tracking-[0.06em] normal-case opacity-75 min-[400px]:inline">
          · {site.phone}
        </span>
      </a>
    </div>
  )
}
