import { describe, expect, it } from 'vitest';
import { profileSide, seenFrom } from './profileSide';

describe('profileSide', () => {
  it.each([
    [0, 'starboard'],
    [45, 'starboard'],
    [179.9, 'starboard'],
    [180, 'port'],
    [270, 'port'],
    [359, 'port'],
    [360, 'starboard'],
    [-90, 'port'],
  ] as const)('θ %d is seen from her %s side', (theta, side) => {
    expect(profileSide(theta)).toBe(side);
  });
});

describe('seenFrom', () => {
  const placed = [
    { key: 'stbd', py: 0.4 },
    { key: 'port', py: -0.4 },
    { key: 'mast', py: 0 },
  ];

  it('leaves the starboard view as placed', () => {
    expect(seenFrom(placed, 'starboard')).toBe(placed);
  });

  it('from port, the starboard light is the far side and the port light the near', () => {
    const far = (ls: { key: string; py: number }[]) =>
      ls.filter((l) => l.py < -0.05).map((l) => l.key);
    expect(far(seenFrom(placed, 'starboard'))).toEqual(['port']);
    expect(far(seenFrom(placed, 'port'))).toEqual(['stbd']);
  });
});
