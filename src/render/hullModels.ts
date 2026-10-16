// Which mesh the 3D view draws for a given hull.
//
// nav-wright vends `BenchyView` with a `modelUrl` prop: the package ships one
// .glb but the mesh is the consumer's choice per render. This is where that
// choice is made — one entry per hull id, once, so a new mesh is a line here
// rather than a change at every call site.
//
// A hull id with no registered mesh renders Benchy. That is a stand-in, not a
// fit: the lights are seated on Benchy's stations, which are nothing like the
// idealized profile's. Registering a mesh to a hull's HullSpec stations is
// searoom#22 facet 2; which meshes exist at all is nav-wright#34 and #44.

import { selectHull, type Hull } from 'nav-wright';
import type { FactRecord } from '../engine/types';
import benchyModelUrl from 'nav-wright/models/3dbenchy-lowpoly.glb?url';
import openModelUrl from 'nav-wright/models/open-kenney-boat-row-large.glb?url';
import powerSmallModelUrl from 'nav-wright/models/power-small-kenney-boat-speed-j.glb?url';
import powerLargeModelUrl from 'nav-wright/models/power-large-kenney-boat-house-c.glb?url';
import sailSmallModelUrl from 'nav-wright/models/sail-small-kenney-boat-sail-b.glb?url';
import sailLargeModelUrl from 'nav-wright/models/sail-large-kenney-ship-small.glb?url';
import trawlerModelUrl from 'nav-wright/models/trawler-kenney-boat-fishing-small.glb?url';
import tugModelUrl from 'nav-wright/models/tug-kenney-boat-tow-b.glb?url';
import containerShipModelUrl from 'nav-wright/models/container-ship-kenney-ship-cargo-a.glb?url';
import squareRiggerLoft from 'nav-wright/models/square-rigger-loft.glb?url';
import seinerLoft from 'nav-wright/models/seiner-loft.glb?url';
import bargeLoft from 'nav-wright/models/barge-loft.glb?url';
import pilotBoatLoft from 'nav-wright/models/pilot-boat-loft.glb?url';
import ferryLoft from 'nav-wright/models/ferry-loft.glb?url';
import tankerLoft from 'nav-wright/models/tanker-loft.glb?url';
import bulkerLoft from 'nav-wright/models/bulker-loft.glb?url';
import cruiseShipLoft from 'nav-wright/models/cruise-ship-loft.glb?url';
import warshipLoft from 'nav-wright/models/warship-loft.glb?url';
import dredgerLoft from 'nav-wright/models/dredger-loft.glb?url';

/** Benchy, which the bearing view can draw in place of any hull's own mesh. */
export const BENCHY_MODEL_URL: string = benchyModelUrl;

/** The mesh drawn for any hull id with no registered model of its own. */
export const FALLBACK_MODEL_URL: string = benchyModelUrl;

/**
 * Meshes registered to a hull id. Keys are `HullSpec.id` (`allHulls[k].spec.id`,
 * kebab-case), not the `allHulls` key.
 *
 * A sourced mesh where one fits, else one lofted from the hull's own 2D
 * profile and plan drawings (nav-wright `scripts/loft-hulls.mjs`,
 * nav-wright#44's fallback), so no id falls back to Benchy. Sourced: one
 * Kenney Watercraft Kit mesh (CC0) each for the first eight; cruise-ship and
 * ferry are lofted because their kit meshes fail nav-wright's single-mast
 * check. A sourced mesh for a lofted id replaces its line here. Fit per hull:
 * hullRegistration.test.ts; sources and licence: nav-wright's MODELS.md.
 */
const HULL_MODEL_URLS: Readonly<Record<string, string>> = {
  open: openModelUrl,
  'power-small': powerSmallModelUrl,
  'power-large': powerLargeModelUrl,
  'sail-small': sailSmallModelUrl,
  'sail-large': sailLargeModelUrl,
  trawler: trawlerModelUrl,
  tug: tugModelUrl,
  'container-ship': containerShipModelUrl,
  'square-rigger': squareRiggerLoft,
  seiner: seinerLoft,
  barge: bargeLoft,
  'pilot-boat': pilotBoatLoft,
  ferry: ferryLoft,
  tanker: tankerLoft,
  bulker: bulkerLoft,
  'cruise-ship': cruiseShipLoft,
  warship: warshipLoft,
  dredger: dredgerLoft,
};

// Every mesh nav-wright ships, by file name. Files are named `<hull-id>-<variant>.glb`
// (MODELS.md), so a hull's alternatives are the files that start with its id.
const SHIPPED_MODELS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../node_modules/nav-wright/models/*.glb', {
      query: '?url',
      import: 'default',
      eager: true,
    }),
  ).map(([path, url]) => [path.split('/').pop()!, url]),
);

/** One mesh a hull can be drawn with. `name` is the file name, the URL key. */
export interface ModelVariant {
  name: string;
  url: string;
}

/**
 * Every mesh nav-wright ships for this hull: the registered one first, then
 * the rest (sourced kit meshes and the loft) by name. Breadth on purpose —
 * a kit mesh that fails a fit check is still offered; the default is the
 * one that passes.
 */
export function modelVariantsForHull(hull: Hull): ModelVariant[] {
  const id = hull.spec.id;
  const registered = HULL_MODEL_URLS[id];
  const others = Object.keys(SHIPPED_MODELS)
    .filter((n) => n.startsWith(`${id}-`) && SHIPPED_MODELS[n] !== registered)
    .sort()
    .map((name) => ({ name, url: SHIPPED_MODELS[name] }));
  const first = Object.entries(SHIPPED_MODELS).find(
    ([, u]) => u === registered,
  );
  return first ? [{ name: first[0], url: first[1] }, ...others] : others;
}

/**
 * The mesh to draw: the named variant when this hull has it, else the
 * registered default. A stale or foreign name in a URL falls back quietly.
 */
export function modelUrlForVariant(hull: Hull, name: string): string {
  return (
    modelVariantsForHull(hull).find((v) => v.name === name)?.url ??
    modelUrlForHull(hull)
  );
}

/** True when this hull has a mesh of its own rather than the stand-in. */
export function hasRegisteredModel(hull: Hull): boolean {
  return hull.spec.id in HULL_MODEL_URLS;
}

/** The .glb URL the 3D view should draw for this hull. Never empty. */
export function modelUrlForHull(hull: Hull): string {
  return HULL_MODEL_URLS[hull.spec.id] ?? FALLBACK_MODEL_URL;
}

/**
 * A random mesh among those fitting this hull's class, as the `AppState.mesh`
 * value: '' for the hull's default (first variant), else the file name.
 * `rand` returns [0, 1); injectable so a test can walk every index.
 */
export function pickMesh(hull: Hull, rand: () => number = Math.random): string {
  const variants = modelVariantsForHull(hull);
  const i = Math.min(variants.length - 1, Math.floor(rand() * variants.length));
  return i <= 0 ? '' : variants[i].name;
}

const MESH_AXES = [
  'fact:propulsion',
  'fact:activity',
  'fact:position',
] as const;

/**
 * A fresh mesh when a fact change redraws it (searoom#174): a new size class,
 * propulsion, activity or position draws one from the class; any other edit
 * returns undefined and keeps the mesh on screen.
 */
export function meshOnChange(
  prev: FactRecord,
  next: FactRecord,
): string | undefined {
  const nextHull = selectHull(next);
  if (
    nextHull.spec.id !== selectHull(prev).spec.id ||
    MESH_AXES.some((k) => next[k] !== prev[k])
  ) {
    return pickMesh(nextHull);
  }
  return undefined;
}

/**
 * The mesh `step` places along from the current one, wrapping, as the
 * `AppState.mesh` value. A name this hull lacks counts as the default.
 */
export function stepMesh(hull: Hull, current: string, step: 1 | -1): string {
  const variants = modelVariantsForHull(hull);
  const at = Math.max(
    0,
    variants.findIndex((v) => v.name === current),
  );
  const i = (at + step + variants.length) % variants.length;
  return i === 0 ? '' : variants[i].name;
}
