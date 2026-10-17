// One fact record per nav-wright hull the app can draw: a scene selectHull
// picks that hull for, at the loft's nominal length. The mesh tests pair
// each hull with the mesh the picker offers for its scene, so a hull's
// "registered" mesh is the catalog's best fit for it, not a hand-kept map.
//
// cruise-ship and warship have no scene: selectHull never returns them (no
// fact names either), so the app never draws their stations.

import type { MeshRecord } from 'nav-wright';
import type { FactRecord } from '../engine/types';

const underway = (
  length: number,
  extra: Readonly<Record<string, unknown>> = {},
): FactRecord =>
  ({
    'fact:propulsion': 'propulsion:power',
    'fact:activity': 'activity:none',
    'fact:position': 'position:underway',
    'fact:making_way': true,
    'fact:length_m': length,
    ...extra,
  }) as FactRecord;

const sail = { 'fact:propulsion': 'propulsion:sail' };
const doing = (a: string) => ({ 'fact:activity': `activity:${a}` });

/** Keyed by `HullSpec.id`. */
export const HULL_SCENES: Readonly<Record<string, FactRecord>> = {
  open: underway(5, { 'fact:propulsion': 'propulsion:oars' }),
  'power-small': underway(12),
  'power-large': underway(35),
  'sail-small': underway(12, sail),
  'sail-large': underway(30, sail),
  'square-rigger': underway(60, sail),
  trawler: underway(30, doing('trawling')),
  seiner: underway(30, doing('fishing')),
  tug: underway(30, { ...doing('towing'), 'fact:tow_length_m': 150 }),
  pusher: underway(30, doing('pushing')),
  barge: underway(40, doing('being_towed')),
  'partly-submerged': underway(40, { 'fact:partly_submerged': true }),
  'pilot-boat': underway(18, doing('pilot')),
  ferry: underway(90),
  'container-ship': underway(250),
  tanker: underway(200, doing('cbd')),
  bulker: underway(200, { 'fact:max_speed_kn': 14 }),
  dredger: underway(60, doing('ram_underwater')),
  'mine-clearance': underway(50, doing('mine')),
  'fishing-gear': underway(30, {
    ...doing('trawling'),
    'fact:gear_extent_m': 100,
  }),
  aground: underway(60, { 'fact:position': 'position:aground' }),
  'dive-support': underway(15, doing('diving')),
  'wing-in-ground': underway(15, { 'fact:wig': true }),
  'restricted-ability': underway(60, doing('ram')),
};

/**
 * A scene for one catalog mesh on her own: driven as she mainly is (towed,
 * if she has no drive), at her nominal length. The every-mesh tests pair a
 * mesh with the hull selectHull picks for it, as nav-wright's own do.
 */
export function sceneForMesh(record: MeshRecord): FactRecord {
  const lead = record.propulsion[0];
  return underway(record.loaM ?? 12, {
    'fact:propulsion':
      lead === 'sail' || lead === 'oars' ? `propulsion:${lead}` : 'propulsion:power',
    // an unpowered hull is offered to a tow
    ...(lead === 'none' && doing('being_towed')),
  });
}
