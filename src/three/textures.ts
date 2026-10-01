import * as THREE from 'three';
import { mulberry32 } from './util';

export const DISPLAY_FONT = '"Archivo Variable", "Archivo", system-ui, sans-serif';

function makeCanvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

/** Konzentrische Drehriefen – als Roughness-Map einer Bremsscheibe. */
export function ringsTexture(size = 1024, seed = 7): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  ctx.fillStyle = 'rgb(128,128,128)';
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2;
  for (let r = 4; r < size * 0.72; r += 1 + rnd() * 2.2) {
    const v = 100 + rnd() * 70;
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.35 + rnd() * 0.45})`;
    ctx.lineWidth = 0.6 + rnd() * 1.4;
    ctx.beginPath();
    ctx.arc(cx, cx, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Feines Rauschen – Oberflächenstruktur für Böden/Matten. */
export function noiseTexture(size = 512, seed = 3, base = 128, spread = 60): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = base + (rnd() - 0.5) * spread;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Weißer Schriftzug auf transparentem Grund (Bremssattel-Beschriftung). */
export function textTexture(
  text: string,
  { width = 1024, height = 256, weight = 800, color = '#ffffff' } = {},
): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(width, height);
  ctx.clearRect(0, 0, width, height);
  let size = height * 0.62;
  const setFont = () => {
    ctx.font = `${weight} ${size}px ${DISPLAY_FONT}`;
    // Breitlauf der Archivo-Variable (wdth-Achse)
    (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'ultra-expanded';
  };
  setFont();
  ctx.letterSpacing = `${Math.round(height * 0.04)}px`;
  while (ctx.measureText(text).width > width * 0.94 && size > 10) {
    size -= 4;
    setFont();
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Nabendeckel: dunkles Emblem mit Initialen und Akzentring. */
export function capTexture(initials: string, accent: string, size = 512): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r * 0.8, r * 0.7, r * 0.1, r, r, r);
  g.addColorStop(0, '#2a2d33');
  g.addColorStop(1, '#0c0d10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = accent;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.arc(r, r, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f2f3f5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = size * (initials.length > 1 ? 0.34 : 0.46);
  ctx.font = `800 ${fs}px ${DISPLAY_FONT}`;
  while (ctx.measureText(initials).width > size * 0.62) {
    fs -= 4;
    ctx.font = `800 ${fs}px ${DISPLAY_FONT}`;
  }
  ctx.fillText(initials, r, r + fs * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Weicher radialer Verlauf (Kontaktschatten, Lichtkegel). */
export function radialTexture(inner = 'rgba(0,0,0,0.85)', outer = 'rgba(0,0,0,0)', size = 256): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
