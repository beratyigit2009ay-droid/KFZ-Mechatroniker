import * as THREE from 'three';
import type { MaterialSet } from './materials';
import { capTexture, textTexture } from './textures';
import { chaikin, circlePath, dishGeometry, polar } from './util';

/**
 * Prozedurales Komplettrad: Reifen, 5-Doppelspeichen-Felge mit Schüsselung,
 * gelochte Bremsscheibe und Bremssattel in Markenfarbe.
 * Einheit: Reifenaußenradius = 1. Die Radachse zeigt entlang +Z.
 */

export interface WheelOptions {
  materials: MaterialSet;
  caliperLabel: string;
  initials: string;
  accent: string;
  /** Detailgrad (Segmente) – für Mobilgeräte reduzierbar. */
  detail?: number;
  /** Nur Bremsscheibe, Nabe und Sattel (ohne Reifen und Felge). */
  brakeOnly?: boolean;
}

export interface WheelRig {
  root: THREE.Group;
  /** Rotierende Teile (Reifen, Felge, Scheibe) */
  spin: THREE.Group;
  caliper: THREE.Group;
  dispose: () => void;
}

const FACE_R = 0.68;
const FACE_Z = 0.19;
const DISH = 0.13;

function tireGeometry(segments: number) {
  // Querschnitt (Radius, Achsposition) von hinten nach vorne → Normalen außen
  const raw: [number, number][] = [
    [0.712, -0.262],
    [0.745, -0.29],
    [0.8, -0.306],
    [0.87, -0.308],
    [0.925, -0.298],
    [0.962, -0.276],
    [0.986, -0.244],
    [0.998, -0.21],
    // Profil mit Längsrillen
    [1.0, -0.17],
    [1.0, -0.128],
    [0.972, -0.122],
    [0.972, -0.096],
    [1.0, -0.09],
    [1.0, -0.03],
    [0.972, -0.024],
    [0.972, 0.024],
    [1.0, 0.03],
    [1.0, 0.09],
    [0.972, 0.096],
    [0.972, 0.122],
    [1.0, 0.128],
    [1.0, 0.17],
    [0.998, 0.21],
    [0.986, 0.244],
    [0.962, 0.276],
    [0.925, 0.298],
    [0.87, 0.308],
    [0.8, 0.306],
    [0.745, 0.29],
    [0.712, 0.262],
  ];
  const pts = raw.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  return geo;
}

function lipGeometry(segments: number) {
  // Felgenhorn vorne: glanzgedreht, rund
  const raw: [number, number][] = [
    [0.742, 0.262],
    [0.756, 0.278],
    [0.758, 0.292],
    [0.748, 0.302],
    [0.73, 0.302],
    [0.7, 0.288],
    [0.672, 0.258],
    [0.66, 0.232],
  ];
  const geo = new THREE.LatheGeometry(
    raw.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  geo.rotateX(Math.PI / 2);
  return geo;
}

function barrelGeometry(segments: number) {
  // Felgenbett, innen sichtbar durch die Speichen
  const raw: [number, number][] = [
    [0.66, 0.232],
    [0.648, 0.16],
    [0.622, 0.08],
    [0.616, -0.1],
    [0.64, -0.2],
    [0.7, -0.25],
    [0.74, -0.268],
  ];
  const geo = new THREE.LatheGeometry(
    raw.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  geo.rotateX(Math.PI / 2);
  return geo;
}

/** Fensterkontur zwischen zwei Speichenkanten a(r) und b(r). */
function windowPath(
  a: (r: number) => number,
  b: (r: number) => number,
  rMin: number,
  rMax: number,
  steps = 7,
): THREE.Path | null {
  const valid: number[] = [];
  for (let i = 0; i <= steps * 3; i++) {
    const r = rMin + ((rMax - rMin) * i) / (steps * 3);
    if ((b(r) - a(r)) * r > 0.012) valid.push(r);
  }
  if (valid.length < 3) return null;
  const r0 = valid[0];
  const r1 = rMax;
  const pts: THREE.Vector2[] = [];
  const rs = Array.from({ length: steps + 1 }, (_, i) => r0 + ((r1 - r0) * i) / steps);
  // linke Kante nach außen
  rs.forEach((r) => pts.push(polar(r, a(r))));
  // Außenbogen
  const arcSteps = 6;
  for (let i = 1; i < arcSteps; i++) {
    const t = i / arcSteps;
    pts.push(polar(r1, a(r1) + (b(r1) - a(r1)) * t));
  }
  // rechte Kante nach innen
  [...rs].reverse().forEach((r) => pts.push(polar(r, b(r))));
  // Innenbogen (nur bei breitem Fenster)
  if ((b(r0) - a(r0)) * r0 > 0.05) {
    for (let i = 1; i < arcSteps; i++) {
      const t = i / arcSteps;
      pts.push(polar(r0, b(r0) - (b(r0) - a(r0)) * t));
    }
  }
  const smooth = chaikin(pts, 3);
  const path = new THREE.Path();
  smooth.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
  return path;
}

function faceGeometry(curveSegments: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, FACE_R, 0, Math.PI * 2, false);

  const pairs = 5;
  const rHub = 0.25;
  const rOut = 0.595;
  const w = (r: number) => {
    const t = THREE.MathUtils.clamp((r - rHub) / (rOut - rHub), 0, 1);
    return THREE.MathUtils.lerp(0.05, 0.024, t);
  };
  const delta = (r: number) => {
    const t = THREE.MathUtils.clamp((r - rHub) / (rOut - rHub), 0, 1);
    return THREE.MathUtils.lerp(0.1, 0.165, t);
  };
  for (let p = 0; p < pairs; p++) {
    const phi = Math.PI / 2 + (p * Math.PI * 2) / pairs;
    const phiNext = phi + (Math.PI * 2) / pairs;
    // großes Fenster zwischen zwei Speichenpaaren
    const big = windowPath(
      (r) => phi + delta(r) + w(r) / r,
      (r) => phiNext - delta(r) - w(r) / r,
      rHub,
      rOut,
    );
    if (big) shape.holes.push(big);
    // schmaler Schlitz innerhalb eines Paares
    const slot = windowPath(
      (r) => phi - delta(r) + w(r) / r,
      (r) => phi + delta(r) - w(r) / r,
      rHub,
      rOut,
    );
    if (slot) shape.holes.push(slot);
  }
  // Mittenbohrung + Radschraubenlöcher
  shape.holes.push(circlePath(0.082));
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
    const p = polar(0.15, a);
    shape.holes.push(circlePath(0.03, p.x, p.y));
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.011,
    bevelSegments: 4,
    curveSegments,
  });
  geo.translate(0, 0, FACE_Z - 0.045);
  dishGeometry(geo, DISH, FACE_R, 1.7);
  return geo;
}

function discGeometry(curveSegments: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.53, 0, Math.PI * 2, false);
  shape.holes.push(circlePath(0.205));
  const rows = [0.315, 0.385, 0.455];
  const perRow = 18;
  rows.forEach((r, ri) => {
    for (let i = 0; i < perRow; i++) {
      const a = (i / perRow) * Math.PI * 2 + ri * 0.075;
      const p = polar(r, a);
      shape.holes.push(circlePath(0.0115, p.x, p.y));
    }
  });
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    curveSegments,
  });
  geo.translate(0, 0, -0.105);
  return geo;
}

function caliperGeometry() {
  const a0 = THREE.MathUtils.degToRad(18);
  const a1 = THREE.MathUtils.degToRad(84);
  const rIn = 0.38;
  const rOut = 0.565;
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push(polar(rOut, a0 + ((a1 - a0) * i) / n));
  for (let i = n; i >= 0; i--) pts.push(polar(rIn, a0 + ((a1 - a0) * i) / n));
  const smooth = chaikin(pts, 4);
  const shape = new THREE.Shape(smooth);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 6,
    curveSegments: 24,
  });
  geo.translate(0, 0, -0.17);
  return geo;
}

export function buildWheel({
  materials: m,
  caliperLabel,
  initials,
  accent,
  detail = 1,
  brakeOnly = false,
}: WheelOptions): WheelRig {
  const seg = Math.round(160 * detail);
  const curve = Math.round(48 * detail);
  const root = new THREE.Group();
  root.name = 'wheel';
  const spin = new THREE.Group();
  root.add(spin);

  const disposables: { dispose: () => void }[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    disposables.push(geo);
    return mesh;
  };

  if (!brakeOnly) {
    add(tireGeometry(seg), m.rubber, spin);
    add(lipGeometry(seg), m.machined, spin);
    const barrelMat = m.graphite.clone();
    barrelMat.side = THREE.DoubleSide;
    disposables.push(barrelMat);
    add(barrelGeometry(seg), barrelMat, spin);
    // Speichenstern: Stirnflächen glanzgedreht, Flanken dunkel
    add(faceGeometry(curve), [m.machined, m.graphite], spin);
  }

  // Bremsscheibe + Topf
  add(discGeometry(curve), m.steel, spin);
  const hat = new THREE.CylinderGeometry(0.2, 0.205, 0.2, seg / 2, 1, true);
  hat.rotateX(Math.PI / 2);
  hat.translate(0, 0, -0.03);
  const hatMat = m.darkSteel.clone();
  hatMat.side = THREE.DoubleSide;
  disposables.push(hatMat);
  add(hat, hatMat, spin);
  const hub = new THREE.CircleGeometry(0.2, seg / 2);
  hub.translate(0, 0, 0.02);
  add(hub, m.darkSteel, spin);

  if (brakeOnly) {
    // Radbolzen auf der freiliegenden Nabe
    const stud = new THREE.CylinderGeometry(0.016, 0.016, 0.12, 16);
    stud.rotateX(Math.PI / 2);
    disposables.push(stud);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
      const p = polar(0.15, a);
      const s = new THREE.Mesh(stud, m.chrome);
      s.position.set(p.x, p.y, 0.08);
      s.castShadow = true;
      spin.add(s);
    }
    const center = new THREE.CylinderGeometry(0.075, 0.075, 0.08, 48);
    center.rotateX(Math.PI / 2);
    center.translate(0, 0, 0.06);
    add(center, m.darkSteel, spin);
  }

  // Radschrauben
  const boltGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.07, 6);
  boltGeo.rotateX(Math.PI / 2);
  disposables.push(boltGeo);
  const boltHead = new THREE.SphereGeometry(0.024, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  boltHead.rotateX(Math.PI / 2);
  disposables.push(boltHead);
  const hubZ = FACE_Z - DISH * (1 - Math.pow(0.15 / FACE_R, 1.7));
  for (let i = 0; i < 5 && !brakeOnly; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 5 + Math.PI / 5;
    const p = polar(0.15, a);
    const b = new THREE.Mesh(boltGeo, m.chrome);
    b.position.set(p.x, p.y, hubZ - 0.03);
    b.rotation.z = a;
    const h = new THREE.Mesh(boltHead, m.chrome);
    h.position.set(p.x, p.y, hubZ + 0.005);
    h.scale.set(1, 1, 0.6);
    spin.add(b, h);
  }

  // Nabendeckel mit Initialen
  const capTex = capTexture(initials, accent);
  disposables.push(capTex);
  const capMat = new THREE.MeshPhysicalMaterial({
    map: capTex,
    metalness: 0.3,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  disposables.push(capMat);
  const cap = new THREE.CylinderGeometry(0.078, 0.08, 0.03, 64);
  cap.rotateX(Math.PI / 2);
  if (!brakeOnly) {
    const capMesh = add(cap, [m.graphite, capMat, m.graphite], spin);
    capMesh.position.z = FACE_Z - DISH + 0.035;
    // Deckel-Oberseite zeigt nach +Z → Material-Gruppe 1 (Deckfläche) bekommt die Textur
    capMesh.rotation.z = Math.PI / 2;
  } else {
    disposables.push(cap);
  }

  // Bremssattel (steht still)
  const caliper = new THREE.Group();
  root.add(caliper);
  add(caliperGeometry(), m.paint, caliper);
  const labelTex = textTexture(caliperLabel);
  disposables.push(labelTex);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    transparent: true,
    roughness: 0.35,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  disposables.push(labelMat);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), labelMat);
  const mid = THREE.MathUtils.degToRad(51);
  const lp = polar(0.4725, mid);
  label.position.set(lp.x, lp.y, 0.036);
  label.rotation.z = mid - Math.PI / 2;
  disposables.push(label.geometry);
  caliper.add(label);

  return {
    root,
    spin,
    caliper,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

