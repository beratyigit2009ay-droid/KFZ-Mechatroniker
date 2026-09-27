import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import company from '../lib/company';
import { createMaterials } from '../three/materials';
import { createStudioEnvironment } from '../three/studio';
import { radialTexture } from '../three/textures';
import { buildWheel } from '../three/wheel';

/** Ruhepose – identisch mit dem vorgerenderten Poster (src/three/scenes.ts, „hero“). */
const BASE = { rx: 0.08, ry: -0.52, spin: 0.35 };

interface Props {
  progress: MotionValue<number>;
  active: boolean;
  onReady: () => void;
  /** Gerät schafft keine flüssige Darstellung → Hero fällt auf das Poster zurück. */
  onSlow: () => void;
  lowPower: boolean;
}

const pointer = { x: 0, y: 0 };

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.4;
      speed[i] = 0.04 + Math.random() * 0.1;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('speed', new THREE.BufferAttribute(speed, 1));
    const accent = new THREE.Color(company.theme.accent);
    const m = new THREE.PointsMaterial({
      size: 0.022,
      map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64),
      color: accent.clone().lerp(new THREE.Color('#ffffff'), 0.55),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry: g, material: m };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const speed = geometry.attributes.speed as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + speed.getX(i) * dt;
      if (y > 2) y = -2;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(y * 2 + i) * 0.0008);
    }
    pos.needsUpdate = true;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

function WheelScene({ progress, onReady, onSlow, lowPower }: Omit<Props, 'active'>) {
  const { gl, scene } = useThree();
  const rig = useMemo(() => {
    const materials = createMaterials(company.theme.accent);
    const r = buildWheel({
      materials,
      caliperLabel: company.caliperLabel,
      initials: company.initials,
      accent: company.theme.accent,
      detail: lowPower ? 0.6 : 1,
    });
    r.root.rotation.set(BASE.rx, BASE.ry, 0);
    r.spin.rotation.z = BASE.spin;
    return r;
  }, [lowPower]);

  useEffect(() => {
    const env = createStudioEnvironment(gl, company.theme.accent);
    scene.environment = env;
    gl.toneMappingExposure = 1.05;
    return () => {
      env.dispose();
      rig.dispose();
    };
  }, [gl, scene, rig]);

  const frames = useRef(0);
  const perf = useRef<{ start: number; frames: number; done: boolean }>({ start: 0, frames: 0, done: false });
  const mountedAt = useRef(performance.now());
  useFrame((_, rawDt) => {
    // Leistungsprüfung: nach dem Aufwärmen 2 s messen; unter 20 fps → Poster statt Live-3D
    const pf = perf.current;
    // Schon die ersten Frames brauchen extrem lange → sofort auf das Poster wechseln
    if (!pf.done && frames.current < 3 && performance.now() - mountedAt.current > 4000) {
      pf.done = true;
      onSlow();
    }
    if (!pf.done && frames.current >= 3) {
      const now = performance.now();
      if (!pf.start) pf.start = now;
      pf.frames++;
      if (now - pf.start > 2000) {
        pf.done = true;
        if ((pf.frames / (now - pf.start)) * 1000 < 20) onSlow();
      }
    }
    const dt = Math.min(rawDt, 1 / 20);
    const p = progress.get();
    rig.spin.rotation.z -= dt * (0.16 + p * 2.2);
    rig.root.rotation.y = damp(rig.root.rotation.y, BASE.ry + pointer.x * 0.2 - p * 0.95, 3.2, dt);
    rig.root.rotation.x = damp(rig.root.rotation.x, BASE.rx - pointer.y * 0.12 + p * 0.12, 3.2, dt);
    rig.root.position.y = damp(rig.root.position.y, Math.sin(performance.now() / 2400) * 0.03, 2, dt);
    if (frames.current < 3 && ++frames.current === 3) onReady();
  });

  return (
    <>
      <directionalLight position={[-3, 4, 3]} intensity={2.2} />
      <directionalLight position={[1.5, 5, -1.5]} intensity={2.5} />
      <pointLight position={[1.6, 0.8, -1.6]} intensity={8} distance={8} decay={1.5} color={company.theme.accent} />
      <primitive object={rig.root} />
      <Particles count={lowPower ? 90 : 220} />
    </>
  );
}

/** Live-3D-Rad im Hero. Wird verzögert geladen; bis dahin zeigt der Hero das Poster. */
export default function Hero3D({ progress, active, onReady, onSlow, lowPower }: Props) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, lowPower ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 26, position: [0, 0.05, 5.4], near: 0.1, far: 50 }}
      aria-hidden
    >
      <WheelScene progress={progress} onReady={onReady} onSlow={onSlow} lowPower={lowPower} />
    </Canvas>
  );
}
