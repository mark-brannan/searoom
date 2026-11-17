// The aspect trainer's drill (#120): a glimpse of her lights alone from θ,
// then "which way is she heading, relative to you?", scored by angular error.
// θ is the observer's bearing from her bow, clockwise (lights.json's
// bearing convention); the answer is read on a dial with you at the bottom
// looking up at her: 0 heading away from you, 90 crossing to your right,
// 180 straight at you.

import { evaluateDisplayIn } from './evaluate';
import { mulberry32, scenarioPoolFor } from './quiz';
import type { DisplayLight, FactRecord } from './types';

export const ASPECT_SCENES = 10;
/** How long her lights show before the question, ms. */
export const GLIMPSE_MS = 2500;
/** How long the dial waits for a pick, ms; no pick scores as the worst miss. */
export const ANSWER_MS = 3000;
/** An answer this close counts as read right: half of one of the dial's eight sectors. */
export const TOLERANCE_DEG = 22.5;

export interface AspectScene {
  fixtureName: string;
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
}

const SIDELIGHTS = new Set([
  'light:sidelights',
  'light:sidelight_starboard',
  'light:sidelight_port',
]);

const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/** Her heading on the dial, seen from θ. */
export function headingSeenFrom(theta: number): number {
  return wrap(180 - theta);
}

/** Smallest angle between two dial readings, 0..180. */
export function angularError(a: number, b: number): number {
  const d = Math.abs(wrap(a) - wrap(b));
  return Math.min(d, 360 - d);
}

/**
 * Scenarios whose first display carries sidelights: without them nothing in
 * the lights says which way she points, so a pick could not be read right.
 */
export function aspectPool(jurisdiction: string) {
  const out: Omit<AspectScene, 'theta'>[] = [];
  for (const c of scenarioPoolFor(jurisdiction)) {
    const d = evaluateDisplayIn(jurisdiction, c.facts).displays[0];
    if (d?.lights.some((l) => SIDELIGHTS.has(l.spec.light ?? '')))
      out.push({ fixtureName: c.name, facts: c.facts, lights: d.lights });
  }
  return out;
}

/** A drill's scenes, a pure function of the seed. */
export function aspectScenes(
  seed: number,
  jurisdiction: string,
  n: number = ASPECT_SCENES,
): AspectScene[] {
  const pool = aspectPool(jurisdiction);
  if (pool.length === 0) return [];
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => ({
    ...pool[Math.floor(rng() * pool.length)],
    theta: Math.floor(rng() * 360),
  }));
}

/** errors: one per scene, degrees; a scene with no pick is 180. */
export function scoreDrill(errors: number[]): { meanError: number; within: number } {
  const total = errors.reduce((n, e) => n + e, 0);
  return {
    meanError: errors.length ? Math.round((total / errors.length) * 10) / 10 : 0,
    within: errors.filter((e) => e <= TOLERANCE_DEG).length,
  };
}
