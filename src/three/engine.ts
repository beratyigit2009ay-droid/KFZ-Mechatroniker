import * as THREE from 'three';
import type { MaterialSet } from './materials';
import { circlePath } from './util';

const PISTON_R = 0.39;
const PIN_Y = 0.22;
const ROD_LENGTH = 1.12;

function pistonGeometry(): THREE.LatheGeometry {
  const raw: [number, number][] = [
    // Innenseite (von unten sichtbar)
    [0.0, 0.3],
    [0.3, 0.3],
    [0.34, 0.24],
    [0.34, 0.02],
    [0.37, 0.0],
    [0.386, 0.02],
    [0.388, 0.34],
    // Ölabstreifring-Nut
    [0.39, 0.37],
    [0.358, 0.372],
    [0.358, 0.396],
    [0.39, 0.398],
    // Verdichtungsring-Nuten
    [0.39, 0.432],
    [0.36, 0.434],
    [0.36, 0.447],
    [0.39, 0.449],
    [0.39, 0.478],
    [0.36, 0.48],
    [0.36, 0.493],
    [0.39, 0.495],
    [0.39, 0.53],
    [0.383, 0.545],
    [0.36, 0.553],
    [0.2, 0.562],
    [0.0, 0.566],
  ];
  return new THREE.LatheGeometry(
    raw.map(([r, y]) => new THREE.Vector2(r, y)),
    128,
  );
}

function ringGeometry(y: number, h: number): THREE.LatheGeometry {
  const raw: [number, number][] = [
    [0.362, y],
    [0.392, y + 0.001],
    [0.392, y + h - 0.001],
    [0.362, y + h],
  ];
  return new THREE.LatheGeometry(
    raw.map(([r, yy]) => new THREE.Vector2(r, yy)),
    128,
  );
}

function conrodGeometry(): THREE.ExtrudeGeometry {
  const rSmall = 0.13;
  const rBig = 0.27;
  const big = new THREE.Vector2(0, -ROD_LENGTH);
  const wTop = 0.07;
  const wBottom = 0.13;
  const pts: THREE.Vector2[] = [];
  // Pleuelauge oben
  const aT = Math.asin(wTop / rSmall);
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + aT + ((Math.PI * 2 - 2 * aT) * i) / 24;
    pts.push(new THREE.Vector2(Math.cos(a) * rSmall, Math.sin(a) * rSmall));
  }
  // Schaft links nach unten (leicht tailliert)
  const yTop = -Math.cos(aT) * rSmall;
  const aB = Math.asin(wBottom / rBig);
  const yBot = big.y + Math.cos(aB) * rBig;
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const y = THREE.MathUtils.lerp(yTop, yBot, t);
    const w = THREE.MathUtils.lerp(wTop, wBottom, t * t);
    pts.push(new THREE.Vector2(-w, y));
  }
  // großes Pleuelauge unten
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI / 2 + aB + ((Math.PI * 2 - 2 * aB) * i) / 32;
    pts.push(new THREE.Vector2(big.x + Math.cos(a) * rBig, big.y + Math.sin(a) * rBig));
  }
  for (let i = 9; i >= 1; i--) {
    const t = i / 10;
    const y = THREE.MathUtils.lerp(yTop, yBot, t);
    const w = THREE.MathUtils.lerp(wTop, wBottom, t * t);
    pts.push(new THREE.Vector2(w, y));
  }
  const shape = new THREE.Shape(pts);
  shape.holes.push(circlePath(0.088));
  shape.holes.push(circlePath(0.185, big.x, big.y));
  const depth = 0.13;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geo.translate(0, 0, -depth / 2);
  // Pleuel schwingt in der YZ-Ebene; Kolbenbolzen liegt auf der X-Achse
  geo.rotateY(Math.PI / 2);
  return geo;
}

function assembly(m: MaterialSet, rodTilt = 0): THREE.Group {
  const g = new THREE.Group();
  const piston = new THREE.Mesh(pistonGeometry(), m.aluminium);
  piston.castShadow = piston.receiveShadow = true;
  g.add(piston);
  for (const [y, h] of [
    [0.372, 0.024],
    [0.434, 0.013],
    [0.48, 0.013],
  ] as const) {
    const ring = new THREE.Mesh(ringGeometry(y, h), m.darkSteel);
    ring.castShadow = true;
    g.add(ring);
  }
  // Kolbenbolzen
  const pinGeo = new THREE.CylinderGeometry(0.088, 0.088, PISTON_R * 2 + 0.02, 48);
  pinGeo.rotateZ(Math.PI / 2);
  const pin = new THREE.Mesh(pinGeo, m.chrome);
  pin.position.y = PIN_Y;
  g.add(pin);
  // Pleuel
  const rod = new THREE.Mesh(conrodGeometry(), m.steel);
  rod.castShadow = rod.receiveShadow = true;
  const rodPivot = new THREE.Group();
  rodPivot.position.y = PIN_Y;
  rodPivot.rotation.x = rodTilt;
  rodPivot.add(rod);
  // Pleuelschrauben
  const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6);
  for (const s of [-1, 1]) {
    const bolt = new THREE.Mesh(boltGeo, m.darkSteel);
    bolt.position.set(0, -ROD_LENGTH - 0.02, s * 0.235);
    bolt.castShadow = true;
    rodPivot.add(bolt);
  }
  g.add(rodPivot);
  return g;
}

/** Kolben-/Pleuel-Stillleben. */
export function buildEngine(m: MaterialSet): THREE.Group {
  const group = new THREE.Group();
  const standHeight = ROD_LENGTH + 0.27 - PIN_Y;

  const hero = assembly(m, 0);
  hero.position.set(0, standHeight, 0);
  hero.rotation.y = -0.5;
  group.add(hero);

  const left = assembly(m, 0);
  left.position.set(-0.98, standHeight, -0.95);
  left.rotation.y = 0.35;
  group.add(left);

  const right = assembly(m, 0);
  right.position.set(1.0, standHeight, -1.35);
  right.rotation.y = -1.1;
  group.add(right);

  return group;
}
