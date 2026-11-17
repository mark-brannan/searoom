import { describe, expect, it } from 'vitest';
import { bearingInArc } from 'nav-wright';
import { lights as lightCatalog } from '../data/colregs';
import {
  ANSWER_MS,
  ASPECT_SCENES,
  GLIMPSE_MS,
  angularError,
  aspectPool,
  aspectScenes,
  headingSeenFrom,
  sceneError,
  scoreDrill,
} from './aspect';

const arc = (id: string) => lightCatalog.lights[id].arc;

describe('aspect trainer', () => {
  it.each([
    [0, 180, 'from right ahead she is heading straight at you'],
    [90, 90, 'from her starboard beam she crosses to your right'],
    [180, 0, 'from right astern she is heading away'],
    [270, 270, 'from her port beam she crosses to your left'],
  ])('θ %i reads as heading %i: %s', (theta, heading) => {
    expect(headingSeenFrom(theta)).toBe(heading);
  });

  it.each(Array.from({ length: 360 }, (_, theta) => theta))(
    'θ %i: green alone means she crosses right, red alone means left',
    (theta) => {
      const green = bearingInArc(theta, arc('light:sidelight_starboard'));
      const red = bearingInArc(theta, arc('light:sidelight_port'));
      const h = headingSeenFrom(theta);
      if (green && !red) expect(h > 0 && h <= 180).toBe(true);
      if (red && !green) expect(h >= 180 && h < 360).toBe(true);
    },
  );

  it('measures error the short way round the dial', () => {
    expect(angularError(350, 10)).toBe(20);
    expect(angularError(10, 350)).toBe(20);
    expect(angularError(0, 180)).toBe(180);
    expect(angularError(45, 45)).toBe(0);
  });

  it.each([
    [90, 120, 30, 'abeam, against her heading'],
    [180, 340, 20, 'right astern, the short way past away'],
    [90, null, 180, 'no pick is the worst miss'],
  ] as [number, number | null, number, string][])('θ %i, pick %s scores %i: %s', (theta, pick, error) => {
    expect(sceneError(pick, theta)).toBe(error);
  });

  it('draws only vessels whose lights say which way she points', () => {
    const pool = aspectPool('intl');
    expect(pool.length).toBeGreaterThan(0);
    for (const s of pool)
      expect(s.lights.some((l) => (l.spec.light ?? '').startsWith('light:sidelight'))).toBe(
        true,
      );
  });

  it('a drill is ten scenes, reproducible from its seed', () => {
    const a = aspectScenes(7, 'intl');
    expect(a).toHaveLength(ASPECT_SCENES);
    expect(aspectScenes(7, 'intl')).toEqual(a);
  });

  it('a ten-scene drill fits in under a minute, even unanswered', () => {
    expect(ASPECT_SCENES * (GLIMPSE_MS + ANSWER_MS)).toBeLessThan(60_000);
  });

  it('scores the mean error and the count read close', () => {
    expect(scoreDrill([0, 20, 40, 180])).toEqual({ meanError: 60, within: 2 });
  });
});
