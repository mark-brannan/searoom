// Which of nav-wright's meshes suit a scene, best first (searoom#174's
// picker, read from nav-wright's mesh catalog rather than file names).
//
// A scene is what the fact record says about the vessel: how she is driven,
// how long she is, what she is doing. A mesh is a catalog record. The rule:
//
//  - Propulsion filters. A sailing vessel gets a mesh that can sail, an oared
//    one a mesh with oars, anything else a mesh with an engine; a tow or a
//    wreck may also take an unpowered hull. If nothing qualifies, every mesh
//    does: the list is never empty.
//  - Length prefers. A mesh whose `fitLengthM` band holds the scene's length
//    comes first; one outside it is still offered, drawn scaled.
//  - Then a mesh whose `shows` suit the activity (towing gear for a tow,
//    fishing gear for a fishing vessel), never required; then one built
//    mainly for this propulsion (a power-driven scene leads with a motor
//    hull, not a sloop under engine); then fidelity, traced over typical over
//    stylised; then the nearest nominal length; then the file stem, so a
//    loft's own drawing comes before its -highside/-sheered/-slender variants.
//
// The meshes that tie the best on the first three (length, activity,
// propulsion) are the scene's class: what a random pick draws from.

import type { MeshRecord } from 'nav-wright';
import type { FactRecord } from '../engine/types';

type Propulsion = MeshRecord['propulsion'][number];

export interface MeshScene {
  /** The scene's length overall, metres. */
  lengthM: number;
  /** Propulsion a mesh may carry and still qualify, the scene's own first. */
  accepts: readonly Propulsion[];
  /** `shows` slugs that suit the activity: preferred, never required. */
  wants: readonly string[];
}

/** Same default as nav-wright's selectHull when the record has no length. */
const DEFAULT_LENGTH_M = 12;

/** `shows` slugs that suit each activity; every one is a slug the catalog uses. */
export const ACTIVITY_SHOWS: Readonly<Record<string, readonly string[]>> = {
  'activity:towing': ['towing-gear'],
  'activity:pushing': ['push-knees', 'towing-gear'],
  'activity:fishing': ['fishing-gear', 'gantry', 'boom'],
  'activity:trawling': ['fishing-gear', 'gantry'],
  'activity:mine': ['sweep-gear'],
  'activity:diving': ['a-frame'],
  'activity:ram': ['cranes', 'a-frame'],
  'activity:ram_underwater': ['cranes'],
};

/** The scene a fact record describes, as far as choosing a mesh goes. */
export function sceneOf(facts: FactRecord): MeshScene {
  const rec = facts as Readonly<Record<string, unknown>>;
  const p = facts['fact:propulsion'];
  const drive: Propulsion =
    p === 'propulsion:sail' ? 'sail' : p === 'propulsion:oars' ? 'oars' : 'power';
  const length = facts['fact:length_m'];
  const unpowered =
    facts['fact:activity'] === 'activity:being_towed' ||
    rec['fact:partly_submerged'] === true ||
    rec['fact:inconspicuous_partly_submerged_tow'] === true;
  const wants = [
    ...(ACTIVITY_SHOWS[String(facts['fact:activity'])] ?? []),
    ...(rec['fact:wig'] === true ? ['wings'] : []),
  ];
  return {
    lengthM:
      typeof length === 'number' && length > 0 ? length : DEFAULT_LENGTH_M,
    accepts: unpowered ? ['none', drive] : [drive],
    wants,
  };
}

export interface RankedMesh {
  record: MeshRecord;
  /** The scene's length sits inside the mesh's `fitLengthM` band. */
  fits: boolean;
  /** Ties the best mesh on length, activity and propulsion. */
  inClass: boolean;
}

const FIDELITY: Readonly<Record<MeshRecord['fidelity'], number>> = {
  traced: 0,
  typical: 1,
  stylised: 2,
  calibration: 3,
};

/**
 * Every mesh the scene may be drawn with, best first. Calibration meshes
 * (Benchy) are left out: the view offers Benchy on its own toggle.
 */
export function rankMeshes(
  catalog: readonly MeshRecord[],
  scene: MeshScene,
): RankedMesh[] {
  const pool = catalog.filter((r) => r.kind !== 'calibration');
  const driven = pool.filter((r) =>
    r.propulsion.some((p) => scene.accepts.includes(p)),
  );
  const L = scene.lengthM;
  const fits = (r: MeshRecord) =>
    r.fitLengthM !== null && L >= r.fitLengthM[0] && L <= r.fitLengthM[1];
  const suits = (r: MeshRecord) => r.shows.some((s) => scene.wants.includes(s));
  const leads = (r: MeshRecord) => r.propulsion[0] === scene.accepts[0];
  const gap = (r: MeshRecord) =>
    r.loaM === null ? Infinity : Math.abs(Math.log(r.loaM / L));
  const stem = (r: MeshRecord) => r.file.replace(/\.glb$/, '');
  // 0 is best on each: in the band, shows the activity, built for this drive
  const klass = (r: MeshRecord) =>
    (fits(r) ? 0 : 4) + (suits(r) ? 0 : 2) + (leads(r) ? 0 : 1);
  const sorted = (driven.length > 0 ? driven : pool)
    .map((record) => ({ record, k: klass(record) }))
    .sort(
      (a, b) =>
        a.k - b.k ||
        FIDELITY[a.record.fidelity] - FIDELITY[b.record.fidelity] ||
        gap(a.record) - gap(b.record) ||
        (stem(a.record) < stem(b.record) ? -1 : stem(a.record) > stem(b.record) ? 1 : 0),
    );
  return sorted.map(({ record, k }) => ({
    record,
    fits: fits(record),
    inClass: k === sorted[0].k,
  }));
}
