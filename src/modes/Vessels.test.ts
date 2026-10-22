import { describe, expect, it } from 'vitest';
import { meshCatalog } from 'nav-wright';
import { vesselModelUrl, vesselsByLength } from './Vessels';

const traced = meshCatalog.filter((r) => r.kind === 'traced');

describe('traced vessels', () => {
  it('lists at least one vessel', () => {
    expect(traced.length).toBeGreaterThan(0);
    expect(vesselsByLength).toHaveLength(traced.length);
  });
  it.each(traced.map((v) => [v.file, v] as const))(
    '%s resolves to a mesh URL',
    (_file, v) => {
      expect(vesselModelUrl(v)).toMatch(/\.glb/);
    },
  );
});
