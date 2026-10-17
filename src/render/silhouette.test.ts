import { describe, expect, it } from 'vitest';
import { allHulls } from 'nav-wright';
import { modelVariantsForHull } from './hullModels';
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

describe('every shipped mesh', () => {
  it('outlines inside the 440 x 240 Profile frame', async () => {
    for (const hull of Object.values(allHulls)) {
      for (const v of modelVariantsForHull(hull)) {
        const o = outlineOf(
          placeScene(await loadHullScene(v.url), 30, hull.spec),
          30,
        )!;
        const d = silhouettePath(o, 30, verticalFit(Math.max(...o.top), 30));
        const nums = [...d.matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)];
        expect(nums.length, v.name).toBeGreaterThan(200);
        for (const [, x, y] of nums) {
          expect(Number(x), v.name).toBeGreaterThanOrEqual(0);
          // A traced vessel is fitted by her hull, so a bowsprit or boomkin
          // (Hans Christian's runs 20px) may run past the frame.
          expect(Number(x), v.name).toBeLessThanOrEqual(v.label ? 480 : 440);
          expect(Number(y), `${v.name} y`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
