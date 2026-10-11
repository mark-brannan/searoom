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
// searoom#22 facet 2; which meshes exist at all is nav-wright#34.

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

/** The mesh drawn for any hull id with no registered model of its own. */
export const FALLBACK_MODEL_URL: string = benchyModelUrl;

/**
 * Meshes registered to a hull id. Keys are `HullSpec.id` (`allHulls[k].spec.id`,
 * kebab-case), not the `allHulls` key.
 *
 * Kenney Watercraft Kit meshes (CC0, nav-wright's MODELS.md). nav-wright ships
 * several per hull; the one here passed nav-wright's hullMeshCheck and, of
 * those, registers to the spec with the fewest stations out of tolerance,
 * then the smallest worst miss (hullRegistration.test.ts). cruise-ship and
 * ferry have kit meshes but fail hullMeshCheck's single-mast test, so they
 * stay on the stand-in. Every other id falls back to Benchy for want of a mesh.
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
};

/** True when this hull has a mesh of its own rather than the stand-in. */
export function hasRegisteredModel(hull: Hull): boolean {
  return hull.spec.id in HULL_MODEL_URLS;
}

/** The .glb URL the 3D view should draw for this hull. Never empty. */
export function modelUrlForHull(hull: Hull): string {
  return HULL_MODEL_URLS[hull.spec.id] ?? FALLBACK_MODEL_URL;
}
