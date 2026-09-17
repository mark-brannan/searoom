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

/** The mesh drawn for any hull id with no registered model of its own. */
export const FALLBACK_MODEL_URL: string = benchyModelUrl;

/**
 * Meshes registered to a hull id. Keys are `HullSpec.id` (`allHulls[k].spec.id`,
 * kebab-case), not the `allHulls` key.
 *
 * Benchy is a small cabin motor boat, so `power-small` is the one id it is
 * plausibly shaped for. Every other id falls back to it for want of a mesh.
 */
const HULL_MODEL_URLS: Readonly<Record<string, string>> = {
  'power-small': benchyModelUrl,
};

/** True when this hull has a mesh of its own rather than the stand-in. */
export function hasRegisteredModel(hull: Hull): boolean {
  return hull.spec.id in HULL_MODEL_URLS;
}

/** The .glb URL the 3D view should draw for this hull. Never empty. */
export function modelUrlForHull(hull: Hull): string {
  return HULL_MODEL_URLS[hull.spec.id] ?? FALLBACK_MODEL_URL;
}
