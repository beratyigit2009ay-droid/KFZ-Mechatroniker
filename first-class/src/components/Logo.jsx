import { logo } from './logo.generated.js'

// Logo-Farben – identisch mit den Dateien in brand/ (scripts/logo.mjs).
const GOLD = '#c49e56'
const ANTHRACITE = '#15171a'
const CREAM = '#f7f2e8'

/** Schild mit Schlüsselloch. `tone="light"` = für dunkle Flächen. */
function Emblem({ tone }) {
  const onDark = tone === 'light'
  return (
    <>
      <path fill={GOLD} fillRule="evenodd" d={logo.frame} />
      <path fill={onDark ? GOLD : ANTHRACITE} fillRule="evenodd" d={logo.inner} />
      {!onDark && <path fill={GOLD} d={logo.keyhole} />}
    </>
  )
}

export function LogoMark({ className = 'h-12 w-auto', tone = 'light' }) {
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true" focusable="false">
      <Emblem tone={tone} />
    </svg>
  )
}

/** Vollständiges Logo: Schild, „FIRST CLASS“, Linie, „SCHLÜSSELDIENST“. */
export default function Logo({ tone = 'light', className = 'h-11 w-auto lg:h-12' }) {
  const onDark = tone === 'light'
  return (
    <svg
      viewBox={`0 0 ${logo.width} ${logo.height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Emblem tone={tone} />
      <path fill={onDark ? CREAM : ANTHRACITE} d={logo.word} />
      <rect fill={GOLD} x={logo.rule.x} y={logo.rule.y} width={logo.rule.w} height={logo.rule.h} />
      <path fill={GOLD} d={logo.sub} />
    </svg>
  )
}
