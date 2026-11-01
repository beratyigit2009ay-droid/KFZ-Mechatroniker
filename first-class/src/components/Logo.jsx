import { logo } from './logo.generated.js'

// Logo-Farben – identisch mit den Dateien in brand/ (scripts/logo.mjs).
const GOLD = '#c49e56'
const ANTHRACITE = '#15171a'
const CREAM = '#f7f2e8'

/** Rundes Siegel mit verziertem Schlüssel. */
function Emblem({ scale }) {
  return (
    <g transform={`scale(${scale})`}>
      <path fill={ANTHRACITE} fillRule="evenodd" d={logo.dark} />
      <path fill={GOLD} fillRule="evenodd" d={logo.gold} />
    </g>
  )
}

export function LogoMark({ className = 'h-12 w-12' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      <Emblem scale={1} />
    </svg>
  )
}

/**
 * Vollständiges Logo: Siegel, „FIRST CLASS“, Goldlinie, „SCHLÜSSELDIENST“.
 * `tone="light"` = für dunkle Flächen (heller Schriftzug).
 */
export default function Logo({ tone = 'light', className = 'h-12 w-auto lg:h-14' }) {
  return (
    <svg
      viewBox={`0 0 ${logo.width} ${logo.height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Emblem scale={logo.emblemScale} />
      <g transform={`translate(${logo.text.x} ${logo.text.y})`}>
        <path fill={tone === 'light' ? CREAM : ANTHRACITE} d={logo.word} />
        <rect fill={GOLD} x="1" y={logo.rule.y} width={logo.rule.w} height={logo.rule.h} />
        <path fill={GOLD} d={logo.sub} />
      </g>
    </svg>
  )
}
