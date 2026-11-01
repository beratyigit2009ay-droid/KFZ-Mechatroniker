import {
  DRIVER,
  KEY_HOME,
  KEY_OUT,
  KEY_PIN,
  PINS,
  REST,
  RIGHT_CUTS,
  SHEAR,
  SPRING_TOP,
  bladePath,
  buildProfile,
  keyPinPath,
  springPath,
} from '../lock.js'

/** Farbverläufe und Muster; `p` macht die IDs eindeutig, wenn mehrere Szenen existieren. */
export function CylinderDefs({ p }) {
  return (
    <defs>
      <pattern
        id={`${p}-hatch-a`}
        width="9"
        height="9"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="9" height="9" fill="#1d2024" />
        <path d="M0 0V9" stroke="#c49e56" strokeOpacity=".28" strokeWidth="1.2" />
      </pattern>
      <pattern
        id={`${p}-hatch-b`}
        width="9"
        height="9"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <rect width="9" height="9" fill="#25282d" />
        <path d="M0 0V9" stroke="#c49e56" strokeOpacity=".2" strokeWidth="1.2" />
      </pattern>
      <pattern id={`${p}-wood`} width="60" height="14" patternUnits="userSpaceOnUse">
        <rect width="60" height="14" fill="#15171a" />
        <path d="M0 7Q15 4 30 7T60 7" fill="none" stroke="#c49e56" strokeOpacity=".07" />
      </pattern>
      <linearGradient id={`${p}-brass`} x1="0" x2="1">
        <stop offset="0" stopColor="#7d5f27" />
        <stop offset=".45" stopColor="#f1dca8" />
        <stop offset="1" stopColor="#9c7a37" />
      </linearGradient>
      <linearGradient id={`${p}-steel`} x1="0" x2="1">
        <stop offset="0" stopColor="#5f646b" />
        <stop offset=".45" stopColor="#e6e9ec" />
        <stop offset="1" stopColor="#7b8088" />
      </linearGradient>
      <linearGradient id={`${p}-key`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f6ebcf" />
        <stop offset=".5" stopColor="#d5b475" />
        <stop offset="1" stopColor="#8a6a2c" />
      </linearGradient>
      <linearGradient id={`${p}-plate`} x1="0" x2="1">
        <stop offset="0" stopColor="#8a6a2c" />
        <stop offset=".5" stopColor="#e5cc96" />
        <stop offset="1" stopColor="#a8833e" />
      </linearGradient>
      <linearGradient id={`${p}-scan`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffe2a8" stopOpacity="0" />
        <stop offset="1" stopColor="#ffe2a8" stopOpacity=".55" />
      </linearGradient>
      <filter id={`${p}-glow`} x="-20%" y="-400%" width="140%" height="900%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
    </defs>
  )
}

const LABELS = [
  { text: 'TÜRBLATT', at: [296, 318], to: [262, 318], side: 'left' },
  { text: 'GEHÄUSE', at: [332, 372], to: [262, 372], side: 'left' },
  { text: 'ZYLINDERKERN', at: [356, 600], to: [262, 668], side: 'left' },
  { text: 'FEDER · EDELSTAHL', at: [679, 392], to: [790, 372], side: 'right' },
  { text: 'GEHÄUSESTIFT · STAHL', at: [682, 474], to: [790, 432], side: 'right' },
  { text: 'SCHERLINIE', at: [764, 500], to: [790, 500], side: 'right' },
  { text: 'KERNSTIFT · MESSING', at: [682, 522], to: [790, 562], side: 'right' },
  { text: 'SCHLÜSSEL', at: [722, 590], to: [790, 628], side: 'right' },
]

const INITIAL_BLADE = bladePath(buildProfile(RIGHT_CUTS))

/**
 * Profilzylinder im Schnitt. Die beweglichen Teile werden über `refs`
 * registriert und von `drawCylinder()` aus lock.js bewegt.
 */
export default function CylinderScene({
  refs,
  copy = 0,
  p,
  keyX = KEY_OUT,
  cover = false,
  labels = false,
  arc = false,
  numbers = false,
  slabHeight = 2200,
}) {
  const one = (name) => (el) => {
    refs.current[name][copy] = el
  }
  const pinRef = (name, i) => (el) => {
    refs.current.copies[copy][name][i] = el
  }

  return (
    <>
      {/* Türblatt im Schnitt */}
      <rect
        x="296"
        y={500 - slabHeight / 2}
        width="468"
        height={slabHeight}
        fill={`url(#${p}-wood)`}
      />
      <path
        d={`M296 ${500 - slabHeight / 2}V${500 + slabHeight / 2}M764 ${500 - slabHeight / 2}V${500 + slabHeight / 2}`}
        stroke="#c49e56"
        strokeOpacity=".55"
        strokeWidth="1.5"
      />

      {/* Gehäuse, Kern, Schlüsselkanal und Bohrungen */}
      <rect x="300" y="340" width="460" height="160" fill={`url(#${p}-hatch-a)`} />
      <rect x="300" y="500" width="460" height="128" fill={`url(#${p}-hatch-a)`} />
      <rect
        className="cyl-plug"
        x="304"
        y="500"
        width="456"
        height="112"
        rx="4"
        fill={`url(#${p}-hatch-b)`}
      />
      <rect x="300" y="530" width="460" height="75" fill="#08090a" />
      {PINS.map((x) => (
        <rect key={x} x={x - 14} y="350" width="28" height="182" fill="#08090a" />
      ))}
      <rect
        x="300"
        y="340"
        width="460"
        height="288"
        fill="none"
        stroke="#c49e56"
        strokeOpacity=".7"
        strokeWidth="1.5"
      />

      {/* Federn, Gehäusestifte, Kernstifte */}
      {PINS.map((x, i) => {
        const top = REST - KEY_PIN[i]
        return (
          <g key={x} ref={pinRef('pins', i)} className="cyl-pin">
            <path
              ref={pinRef('springs', i)}
              d={springPath(x, SPRING_TOP, top - DRIVER)}
              fill="none"
              stroke="#c8ccd2"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <g ref={pinRef('drivers', i)} transform={`translate(0 ${top - DRIVER})`}>
              <rect
                className="cyl-driver"
                x={x - 12}
                y="0"
                width="24"
                height={DRIVER - 1}
                rx="3"
                fill={`url(#${p}-steel)`}
              />
            </g>
            <g ref={pinRef('keyPins', i)} transform={`translate(0 ${top})`}>
              <path
                className="cyl-keypin"
                d={keyPinPath(x, KEY_PIN[i])}
                fill={`url(#${p}-brass)`}
              />
            </g>
          </g>
        )
      })}

      {/* Scherlinie */}
      <path d={`M300 ${SHEAR}H760`} stroke="#e5cc96" strokeOpacity=".4" strokeDasharray="7 6" />
      <path
        className="cyl-shear-glow"
        d={`M300 ${SHEAR}H760`}
        stroke="#ffe2a8"
        strokeWidth="6"
        filter={`url(#${p}-glow)`}
      />
      <path className="cyl-shear-glow" d={`M300 ${SHEAR}H760`} stroke="#fff3d6" strokeWidth="1.6" />

      {/* Röntgen-Abdeckung: Tür zunächst geschlossen */}
      {cover && (
        <g>
          <rect
            ref={one('cover')}
            x="300"
            y="330"
            width="460"
            height="310"
            fill={`url(#${p}-wood)`}
          />
          <rect
            ref={one('scan')}
            x="300"
            y="300"
            width="460"
            height="30"
            fill={`url(#${p}-scan)`}
            opacity="0"
          />
        </g>
      )}

      {/* Beschläge innen und außen */}
      <rect
        x="764"
        y="380"
        width="12"
        height="240"
        rx="5"
        fill={`url(#${p}-plate)`}
        opacity=".85"
      />
      <path d="M278 316Q278 300 290 300H296V700H290Q278 700 278 684Z" fill={`url(#${p}-plate)`} />
      <rect x="278" y="530" width="18" height="75" fill="#08090a" />

      {/* Stiftnummern */}
      {numbers &&
        PINS.map((x, i) => (
          <text
            key={x}
            x={x}
            y="330"
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill="#e5cc96"
            fontFamily="'Manrope Variable', system-ui, sans-serif"
          >
            {i + 1}
          </text>
        ))}

      {/* Schlüssel */}
      <g className="cyl-key-wrap">
        <g ref={one('key')} transform={`translate(${keyX} 0)`}>
          <path ref={one('blade')} d={INITIAL_BLADE} fill={`url(#${p}-key)`} />
          <path d="M14 582H410" stroke="#000" strokeOpacity=".28" strokeWidth="2" />
          <rect x="-18" y="520" width="18" height="96" rx="3" fill={`url(#${p}-key)`} />
          <rect x="-44" y="548" width="28" height="40" fill={`url(#${p}-key)`} />
          <path
            fillRule="evenodd"
            fill={`url(#${p}-key)`}
            d="M-182 568a72 72 0 1 0 144 0a72 72 0 1 0-144 0ZM-132 568a22 22 0 1 0 44 0a22 22 0 1 0-44 0Z"
          />
          <circle cx="-110" cy="568" r="50" fill="none" stroke="#000" strokeOpacity=".16" />
        </g>
      </g>

      {/* Drehbewegung: Pfeil um die Schlüsselreide, Impuls am Schlüsselkanal */}
      {arc && (
        <g className="cyl-turn" fill="none" stroke="#ffe2a8" strokeLinecap="round">
          <path
            className="cyl-turn-arc"
            d={`M${KEY_HOME - 110 - 92} 568A92 92 0 0 1 ${KEY_HOME - 110} 476`}
            strokeWidth="3"
            pathLength="1"
          />
          <path
            className="cyl-turn-head"
            d={`M${KEY_HOME - 122} 466L${KEY_HOME - 108} 476L${KEY_HOME - 122} 488`}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle className="cyl-pulse" cx="300" cy="566" r="14" strokeWidth="2" />
        </g>
      )}

      {/* Beschriftungen */}
      {labels &&
        LABELS.map((l, i) => {
          const [x1, y1] = l.at
          const [x2, y2] = l.to
          const right = l.side === 'right'
          return (
            <g key={l.text} className="cyl-label" style={{ '--d': `${i * 120}ms` }}>
              <circle cx={x1} cy={y1} r="3.2" fill="#ffe2a8" />
              <path
                d={`M${x1} ${y1}L${x2} ${y2}H${right ? x2 + 8 : x2 - 8}`}
                fill="none"
                stroke="#e5cc96"
                strokeOpacity=".75"
              />
              <text
                x={right ? x2 + 14 : x2 - 14}
                y={y2 + 3.6}
                textAnchor={right ? 'start' : 'end'}
                fontSize="10.5"
                letterSpacing="2.6"
                fill="#f1e4c4"
                fontFamily="'Manrope Variable', system-ui, sans-serif"
                fontWeight="600"
              >
                {l.text}
              </text>
            </g>
          )
        })}
    </>
  )
}
