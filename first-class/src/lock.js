/**
 * Modell eines Stiftzylinders in der Seitenansicht (SVG-Einheiten).
 * Wird vom Intro und vom interaktiven Zylinder-Erklärer gemeinsam genutzt.
 */
export const SHEAR = 500 // Scherlinie zwischen Kern und Gehäuse
export const PINS = [390, 460, 530, 600, 670] // Mitte der Stiftbohrungen
export const KEY_PIN = [46, 60, 38, 54, 42] // Länge der Kernstifte
export const DRIVER = 44 // Länge der Gehäusestifte
export const REST = 598 // Stiftspitze ohne Schlüssel
export const SPRING_TOP = 352
export const RIDGE = 534 // Oberkante des Schlüsselbarts
export const BLADE_BOTTOM = 602
export const KEY_HOME = 300 // Schlüsselschulter liegt an der Türfläche an
export const KEY_OUT = -820 // Schlüssel vollständig außerhalb

/** Einschnitttiefen des passenden Schlüssels: jede Trennfuge landet auf der Scherlinie. */
export const RIGHT_CUTS = KEY_PIN.map((len) => SHEAR + len)
/** Ein ähnlicher, aber falscher Schlüssel: Stift 2 zu hoch, Stift 4 zu tief. */
export const WRONG_CUTS = [546, 548, 538, 566, 542]

export function buildProfile(cuts) {
  const points = [[0, RIDGE]]
  PINS.forEach((x, i) => {
    const u = x - KEY_HOME
    const y = cuts[i]
    const h = y - RIDGE
    points.push([u - 9 - h, RIDGE], [u - 9, y], [u + 9, y], [u + 9 + h, RIDGE])
  })
  points.push([418, RIDGE], [442, 570])
  return points
}

export function bladePath(profile) {
  return `M${profile.map(([u, y]) => `${u} ${y}`).join('L')}L430 ${BLADE_BOTTOM}L0 ${BLADE_BOTTOM}Z`
}

function profileAt(profile, u) {
  if (u < 0 || u > 442) return Infinity
  for (let i = 1; i < profile.length; i++) {
    const [u0, y0] = profile[i - 1]
    const [u1, y1] = profile[i]
    if (u <= u1) return u1 === u0 ? y1 : y0 + ((y1 - y0) * (u - u0)) / (u1 - u0)
  }
  return Infinity
}

/** Höhe der Stiftspitze: Der Stift liegt auf der höchsten Stelle des Barts unter ihm. */
export function pinTip(profile, x, keyX) {
  const u = x - keyX
  return Math.min(REST, profileAt(profile, u - 7), profileAt(profile, u), profileAt(profile, u + 7))
}

/** Status aller Stiftpaare: Liegt die Trennfuge genau auf der Scherlinie? */
export function pinStates(profile, keyX) {
  return PINS.map((x, i) => {
    const top = pinTip(profile, x, keyX) - KEY_PIN[i]
    return { top, aligned: Math.abs(top - SHEAR) < 0.6 }
  })
}

export function springPath(x, top, bottom) {
  const turns = 10
  let d = `M${x} ${top}`
  for (let k = 1; k < turns; k++) {
    const y = top + ((bottom - top) * k) / turns
    d += `L${x + (k % 2 ? 9 : -9)} ${y.toFixed(1)}`
  }
  return `${d}L${x} ${bottom.toFixed(1)}`
}

export function keyPinPath(x, len) {
  return `M${x - 12} 0H${x + 12}V${len - 9}Q${x + 12} ${len} ${x} ${len}Q${x - 12} ${len} ${x - 12} ${len - 9}Z`
}

/**
 * Zeichnet den Zustand direkt in die SVG-Elemente (ohne React-Rendering),
 * damit Animationen und Schieberegler flüssig laufen.
 */
export function drawCylinder(refs, { keyX, profile, xray = 1 }) {
  const each = (list, fn) => list.forEach((el) => el && fn(el))
  each(refs.key, (el) => el.setAttribute('transform', `translate(${keyX.toFixed(2)} 0)`))
  if (refs.cover.length) {
    const coverTop = 330 + 310 * xray
    each(refs.cover, (el) => {
      el.setAttribute('y', coverTop.toFixed(1))
      el.setAttribute('height', Math.max(0, 640 - coverTop).toFixed(1))
    })
    each(refs.scan, (el) => {
      el.setAttribute('y', (coverTop - 30).toFixed(1))
      el.setAttribute('opacity', xray > 0 && xray < 1 ? '1' : '0')
    })
  }
  const states = pinStates(profile, keyX)
  states.forEach(({ top, aligned }, i) => {
    const driverTop = top - DRIVER
    refs.copies.forEach((copy) => {
      copy.keyPins[i]?.setAttribute('transform', `translate(0 ${top.toFixed(2)})`)
      copy.drivers[i]?.setAttribute('transform', `translate(0 ${driverTop.toFixed(2)})`)
      copy.springs[i]?.setAttribute('d', springPath(PINS[i], SPRING_TOP, driverTop))
      copy.pins[i]?.classList.toggle('is-aligned', aligned)
    })
  })
  return states
}

export function createRefs(copies = 1) {
  return {
    key: [],
    blade: [],
    cover: [],
    scan: [],
    copies: Array.from({ length: copies }, () => ({
      keyPins: [],
      drivers: [],
      springs: [],
      pins: [],
    })),
  }
}
