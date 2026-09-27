import * as THREE from 'three';
import type { MaterialSet } from './materials';
import { polar } from './util';

/** 12-Kant-Profil (Doppelsechskant) für Ringschlüssel und Nüsse. */
function twelvePoint(s: number, cx = 0, cy = 0, rotation = 0): THREE.Path {
  const path = new THREE.Path();
  const rOuter = s / Math.sqrt(3);
  const rInner = s / 2 / Math.cos(Math.PI / 12);
  for (let i = 0; i <= 24; i++) {
    const a = rotation + (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
}

/** Ring-Maulschlüssel der Schlüsselweite s (1 Einheit = 100 mm). */
function wrenchGeometry(s: number): THREE.ExtrudeGeometry {
  const L = s * 12.5 + 0.35;
  const Rr = s * 0.92 + 0.035; // Ringkopf
  const Ro = s * 1.12 + 0.04; // Maulkopf
  const h1 = Rr * 0.52;
  const h2 = Ro * 0.5;
  const hm = Math.min(h1, h2) * 0.72;
  const ringC = new THREE.Vector2(-L / 2, 0);
  const headC = new THREE.Vector2(L / 2, 0);
  const pts: THREE.Vector2[] = [];

  const halfWidth = (x: number) => {
    const t = (x - (ringC.x + Rr * 0.8)) / (headC.x - Ro * 0.8 - (ringC.x + Rr * 0.8));
    const base = THREE.MathUtils.lerp(h1, h2, t);
    return base - (base - hm) * Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1));
  };

  // Ringkopf (gegen den Uhrzeigersinn, außen herum)
  const alpha = Math.asin(h1 / Rr);
  for (let i = 0; i <= 28; i++) {
    const a = alpha + ((Math.PI * 2 - 2 * alpha) * i) / 28;
    pts.push(new THREE.Vector2(ringC.x + Math.cos(a) * Rr, ringC.y + Math.sin(a) * Rr));
  }
  // Griff unten
  const x0 = ringC.x + Math.cos(alpha) * Rr;
  const beta = Math.asin(h2 / Ro);
  const x1 = headC.x - Math.cos(beta) * Ro;
  for (let i = 1; i < 16; i++) {
    const x = x0 + ((x1 - x0) * i) / 16;
    pts.push(new THREE.Vector2(x, -halfWidth(x)));
  }
  // Maulkopf mit Maulöffnung (15° angestellt)
  const jaw = THREE.MathUtils.degToRad(15);
  const jawHalf = Math.asin(s / 2 / Ro);
  const aStart = Math.PI + beta;
  const aEnd = Math.PI * 3 - beta;
  const jawA = Math.PI * 2 + jaw - jawHalf;
  const jawB = Math.PI * 2 + jaw + jawHalf;
  for (let i = 0; i <= 20; i++) {
    const a = aStart + ((jawA - aStart) * i) / 20;
    pts.push(polar(Ro, a).add(headC));
  }
  // Maul: hinein, Rundung, hinaus (lokal um `jaw` gedreht)
  const depth = Ro * 0.08;
  const local = (x: number, y: number) => {
    const c = Math.cos(jaw);
    const si = Math.sin(jaw);
    return new THREE.Vector2(headC.x + x * c - y * si, headC.y + x * si + y * c);
  };
  pts.push(local(depth + s / 2, -s / 2));
  for (let i = 1; i < 12; i++) {
    const a = -Math.PI / 2 - (Math.PI * i) / 12;
    pts.push(local(depth + Math.cos(a) * (s / 2), Math.sin(a) * (s / 2)));
  }
  pts.push(local(depth + s / 2, s / 2));
  for (let i = 0; i <= 20; i++) {
    const a = jawB + ((aEnd - jawB) * i) / 20;
    pts.push(polar(Ro, a).add(headC));
  }
  // Griff oben
  for (let i = 1; i < 16; i++) {
    const x = x1 - ((x1 - x0) * i) / 16;
    pts.push(new THREE.Vector2(x, halfWidth(x)));
  }

  const shape = new THREE.Shape(pts);
  shape.holes.push(twelvePoint(s, ringC.x, ringC.y, Math.PI / 12));
  const thickness = 0.045 + s * 0.12;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

function socketGeometry(s: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const R = s * 0.72 + 0.035;
  shape.absarc(0, 0, R, 0, Math.PI * 2, false);
  shape.holes.push(twelvePoint(s, 0, 0, Math.PI / 12));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 3,
    curveSegments: 48,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Werkzeug-Stillleben: Ring-Maulschlüssel-Satz und Stecknüsse. */
export function buildTools(m: MaterialSet): THREE.Group {
  const group = new THREE.Group();
  const sizes = [0.1, 0.13, 0.17, 0.19, 0.22];
  sizes.forEach((s, i) => {
    const mesh = new THREE.Mesh(wrenchGeometry(s), m.chrome);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // flach auf die Matte legen
    mesh.rotation.x = -Math.PI / 2;
    const thickness = 0.045 + s * 0.12;
    mesh.position.set(-0.35 + i * 0.07, thickness / 2 + 0.012, -0.95 + i * 0.4);
    mesh.rotation.z = THREE.MathUtils.degToRad(-12 + i * 1.5);
    group.add(mesh);
  });

  const sockets = [0.1, 0.13, 0.17, 0.19];
  sockets.forEach((s, i) => {
    const h = 0.34 + s * 0.4;
    const mesh = new THREE.Mesh(socketGeometry(s, h), m.chrome);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(1.85 + i * 0.05, 0.012, -0.95 + i * 0.36);
    group.add(mesh);
  });
  return group;
}
