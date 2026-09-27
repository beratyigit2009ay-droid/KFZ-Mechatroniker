import * as THREE from 'three';
import type { MaterialSet } from './materials';

const lathe = (raw: [number, number][], segments = 96) =>
  new THREE.LatheGeometry(
    raw.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );

/** Zündkerze, stehend; Fuß (Elektrode) bei y = 0, Gesamthöhe ≈ 0.72. */
function sparkPlug(m: MaterialSet): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  // Gewinde als Folge feiner Rillen
  const thread: [number, number][] = [[0.052, 0.035]];
  for (let i = 0; i < 18; i++) {
    const y = 0.04 + i * 0.0105;
    thread.push([0.058, y + 0.003], [0.058, y + 0.005], [0.05, y + 0.0095]);
  }
  thread.push([0.052, 0.235], [0.06, 0.24]);
  add(lathe(thread), m.steel);

  // Dichtring + Gehäuse + Sechskant
  add(
    lathe([
      [0.06, 0.24],
      [0.075, 0.242],
      [0.077, 0.262],
      [0.064, 0.265],
    ]),
    m.darkSteel,
  );
  const hex = new THREE.CylinderGeometry(0.083, 0.083, 0.075, 6);
  hex.translate(0, 0.305, 0);
  add(hex, m.chrome);
  add(
    lathe([
      [0.064, 0.265],
      [0.07, 0.268],
      [0.07, 0.345],
      [0.066, 0.36],
      [0.052, 0.37],
    ]),
    m.chrome,
  );

  // Keramik-Isolator mit Kriechstromrippen
  const ins: [number, number][] = [
    [0.052, 0.37],
    [0.05, 0.4],
  ];
  for (let i = 0; i < 5; i++) {
    const y = 0.41 + i * 0.038;
    ins.push([0.044, y], [0.05, y + 0.012], [0.05, y + 0.022], [0.044, y + 0.034]);
  }
  ins.push([0.04, 0.61], [0.032, 0.635], [0.03, 0.645]);
  add(lathe(ins), m.ceramic);

  // Anschlussmutter
  add(
    lathe([
      [0.03, 0.645],
      [0.024, 0.65],
      [0.026, 0.672],
      [0.02, 0.678],
      [0.026, 0.684],
      [0.026, 0.71],
      [0.018, 0.72],
      [0.0, 0.722],
    ]),
    m.chrome,
  );

  // Isolatorspitze, Mittel- und Masseelektrode
  add(
    lathe([
      [0.0, 0.0],
      [0.006, 0.0],
      [0.006, 0.014],
      [0.018, 0.02],
      [0.024, 0.04],
      [0.03, 0.05],
    ]),
    m.ceramic,
  );
  const center = new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 16);
  center.translate(0, -0.006, 0);
  add(center, m.chrome);
  const ground1 = new THREE.BoxGeometry(0.014, 0.05, 0.022);
  ground1.translate(0.046, 0.012, 0);
  add(ground1, m.darkSteel);
  const ground2 = new THREE.BoxGeometry(0.05, 0.012, 0.022);
  ground2.translate(0.024, -0.018, 0);
  add(ground2, m.darkSteel);
  return g;
}

export function buildSparkPlugs(m: MaterialSet): THREE.Group {
  const group = new THREE.Group();
  const lift = 0.024; // Elektrode ragt unter den Fuß hinaus

  const hero = sparkPlug(m);
  hero.position.set(0, lift, 0);
  hero.rotation.y = 0.4;
  group.add(hero);

  const back = sparkPlug(m);
  back.position.set(-0.32, lift, -0.42);
  back.rotation.y = -0.6;
  group.add(back);

  const lying = sparkPlug(m);
  lying.rotation.z = Math.PI / 2 - 0.02;
  lying.rotation.y = -0.55;
  lying.position.set(0.34, 0.083, 0.28);
  group.add(lying);

  return group;
}
