import { describe, expect, it } from 'vitest';
import { meshCatalog, selectHull } from 'nav-wright';
import { modelVariants } from './hullModels';
import { sceneForMesh } from './hullScenes';
import { loadHullScene } from './meshProfile';
import { placeScene } from '../../node_modules/nav-wright/dist/sceneProfile.js';
import {
  outlineOf,
  silhouettePath,
  verticalFit,
  xPixel,
  yPixel,
} from './silhouette';
import { profileSource } from './MeshProfileView';

const outline = {
  minX: -6,
  maxX: 6,
  top: [1, 2, 2, 3],
  bottom: [0, 0, 0.2, 0],
};

describe('silhouettePath', () => {
  it('closes on the waterline and survives an empty station', () => {
    const d = silhouettePath(outline, 12);
    expect(d).toMatch(/^M.*Z$/);
    expect(d).not.toMatch(/NaN|Infinity/);
  });
  it('puts the waterline where the Profile view draws it', () => {
    expect(yPixel(0, 12)).toBe(185);
    expect(xPixel(0, 12)).toBe(220);
  });
});

describe('profileSource', () => {
  it('draws the mesh unless ?profile=svg asks for the hand-drawn hull', () => {
    expect(profileSource('')).toBe('mesh');
    expect(profileSource('?profile=svg')).toBe('svg');
  });
});

/**
 * Meshes whose outline runs past the bow (right) edge of the Profile frame,
 * with the rightmost x measured at the time of writing: three of the traced
 * meshes, each with a bowsprit in her record's `shows`. A fix, or a new
 * overflow, changes this list.
 */
const KNOWN_BOW_OVERFLOW: Readonly<Record<string, number>> = {
  'hans-christian-38t.glb': 465.4,
  'westsail-32.glb': 452.8,
  'wyoming.glb': 458,
};

describe('every shipped mesh', () => {
  it('outlines inside the 440 x 240 Profile frame', async () => {
    const overflow: string[] = [];
    for (const record of meshCatalog.filter((r) => r.kind !== 'calibration')) {
      const facts = sceneForMesh(record);
      const hull = selectHull(facts);
      for (const v of modelVariants(facts).filter((m) => m.name === record.file)) {
        const o = outlineOf(
          placeScene(await loadHullScene(v.url), 30, hull.spec),
          30,
        )!;
        const d = silhouettePath(o, 30, verticalFit(Math.max(...o.top), 30));
        const nums = [...d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)];
        expect(nums.length, v.name).toBeGreaterThan(200);
        const xs = nums.map(([, x]) => Number(x));
        if (Math.max(...xs) > 440) overflow.push(v.name);
        else for (const x of xs) expect(x, v.name).toBeLessThanOrEqual(440);
        for (const [, x, y] of nums) {
          expect(Number(x), v.name).toBeGreaterThanOrEqual(0);
          expect(Number(y), `${v.name} y`).toBeGreaterThanOrEqual(0);
        }
      }
    }
    expect(overflow.sort()).toEqual(Object.keys(KNOWN_BOW_OVERFLOW).sort());
  });
});
