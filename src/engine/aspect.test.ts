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
  scoreDrill,
  sidelightBearing,
} from './aspect';

describe('aspect trainer', () => {
  it.each([
    [0, 180, 'from right ahead she is heading straight at you'],
    [90, 90, 'from her starboard beam she crosses to your right'],
    [180, 0, 'from right astern she is heading away'],
    [270, 270, 'from her port beam she crosses to your left'],
  ])('θ %i reads as heading %i: %s', (theta, heading) => {
    expect(headingSeenFrom(theta)).toBe(heading);
  });

  it('sees her green sidelight exactly when she crosses to your right', () => {
    const green = lightCatalog.lights['light:sidelight_starboard'].arc;
    for (let theta = 1; theta < 112; theta++) {
      expect(bearingInArc(theta, green)).toBe(true);
      const h = headingSeenFrom(theta);
      expect(h > 0 && h < 180).toBe(true);
    }
  });

  it('measures error the short way round the dial', () => {
    expect(angularError(350, 10)).toBe(20);
    expect(angularError(10, 350)).toBe(20);
    expect(angularError(0, 180)).toBe(180);
    expect(angularError(45, 45)).toBe(0);
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

  it('every bearing a drill can draw shows a sidelight', () => {
    const { lights } = lightCatalog;
    const stbd = lights['light:sidelight_starboard'].arc;
    const port = lights['light:sidelight_port'].arc;
    const drawn = Array.from({ length: 225 }, (_, i) => sidelightBearing(i));
    expect(new Set(drawn).size).toBe(225);
    for (const theta of drawn)
      expect(bearingInArc(theta, stbd) || bearingInArc(theta, port)).toBe(true);
  });

  it('a ten-scene drill fits in under a minute, even unanswered', () => {
    expect(ASPECT_SCENES * (GLIMPSE_MS + ANSWER_MS)).toBeLessThan(60_000);
  });

  it('scores the mean error and the count read close', () => {
    expect(scoreDrill([0, 20, 40, 180])).toEqual({ meanError: 60, within: 2 });
  });
});
