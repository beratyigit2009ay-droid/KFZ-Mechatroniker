import * as THREE from 'three';
import { createMaterials } from './materials';
import { createStudioEnvironment } from './studio';
import { buildWheel } from './wheel';
import { buildTools } from './tools';
import { buildEngine } from './engine';
import { buildSparkPlugs } from './sparkplug';
import { noiseTexture, radialTexture } from './textures';

export type RenderSceneName = 'hero' | 'brake' | 'rim' | 'tools' | 'engine' | 'spark';

export interface BrandParams {
  accent: string;
  caliperLabel: string;
  initials: string;
}

export interface RenderScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  transparent: boolean;
  exposure: number;
}

const BG = 0x08090b;

/** Dunkler Studioboden mit Lichtkegel und Vignette. */
function studioFloor(scene: THREE.Scene, size = 30, roughness = 0.55) {
  const grain = noiseTexture(512, 5, 128, 40);
  grain.repeat.set(size / 3, size / 3);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshPhysicalMaterial({
      color: 0x0d0e11,
      roughness,
      roughnessMap: grain,
      metalness: 0.2,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}

function spot(
  scene: THREE.Scene,
  color: THREE.ColorRepresentation,
  intensity: number,
  pos: [number, number, number],
  target: [number, number, number],
  { angle = 0.5, penumbra = 0.8, shadow = true, mapSize = 2048 } = {},
) {
  const s = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 1.6);
  s.position.set(...pos);
  s.target.position.set(...target);
  s.castShadow = shadow;
  if (shadow) {
    s.shadow.mapSize.set(mapSize, mapSize);
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.02;
    s.shadow.radius = 6;
  }
  scene.add(s, s.target);
  return s;
}

export function buildRenderScene(
  name: RenderSceneName,
  renderer: THREE.WebGLRenderer,
  brand: BrandParams,
  aspect: number,
): RenderScene {
  const scene = new THREE.Scene();
  scene.environment = createStudioEnvironment(renderer, brand.accent, { overhead: name === 'tools' });
  const materials = createMaterials(brand.accent);
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.05, 100);
  const accent = new THREE.Color(brand.accent);

  switch (name) {
    case 'hero': {
      // Freigestelltes Rad (transparenter Hintergrund) – identisch zur Live-3D-Szene
      const wheel = buildWheel({ materials, ...brand });
      wheel.root.rotation.set(0.08, -0.52, 0);
      wheel.spin.rotation.z = 0.35;
      scene.add(wheel.root);
      scene.environmentIntensity = 1;
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-3, 4, 3);
      const top = new THREE.DirectionalLight(0xffffff, 2.5);
      top.position.set(1.5, 5, -1.5);
      const rim = new THREE.PointLight(accent, 8, 8, 1.5);
      rim.position.set(1.6, 0.8, -1.6);
      scene.add(key, top, rim);
      camera.fov = 26;
      camera.position.set(0, 0.05, 5.4);
      camera.lookAt(0, 0, 0);
      return { scene, camera, transparent: true, exposure: 1.05 };
    }

    case 'rim': {
      scene.background = new THREE.Color(BG);
      const wheel = buildWheel({ materials, ...brand });
      wheel.root.rotation.set(0, 0.05, 0);
      wheel.spin.rotation.z = 0.2;
      wheel.root.position.set(0, 1, 0);
      scene.add(wheel.root);
      studioFloor(scene);
      spot(scene, 0xffffff, 80, [-2.5, 5, 3.5], [0, 0.6, 0], { angle: 0.42 });
      spot(scene, accent, 60, [2.8, 1.8, -3], [0, 1, 0], { angle: 0.6, shadow: false });
      camera.fov = 26;
      camera.position.set(-1.45, 1.35, 2.75);
      camera.lookAt(0.02, 0.98, 0);
      scene.fog = new THREE.Fog(BG, 4, 9);
      return { scene, camera, transparent: false, exposure: 1.0 };
    }

    case 'brake': {
      scene.background = new THREE.Color(BG);
      const wheel = buildWheel({ materials, ...brand, brakeOnly: true });
      wheel.root.rotation.set(-0.1, 0.62, 0);
      wheel.spin.rotation.z = 0.5;
      wheel.root.position.set(0, 0.74, 0);
      wheel.root.scale.setScalar(1.25);
      scene.add(wheel.root);
      studioFloor(scene, 30, 0.4);
      spot(scene, 0xffffff, 70, [-1.6, 4.5, 2.6], [0, 0.4, 0], { angle: 0.45 });
      spot(scene, accent, 90, [2.2, 1.4, -2.4], [0, 0.6, 0], { angle: 0.5, shadow: false });
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({
          map: radialTexture(`rgba(${Math.round(accent.r * 255)},${Math.round(accent.g * 255)},${Math.round(accent.b * 255)},0.35)`, 'rgba(0,0,0,0)'),
          transparent: true,
          depthWrite: false,
        }),
      );
      glow.position.set(0.4, 0.8, -1.6);
      scene.add(glow);
      camera.fov = 28;
      camera.position.set(1.35, 1.3, 3.45);
      camera.lookAt(0.05, 0.7, 0);
      scene.fog = new THREE.Fog(BG, 3.5, 8);
      return { scene, camera, transparent: false, exposure: 1.0 };
    }

    case 'tools': {
      scene.background = new THREE.Color(BG);
      const tools = buildTools(materials);
      tools.scale.setScalar(0.7);
      tools.position.x = -0.05;
      scene.add(tools);
      const mat = studioFloor(scene, 20, 0.9);
      const floorMat = mat.material as THREE.MeshPhysicalMaterial;
      floorMat.color.set(0x060709);
      floorMat.envMapIntensity = 0.08;
      floorMat.clearcoat = 0;
      spot(scene, 0xffffff, 45, [-1.2, 5.5, 1.4], [0, 0, 0], { angle: 0.55 });
      spot(scene, accent, 50, [3.5, 1.2, -1.5], [0, 0, 0], { angle: 0.6, shadow: false });
      camera.fov = 30;
      camera.position.set(0.1, 4.3, 1.2);
      camera.lookAt(0.05, 0, -0.08);
      return { scene, camera, transparent: false, exposure: 1.0 };
    }

    case 'engine': {
      scene.background = new THREE.Color(BG);
      const engine = buildEngine(materials);
      scene.add(engine);
      studioFloor(scene, 30, 0.45);
      spot(scene, 0xffffff, 80, [-2.4, 5, 2.4], [0, 0.6, 0], { angle: 0.45 });
      spot(scene, accent, 110, [1.5, 2.5, -3.2], [0, 0.8, 0], { angle: 0.6, shadow: false });
      camera.fov = 28;
      camera.position.set(2.1, 1.45, 4.3);
      camera.lookAt(0.0, 0.82, -0.35);
      scene.fog = new THREE.Fog(BG, 4.5, 10);
      return { scene, camera, transparent: false, exposure: 1.0 };
    }

    case 'spark': {
      scene.background = new THREE.Color(BG);
      const plugs = buildSparkPlugs(materials);
      scene.add(plugs);
      studioFloor(scene, 20, 0.3);
      spot(scene, 0xffffff, 60, [-1.5, 3.5, 1.8], [0, 0.3, 0], { angle: 0.5 });
      spot(scene, accent, 70, [1.2, 1.2, -2], [0, 0.4, 0], { angle: 0.6, shadow: false });
      camera.fov = 26;
      camera.position.set(0.62, 0.55, 2.05);
      camera.lookAt(0, 0.34, 0);
      scene.fog = new THREE.Fog(BG, 2.4, 6);
      return { scene, camera, transparent: false, exposure: 1.0 };
    }
  }
}
