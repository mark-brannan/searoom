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
