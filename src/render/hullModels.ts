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

import type { Hull } from 'nav-wright';
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

/** True when this hull has a mesh of its own rather than the stand-in. */
export function hasRegisteredModel(hull: Hull): boolean {
  return hull.spec.id in HULL_MODEL_URLS;
}

/** The .glb URL the 3D view should draw for this hull. Never empty. */
export function modelUrlForHull(hull: Hull): string {
  return HULL_MODEL_URLS[hull.spec.id] ?? FALLBACK_MODEL_URL;
}
