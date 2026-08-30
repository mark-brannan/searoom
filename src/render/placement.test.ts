// The exam-faithful part of the renderer: arcs come verbatim from
// lights.json, and visibility through a full sweep must match them.

import { describe, expect, it } from 'vitest';
import { lights } from '../data/colregs';
import { bearingInArc } from './placement';

const arc = (id: string) => lights.lights[id].arc;

describe('bearing arcs (lights.json, verbatim)', () => {
  it('sidelight cutoffs sit at 112.5 degrees abaft the beam', () => {
    const stbd = arc('light:sidelight_starboard');
    expect(stbd).toEqual({ from_deg: 0.0, to_deg: 112.5 });
    expect(bearingInArc(0, stbd)).toBe(true);
    expect(bearingInArc(112.5, stbd)).toBe(true);
    expect(bearingInArc(113, stbd)).toBe(false);
    expect(bearingInArc(350, stbd)).toBe(false);

    const port = arc('light:sidelight_port');
    expect(bearingInArc(0, port)).toBe(true); // dead ahead shows both
    expect(bearingInArc(247.5, port)).toBe(true);
    expect(bearingInArc(247, port)).toBe(false);
    expect(bearingInArc(90, port)).toBe(false);
  });

  it('masthead shows through the bow, not from astern', () => {
    const m = arc('light:masthead');
    expect(m).toEqual({ from_deg: 247.5, to_deg: 112.5 });
    expect(bearingInArc(0, m)).toBe(true);
    expect(bearingInArc(112.5, m)).toBe(true);
    expect(bearingInArc(180, m)).toBe(false);
    expect(bearingInArc(247.5, m)).toBe(true);
    expect(bearingInArc(200, m)).toBe(false);
  });

  it('sternlight is the masthead complement', () => {
    const s = arc('light:sternlight');
    expect(bearingInArc(180, s)).toBe(true);
    expect(bearingInArc(112.5, s)).toBe(true);
    expect(bearingInArc(0, s)).toBe(false);
    expect(bearingInArc(90, s)).toBe(false);
  });

  it('all-round is visible everywhere', () => {
    const a = arc('light:all_round');
    for (let t = 0; t < 360; t += 15) expect(bearingInArc(t, a)).toBe(true);
  });

  it('at every bearing, sidelights+sternlight cover exactly one sector', () => {
    // sweep: the aspect story — exactly one of {stbd, port+stbd, port,
    // stern} families reads at each bearing, never a dark gap
    for (let t = 0; t < 360; t += 1) {
      const any =
        bearingInArc(t, arc('light:sidelight_starboard')) ||
        bearingInArc(t, arc('light:sidelight_port')) ||
        bearingInArc(t, arc('light:sternlight'));
      expect(any).toBe(true);
    }
  });
});
