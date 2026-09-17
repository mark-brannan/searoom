import { describe, expect, it } from 'vitest';
import { allHulls } from 'nav-wright';
import type { Hull } from 'nav-wright';
import {
  FALLBACK_MODEL_URL,
  hasRegisteredModel,
  modelUrlForHull,
} from './hullModels';

const hulls = Object.values(allHulls) as Hull[];

describe('modelUrlForHull', () => {
  it('resolves a non-empty .glb url for every hull id', () => {
    for (const hull of hulls) {
      expect(modelUrlForHull(hull), hull.spec.id).toMatch(/\.glb/);
    }
  });

  it('registers a mesh for power-small', () => {
    const powerSmall = hulls.find((h) => h.spec.id === 'power-small');
    expect(powerSmall).toBeDefined();
    expect(hasRegisteredModel(powerSmall!)).toBe(true);
    // Benchy is the only mesh nav-wright ships today, so the registered entry
    // and the fallback resolve to the same file. What this pins is that the id
    // is in the map at all — when a power-small mesh lands, this test keeps
    // failing usefully by asserting the lookup answered.
    expect(modelUrlForHull(powerSmall!)).toMatch(/\.glb/);
  });

  it('falls back to the stand-in for a hull id with no mesh', () => {
    const unregistered = hulls.filter((h) => !hasRegisteredModel(h));
    expect(unregistered.length).toBeGreaterThan(0);
    for (const hull of unregistered) {
      expect(modelUrlForHull(hull), hull.spec.id).toBe(FALLBACK_MODEL_URL);
    }
  });

  it('keys the map by HullSpec.id, not the allHulls key', () => {
    const fake = { spec: { id: 'no-such-hull' } } as Hull;
    expect(hasRegisteredModel(fake)).toBe(false);
    expect(modelUrlForHull(fake)).toBe(FALLBACK_MODEL_URL);
  });
});
