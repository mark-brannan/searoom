import { describe, expect, it } from 'vitest';
import { allHulls, tracedVessels } from 'nav-wright';
import type { Hull } from 'nav-wright';
import {
  FALLBACK_MODEL_URL,
  hasRegisteredModel,
  modelUrlForHull,
  modelUrlForVariant,
  modelVariantsForHull,
  pickMesh,
  stepMesh,
} from './hullModels';

const hulls = Object.values(allHulls) as Hull[];

describe('modelUrlForHull', () => {
  it('resolves a non-empty .glb url for every hull id', () => {
    for (const hull of hulls) {
      expect(modelUrlForHull(hull), hull.spec.id).toMatch(/\.glb/);
    }
  });

  it('registers a mesh of its own for every hull in the roster', () => {
    for (const hull of hulls) {
      expect(hasRegisteredModel(hull), hull.spec.id).toBe(true);
      expect(modelUrlForHull(hull), hull.spec.id).not.toBe(FALLBACK_MODEL_URL);
    }
  });

  it('keys the map by HullSpec.id, not the allHulls key', () => {
    const fake = { spec: { id: 'no-such-hull' } } as Hull;
    expect(hasRegisteredModel(fake)).toBe(false);
    expect(modelUrlForHull(fake)).toBe(FALLBACK_MODEL_URL);
  });
});

describe('modelVariantsForHull', () => {
  it('offers the registered mesh first, then every other shipped mesh, lofts included', () => {
    for (const hull of hulls) {
      const variants = modelVariantsForHull(hull);
      expect(variants[0].url, hull.spec.id).toBe(modelUrlForHull(hull));
      expect(
        variants.map((v) => v.name),
        hull.spec.id,
      ).toContain(`${hull.spec.id}-loft.glb`);
    }
  });

  it('gives a hull its kit meshes as well as its loft', () => {
    const tug = hulls.find((h) => h.spec.id === 'tug')!;
    expect(modelVariantsForHull(tug).length).toBeGreaterThanOrEqual(6);
  });

  it('falls back to the default for a name the hull does not have', () => {
    const tug = hulls.find((h) => h.spec.id === 'tug')!;
    expect(modelUrlForVariant(tug, 'tug-loft.glb')).toMatch(/tug-loft/);
    expect(modelUrlForVariant(tug, 'ferry-loft.glb')).toBe(
      modelUrlForHull(tug),
    );
  });
});

describe('pickMesh and stepMesh', () => {
  it('only ever picks a mesh that fits the hull class, and reaches every one', () => {
    for (const hull of hulls) {
      const names = modelVariantsForHull(hull).map((v) => v.name);
      const seen = new Set<string>();
      for (let i = 0; i < names.length; i++) {
        const pick = pickMesh(hull, () => (i + 0.5) / names.length);
        expect(pick === '' || names.includes(pick), hull.spec.id).toBe(true);
        seen.add(pick === '' ? names[0] : pick);
      }
      expect(seen.size, hull.spec.id).toBe(names.length);
      // the edge of the range stays inside too
      expect(['', ...names]).toContain(pickMesh(hull, () => 0.999999999));
    }
  });

  it('steps through the class and wraps', () => {
    for (const hull of hulls) {
      const n = modelVariantsForHull(hull).length;
      let m = '';
      for (let i = 0; i < n; i++) m = stepMesh(hull, m, 1);
      expect(m, hull.spec.id).toBe('');
      expect(stepMesh(hull, '', -1)).toBe(
        n === 1 ? '' : modelVariantsForHull(hull)[n - 1].name,
      );
    }
  });
});

describe('traced vessels in the Mesh picker', () => {
  it('offers every traced vessel under some hull', () => {
    const offered = hulls.flatMap((h) =>
      modelVariantsForHull(h).map((v) => v.name),
    );
    for (const v of tracedVessels) expect(offered).toContain(v.model);
  });
});
