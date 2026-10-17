import { describe, expect, it } from 'vitest';
import { tracedVessels } from 'nav-wright';
import { vesselModelUrl, vesselsByLength } from './Vessels';

describe('traced vessels', () => {
  it('lists at least one vessel', () => {
    expect(tracedVessels.length).toBeGreaterThan(0);
    expect(vesselsByLength).toHaveLength(tracedVessels.length);
  });
  it.each(tracedVessels.map((v) => [v.id, v] as const))(
    '%s resolves to a mesh URL',
    (_id, v) => {
      expect(vesselModelUrl(v)).toMatch(/\.glb/);
    },
  );
});
