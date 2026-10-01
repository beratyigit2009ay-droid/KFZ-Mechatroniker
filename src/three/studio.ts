import * as THREE from 'three';

/**
 * Prozedurales Studio-Environment: Softboxen und Lichtstreifen als emissive
 * Flächen, per PMREM zu einer Reflexionsumgebung vorgefiltert. Liefert die
 * typischen „Automotive-Studio“-Reflexe auf Lack und Metall – ohne HDR-Datei.
 */
export function createStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  accent: string,
  { overhead = false } = {},
): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030304);

  const geo = new THREE.PlaneGeometry(1, 1);
  const panel = (
    w: number,
    h: number,
    color: THREE.ColorRepresentation,
    intensity: number,
    position: [number, number, number],
  ) => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    mat.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(w, h, 1);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  // Große Deckensoftbox
  panel(7, 3.2, 0xffffff, 2.4, [0, 6, 0.5]);
  // Seitliche Lichtstreifen (Key / Fill)
  panel(0.7, 6, 0xffffff, 4.2, [-6, 1.2, 2.2]);
  panel(0.5, 6, 0xffffff, 2.0, [6, 1.0, 1.5]);
  // Frontaufheller: große, weiche Fläche + heller Streifen oben
  panel(8, 3, 0xdfe6ff, 0.9, [0, -0.6, 7]);
  panel(6, 0.5, 0xffffff, 3.2, [1.5, 3.2, 6]);
  panel(0.5, 4, 0xffffff, 2.2, [4.5, 0.5, 5]);
  // Akzent-Kante von hinten
  panel(6, 0.35, accent, 6, [0, 1.6, -6]);
  panel(0.35, 3.5, accent, 3, [-5, -0.5, -4]);
  // Zusätzliche Overhead-Softbox für Draufsichten (Werkzeug)
  if (overhead) {
    // Streifen statt Fläche → Chrom zeigt Licht/Schatten-Bänder
    panel(1.1, 10, 0xffffff, 3.2, [-2.2, 6, 1]);
    panel(1.6, 10, 0xffffff, 2.6, [0.6, 6, 1.5]);
    panel(0.8, 10, 0xffffff, 3.0, [3.2, 6, 0.5]);
  }
  // Boden – leicht reflektierend
  panel(12, 12, 0x15171b, 1, [0, -5, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  geo.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
  });
  return target.texture;
}
