import { describe, expect, it } from 'vitest';
import { meshCatalog } from 'nav-wright';
import {
  FALLBACK_MODEL_URL,
  defaultModelUrl,
  modelUrlForVariant,
  modelVariants,
  pickInitialMesh,
  pickMesh,
  stepMesh,
} from './hullModels';
import { HULL_SCENES } from './hullScenes';

const scenes = Object.entries(HULL_SCENES);

describe('defaultModelUrl', () => {
  it('resolves a shipped mesh of her own, not Benchy, for every hull scene', () => {
    for (const [id, facts] of scenes) {
      expect(defaultModelUrl(facts), id).toMatch(/\.glb/);
      expect(defaultModelUrl(facts), id).not.toBe(FALLBACK_MODEL_URL);
    }
  });
});

describe('modelVariants', () => {
  it('offers the best fit first, and every catalog mesh but Benchy resolves to a shipped file', () => {
    for (const [id, facts] of scenes) {
      const variants = modelVariants(facts);
      expect(variants[0].url, id).toBe(defaultModelUrl(facts));
      expect(variants[0].fits, id).toBe(true);
    }
    const offered = new Set(scenes.flatMap(([, f]) => modelVariants(f).map((v) => v.name)));
    const shipped = meshCatalog.filter((r) => r.kind !== 'calibration').map((r) => r.file);
    expect(shipped.filter((f) => !offered.has(f))).toEqual([]);
  });

  it('labels each mesh by the catalog name, and no two the same', () => {
    for (const [id, facts] of scenes) {
      const labels = modelVariants(facts).map((v) => v.label);
      expect(new Set(labels).size, id).toBe(labels.length);
    }
    const tug = modelVariants(HULL_SCENES.tug);
    expect(tug.find((v) => v.name === 'westsail-32.glb')?.label).toBe('Westsail 32');
  });

  it('falls back to the best fit for a name the scene does not offer', () => {
    const tug = HULL_SCENES.tug;
    expect(modelUrlForVariant(tug, 'loft-tug.glb')).toMatch(/loft-tug\.glb/);
    expect(modelUrlForVariant(tug, 'no-such-mesh.glb')).toBe(defaultModelUrl(tug));
    expect(modelUrlForVariant(tug, '')).toBe(defaultModelUrl(tug));
  });
});

describe('pickMesh and stepMesh', () => {
  it("only ever picks a mesh of the scene's class, and reaches every one", () => {
    for (const [id, facts] of scenes) {
      const variants = modelVariants(facts);
      expect(variants.filter((v) => v.inClass).every((v) => v.fits), id).toBe(true);
      const fitting = variants.filter((v) => v.inClass).map((v) => v.name);
      const seen = new Set<string>();
      for (let i = 0; i < fitting.length; i++) {
        const pick = pickMesh(facts, () => (i + 0.5) / fitting.length);
        seen.add(pick === '' ? variants[0].name : pick);
        expect(pickInitialMesh(facts, () => (i + 0.5) / fitting.length), id).toBe(fitting[i]);
      }
      expect([...seen].sort(), id).toEqual([...fitting].sort());
      // the edge of the range stays inside too
      expect(['', ...fitting]).toContain(pickMesh(facts, () => 0.999999999));
    }
  });

  it('steps through every offered mesh and wraps', () => {
    for (const [id, facts] of scenes) {
      const variants = modelVariants(facts);
      const n = variants.length;
      let m = '';
      for (let i = 0; i < n; i++) m = stepMesh(facts, m, 1);
      expect(m, id).toBe('');
      expect(stepMesh(facts, '', -1)).toBe(n === 1 ? '' : variants[n - 1].name);
    }
  });
});
