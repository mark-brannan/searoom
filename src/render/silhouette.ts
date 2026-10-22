// A hull's 2D profile silhouette, read from its mesh. Pure: the mesh is only
// present as the StationProfile nav-wright reduces it to, so the same numbers
// seat the lights (anchorLights) and outline the hull, and the two cannot
// disagree about where the deck is.
//
// Pixels use the Profile view's own frame (nav-wright PX/PZ, a 440 x 240
// box), so a silhouette drops in where the hand-drawn hull was.

import * as THREE from 'three';
import { LIGHT_Z_TO_X, sampleEdges } from 'nav-wright/profile';
import { PX, PZ } from 'nav-wright';

/** Columns along the hull. The 3D view's profile has 24 stations, too coarse
 * to draw: a sheer line and a bow rake want a few times that. */
const COLUMNS = 120;

/** The side view of a placed mesh: per column, the highest and lowest point. */
export interface Outline {
  minX: number;
  maxX: number;
  top: number[];
  bottom: number[];
}

/**
 * Project a mesh, already placed as a vessel (nav-wright placeScene: bow +X,
 * keel on the waterline), onto the fore-aft/height plane. Edges are sampled
 * at half a column so a big flat face (a sail, a deck) fills the columns it
 * spans; a column nothing reaches takes its neighbours' mean.
 */
export function outlineOf(
  placed: THREE.Object3D,
  lengthMeters: number,
): Outline | null {
  placed.updateMatrixWorld(true);
  const chunks: number[] = [];
  const index: number[] = [];
  const v = new THREE.Vector3();
  placed.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geom = o.geometry as THREE.BufferGeometry;
    const pos = geom.getAttribute('position');
    if (!pos) return;
    const base = chunks.length / 3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      chunks.push(v.x, v.y, v.z);
    }
    if (geom.index)
      for (let i = 0; i < geom.index.count; i++)
        index.push(base + geom.index.getX(i));
    else for (let i = 0; i < pos.count; i++) index.push(base + i);
  });
  const xyz = sampleEdges(chunks, index, lengthMeters / COLUMNS / 2);
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < xyz.length; i += 3) {
    minX = Math.min(minX, xyz[i]);
    maxX = Math.max(maxX, xyz[i]);
  }
  if (!(maxX > minX)) return null;
  const top: number[] = new Array(COLUMNS).fill(NaN);
  const bottom: number[] = new Array(COLUMNS).fill(NaN);
  for (let i = 0; i < xyz.length; i += 3) {
    const c = Math.min(
      COLUMNS - 1,
      Math.floor(((xyz[i] - minX) / (maxX - minX)) * COLUMNS),
    );
    const y = xyz[i + 1];
    if (!(y <= top[c])) top[c] = y;
    if (!(y >= bottom[c])) bottom[c] = y;
  }
  for (const a of [top, bottom]) {
    for (let c = 0; c < COLUMNS; c++) {
      if (!Number.isNaN(a[c])) continue;
      let l = c - 1;
      while (l >= 0 && Number.isNaN(a[l])) l--;
      let r = c + 1;
      while (r < COLUMNS && Number.isNaN(a[r])) r++;
      const near = [a[l], a[r]].filter(
        (n) => n !== undefined && !Number.isNaN(n),
      );
      a[c] = near.length ? near.reduce((p, q) => p + q, 0) / near.length : 0;
    }
  }
  return { minX, maxX, top, bottom };
}

/** Metres along the hull to the Profile view's x pixel. */
export function xPixel(x: number, lengthMeters: number): number {
  return PX(x / (lengthMeters / 2));
}

/** Metres above the waterline to the Profile view's y pixel. */
export function yPixel(y: number, lengthMeters: number, fit = 1): number {
  return PZ((fit * y) / ((lengthMeters / 2) * LIGHT_Z_TO_X));
}

/** Pixels kept clear above the tallest thing drawn. */
const HEADROOM_PX = 10;

/**
 * A vertical squash (<= 1) that keeps the tallest of the mesh and its lights
 * inside the 240 px frame. The hand-drawn hulls never need it; a tall kit
 * mesh (a fan boat, a rigged ship) does. Applied to the outline and the
 * lights alike, so a light stays on the structure it sits on.
 */
export function verticalFit(peakMeters: number, lengthMeters: number): number {
  const room = PZ(0) - HEADROOM_PX;
  const need = PZ(0) - yPixel(peakMeters, lengthMeters);
  return need > room ? room / need : 1;
}

/**
 * The outline as an SVG path: the column tops left to right, then the column
 * bottoms back, floored at the waterline (the sea below is drawn under it).
 */
export function silhouettePath(
  outline: Outline,
  lengthMeters: number,
  fit = 1,
): string {
  const n = outline.top.length;
  const centre = (c: number) =>
    outline.minX + ((outline.maxX - outline.minX) * (c + 0.5)) / n;
  const pt = (x: number, y: number) =>
    `${xPixel(x, lengthMeters).toFixed(1)},${yPixel(Math.max(0, y), lengthMeters, fit).toFixed(1)}`;
  // Column centres joined by lines, not stepped: the outline reads as a hull,
  // not as pixels. The ends drop to the waterline-side bottoms.
  const out: string[] = [
    pt(outline.minX, outline.bottom[0]),
    pt(outline.minX, outline.top[0]),
  ];
  for (let c = 0; c < n; c++) out.push(pt(centre(c), outline.top[c]));
  out.push(
    pt(outline.maxX, outline.top[n - 1]),
    pt(outline.maxX, outline.bottom[n - 1]),
  );
  for (let c = n - 1; c >= 0; c--) out.push(pt(centre(c), outline.bottom[c]));
  return `M${out.join(' L')} Z`;
}
