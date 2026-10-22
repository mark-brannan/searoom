/// <reference types="node" />
// Light seating over every mesh nav-wright ships (searoom#99).
//
// hullRegistration.test.ts checks each hull's best-fit mesh. The 3D tab can
// draw any catalog mesh (hullModels.ts modelVariants), so this walks all of
// them, each paired with the hull selectHull picks for her own scene
// (hullScenes.ts sceneForMesh): the lights are seated by nav-wright's
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
import { meshCatalog, selectHull } from 'nav-wright';
import type { Hull } from 'nav-wright';
import { modelVariants } from './hullModels';
import { HULL_SCENES, sceneForMesh } from './hullScenes';
import {
  REGISTRATION_TOLERANCE,
  compareToSpec,
  loadHullScene,
  worldProfile,
} from './meshProfile';

const LENGTH_M = 2;

const meshes = meshCatalog.filter((r) => r.kind !== 'calibration');

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
    for (const record of meshes) {
      const facts = sceneForMesh(record);
      const variant = modelVariants(facts).find((v) => v.name === record.file)!;
      verdicts.push(await seat(selectHull(facts), record.file, variant.url));
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

  it('offers every mesh nav-wright ships but Benchy, and has a record for each', () => {
    const covered = new Set(
      Object.values(HULL_SCENES).flatMap((f) => modelVariants(f).map((v) => v.name)),
    );
    const shipped = readdirSync(
      new URL('../../node_modules/nav-wright/models/', import.meta.url),
    ).filter((f) => f.endsWith('.glb') && f !== '3dbenchy-lowpoly.glb');
    expect(shipped.filter((f) => !covered.has(f))).toEqual([]);
    expect(meshes.map((r) => r.file).sort()).toEqual(shipped.sort());
  });
});
