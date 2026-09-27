import * as THREE from 'three';
import { noiseTexture, ringsTexture } from './textures';

export interface MaterialSet {
  machined: THREE.MeshPhysicalMaterial;
  graphite: THREE.MeshPhysicalMaterial;
  gloss: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshPhysicalMaterial;
  steel: THREE.MeshPhysicalMaterial;
  darkSteel: THREE.MeshPhysicalMaterial;
  aluminium: THREE.MeshPhysicalMaterial;
  rubber: THREE.MeshPhysicalMaterial;
  paint: THREE.MeshPhysicalMaterial;
  ceramic: THREE.MeshPhysicalMaterial;
  copper: THREE.MeshPhysicalMaterial;
}

export function createMaterials(accent: string): MaterialSet {
  const rings = ringsTexture();
  rings.repeat.set(1 / 1.12, 1 / 1.12);
  rings.offset.set(0.5, 0.5);

  const grain = noiseTexture(256, 11, 128, 90);
  grain.repeat.set(3, 3);

  return {
    // Glanzgedrehte Felgenfront
    machined: new THREE.MeshPhysicalMaterial({
      color: 0xd4d7dc,
      metalness: 1,
      roughness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.12,
    }),
    // Dunkle Felgenflanken
    graphite: new THREE.MeshPhysicalMaterial({
      color: 0x1d1f23,
      metalness: 0.85,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
    gloss: new THREE.MeshPhysicalMaterial({
      color: 0x0b0c0e,
      metalness: 0.2,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xe8eaee, metalness: 1, roughness: 0.07 }),
    steel: new THREE.MeshPhysicalMaterial({
      color: 0xb4b8bd,
      metalness: 1,
      roughness: 0.5,
      roughnessMap: rings,
    }),
    darkSteel: new THREE.MeshPhysicalMaterial({ color: 0x3a3d42, metalness: 1, roughness: 0.45 }),
    aluminium: new THREE.MeshPhysicalMaterial({
      color: 0xc9ccd0,
      metalness: 1,
      roughness: 0.5,
      roughnessMap: grain,
    }),
    rubber: new THREE.MeshPhysicalMaterial({
      color: 0x1a1b1e,
      metalness: 0,
      roughness: 0.74,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0x3a3d42),
    }),
    // Lackierter Bremssattel in Markenfarbe
    paint: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accent),
      metalness: 0.05,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
    }),
    ceramic: new THREE.MeshPhysicalMaterial({
      color: 0xf1efe9,
      metalness: 0,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
    copper: new THREE.MeshPhysicalMaterial({ color: 0xc8845a, metalness: 1, roughness: 0.3 }),
  };
}
