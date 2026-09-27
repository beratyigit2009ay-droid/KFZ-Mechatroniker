import * as THREE from 'three';

/** Chaikin-Glättung eines geschlossenen Polygons – ergibt weich gerundete Ecken. */
export function chaikin(points: THREE.Vector2[], iterations = 3): THREE.Vector2[] {
  let p = points;
  for (let k = 0; k < iterations; k++) {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push(new THREE.Vector2(0.75 * a.x + 0.25 * b.x, 0.75 * a.y + 0.25 * b.y));
      out.push(new THREE.Vector2(0.25 * a.x + 0.75 * b.x, 0.25 * a.y + 0.75 * b.y));
    }
    p = out;
  }
  return p;
}

export const polar = (r: number, a: number) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);

export function circlePath(r: number, cx = 0, cy = 0): THREE.Path {
  const path = new THREE.Path();
  path.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return path;
}

/** Regelmäßiges Polygon (z. B. Sechskant) als Pfad. */
export function polygonPath(r: number, sides: number, rotation = 0, cx = 0, cy = 0): THREE.Path {
  const path = new THREE.Path();
  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
}

/**
 * Verschiebt Vertices entlang z abhängig vom Radius (Schüsselung einer Felge)
 * und korrigiert die Normalen analytisch.
 */
export function dishGeometry(geometry: THREE.BufferGeometry, depth: number, radius: number, power = 1.6) {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const nor = geometry.attributes.normal as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.hypot(x, y);
    const t = Math.min(r / radius, 1);
    const f = -depth * (1 - Math.pow(t, power));
    pos.setZ(i, pos.getZ(i) + f);
    if (nor && r > 1e-5) {
      const dfdr = (depth * power * Math.pow(t, power - 1)) / radius;
      const fx = (dfdr * x) / r;
      const fy = (dfdr * y) / r;
      n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
      n.set(n.x - fx * n.z, n.y - fy * n.z, n.z).normalize();
      nor.setXYZ(i, n.x, n.y, n.z);
    }
  }
  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  geometry.computeBoundingSphere();
}

/** Deterministischer Zufall für reproduzierbare Renderings. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
