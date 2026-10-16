/// <reference types="node" />
// Light seating over every mesh nav-wright ships (searoom#99).
//
// hullRegistration.test.ts checks the one mesh registered per hull. The
// 3D tab can draw any shipped variant (hullModels.ts modelVariantsForHull),
// so this walks all of them: the lights are seated by nav-wright's
// `anchorLights` from a profile read out of the mesh, and compared with the
// station the existing placement rules (HullSpec) put each light at.
//
// Two outcomes are kept apart on purpose:
//  - unseatable: the mesh cannot be loaded or profiled, or a seat comes out
//    non-finite. That fails the test.
//  - misfit: seats, but one or more lights land more than the registration
//    tolerance from the spec's station. Never hidden: every one is printed in
//    the summary table below, with its worst station. (Annex I placement,
//    nav-wright#50, is not on nav-wright main yet, so the spec stations are
//    the reference.)

import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allHulls } from 'nav-wright';
import type { Hull } from 'nav-wright';
import { modelVariantsForHull } from './hullModels';
import {
  REGISTRATION_TOLERANCE,
  compareToSpec,
  loadHullScene,
  worldProfile,
} from './meshProfile';

const LENGTH_M = 2;

const hulls = Object.values(allHulls) as Hull[];

interface Verdict {
  hull: string;
  mesh: string;
  /** Set when the mesh could not be seated at all. */
  unseatable?: string;
  /** Stations beyond tolerance, worst first. */
  misses: { station: string; delta: number }[];
}

async function seat(hull: Hull, name: string, url: string): Promise<Verdict> {
  const v: Verdict = { hull: hull.spec.id, mesh: name, misses: [] };
  try {
    const profile = worldProfile(await loadHullScene(url), LENGTH_M);
    const rows = compareToSpec(hull.spec, profile, LENGTH_M);
    const bad = rows.find((r) => !Number.isFinite(r.delta));
    if (bad) {
      v.unseatable = `${bad.station} is not a number`;
      return v;
    }
    v.misses = rows
      .filter((r) => Math.abs(r.delta) > REGISTRATION_TOLERANCE)
      .map((r) => ({ station: r.station, delta: r.delta }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  } catch (e) {
    v.unseatable = e instanceof Error ? e.message : String(e);
  }
  return v;
}

describe('light seating on every shipped mesh (searoom#99)', () => {
  it('seats the lights on every mesh, and lists the misfits', async () => {
    const verdicts: Verdict[] = [];
    for (const hull of hulls) {
      for (const { name, url } of modelVariantsForHull(hull)) {
        verdicts.push(await seat(hull, name, url));
      }
    }

    const seated = verdicts.filter((v) => !v.unseatable);
    const fits = seated.filter((v) => v.misses.length === 0);
    const misfits = seated.filter((v) => v.misses.length > 0);
    const unseatable = verdicts.filter((v) => v.unseatable);

    const lines = [
      `${verdicts.length} meshes: ${fits.length} seat within ${REGISTRATION_TOLERANCE} of LOA, ` +
        `${misfits.length} misfit, ${unseatable.length} unseatable`,
      ...misfits.map(
        (v) =>
          `  misfit ${v.mesh}: ${v.misses.length} stations, worst ${v.misses[0].station} ` +
          `${v.misses[0].delta.toFixed(3)}`,
      ),
      ...unseatable.map((v) => `  UNSEATABLE ${v.mesh}: ${v.unseatable}`),
    ];
    console.log(lines.join('\n'));

    expect(unseatable.map((v) => `${v.mesh}: ${v.unseatable}`)).toEqual([]);
  }, 120_000);

  it('covers every hull-owned mesh nav-wright ships', () => {
    const covered = new Set(
      hulls.flatMap((h) => modelVariantsForHull(h).map((v) => v.name)),
    );
    const ids = hulls.map((h) => h.spec.id);
    const shipped = readdirSync(
      new URL('../../node_modules/nav-wright/models/', import.meta.url),
    ).filter(
      (f) => f.endsWith('.glb') && ids.some((id) => f.startsWith(`${id}-`)),
    );
    expect(shipped.filter((f) => !covered.has(f))).toEqual([]);
  });
});
