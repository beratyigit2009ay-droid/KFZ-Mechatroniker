/**
 * Offline-Render-Harness: baut eine Szene aus `src/three/scenes.ts` und
 * rendert sie einmalig in hoher Qualität. Wird von `scripts/render-images.mjs`
 * per Headless-Chromium aufgerufen.
 */
import '../src/styles/fonts.css';
import * as THREE from 'three';
import { buildRenderScene, type RenderSceneName } from '../src/three/scenes';

declare global {
  interface Window {
    __RENDER_RESULT__?: string;
    __RENDER_ERROR__?: string;
  }
}

async function main() {
  const q = new URLSearchParams(location.search);
  const name = (q.get('scene') ?? 'hero') as RenderSceneName;
  const width = Number(q.get('w') ?? 1600);
  const height = Number(q.get('h') ?? 1000);
  const brand = {
    accent: q.get('accent') ?? '#ff6a1a',
    caliperLabel: q.get('label') ?? 'WERKSTATT',
    initials: q.get('initials') ?? 'W',
  };

  await document.fonts.load('800 64px "Archivo Variable"');
  await document.fonts.ready;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  const spec = buildRenderScene(name, renderer, brand, width / height);
  renderer.toneMappingExposure = spec.exposure;
  renderer.setClearColor(0x000000, spec.transparent ? 0 : 1);
  spec.camera.updateProjectionMatrix();
  // zweimal rendern: Shadow-Maps sind beim ersten Frame noch leer
  renderer.render(spec.scene, spec.camera);
  renderer.render(spec.scene, spec.camera);
  window.__RENDER_RESULT__ = renderer.domElement.toDataURL('image/png');
}

main().catch((e) => {
  console.error(e);
  window.__RENDER_ERROR__ = String(e?.stack ?? e);
});
