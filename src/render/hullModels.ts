// Which mesh the 3D view draws for a scene.
//
// nav-wright vends `BenchyView` with a `modelUrl` prop and ships a catalog of
// every mesh it vends (`meshCatalog`, one record per .glb: what she is, how
// true to life, what length she fits). The Mesh picker offers the catalog
// ranked for the scene's fact record (meshPicker.ts); this maps a pick to the
// .glb URL and keeps the `AppState.mesh` conventions: '' is the scene's best
// fit, any other value a file name.

import { meshCatalog, selectHull } from 'nav-wright';
import type { FactRecord } from '../engine/types';
import benchyModelUrl from 'nav-wright/models/3dbenchy-lowpoly.glb?url';
import { rankMeshes, sceneOf } from './meshPicker';

/** Benchy, which the bearing view can draw in place of the scene's own mesh. */
export const BENCHY_MODEL_URL: string = benchyModelUrl;

/** The mesh drawn when no catalog mesh resolves to a shipped file. */
export const FALLBACK_MODEL_URL: string = benchyModelUrl;

// Every mesh nav-wright ships, by file name.
const SHIPPED_MODELS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../node_modules/nav-wright/models/*.glb', {
      query: '?url',
      import: 'default',
      eager: true,
    }),
  ).map(([path, url]) => [path.split('/').pop()!, url]),
);

/** One mesh a scene can be drawn with. `name` is the file name, the URL key. */
export interface ModelVariant {
  name: string;
  url: string;
  /** The catalog's vessel name, with the file stem added where two share it. */
  label: string;
  /** The scene's length is inside the mesh's fit band; else it is drawn scaled. */
  fits: boolean;
  /** Ties the best fit on length, activity and propulsion: a random pick's pool. */
  inClass: boolean;
}

/**
 * Every mesh this scene may be drawn with, best fit first (meshPicker.ts).
 * Breadth on purpose: a mesh outside its length band is still offered, and
 * labelled scaled.
 */
export function modelVariants(facts: FactRecord): ModelVariant[] {
  const ranked = rankMeshes(meshCatalog, sceneOf(facts)).filter(
    (m) => m.record.file in SHIPPED_MODELS,
  );
  const named = new Map<string, number>();
  for (const { record } of ranked)
    named.set(record.name, (named.get(record.name) ?? 0) + 1);
  return ranked.map(({ record, fits, inClass }) => ({
    name: record.file,
    url: SHIPPED_MODELS[record.file],
    label:
      named.get(record.name)! > 1
        ? `${record.name} (${record.file.replace(/\.glb$/, '')})`
        : record.name,
    fits,
    inClass,
  }));
}

/** The meshes a random pick draws from: the scene's class (meshPicker.ts). */
function pickable(facts: FactRecord): ModelVariant[] {
  return modelVariants(facts).filter((v) => v.inClass);
}

/** The .glb URL of the scene's best fit. Never empty. */
export function defaultModelUrl(facts: FactRecord): string {
  return modelVariants(facts)[0]?.url ?? FALLBACK_MODEL_URL;
}

/**
 * The mesh to draw: the named variant when this scene offers it, else the
 * best fit. A stale or foreign name in a URL falls back quietly.
 */
export function modelUrlForVariant(facts: FactRecord, name: string): string {
  return (
    modelVariants(facts).find((v) => v.name === name)?.url ??
    defaultModelUrl(facts)
  );
}

/**
 * A random mesh of the scene's class (meshPicker.ts), as the
 * `AppState.mesh` value: '' for the best fit, else the file name. `rand`
 * returns [0, 1); injectable so a test can walk every index.
 */
export function pickMesh(
  facts: FactRecord,
  rand: () => number = Math.random,
): string {
  const pool = pickable(facts);
  if (pool.length === 0) return '';
  const i = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[i].name === modelVariants(facts)[0].name ? '' : pool[i].name;
}

/**
 * The mesh a fresh visit opens on: a random mesh of the class, always by name
 * (even the best fit), so the URL that carries it reloads onto the same
 * model. '' only when the scene has no variants at all.
 */
export function pickInitialMesh(
  facts: FactRecord,
  rand: () => number = Math.random,
): string {
  const pool = pickable(facts);
  if (pool.length === 0) return '';
  const i = Math.min(pool.length - 1, Math.floor(rand() * pool.length));
  return pool[i].name;
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
  if (
    selectHull(next).spec.id !== selectHull(prev).spec.id ||
    MESH_AXES.some((k) => next[k] !== prev[k])
  ) {
    return pickMesh(next);
  }
  return undefined;
}

/**
 * The mesh `step` places along from the current one, wrapping, as the
 * `AppState.mesh` value. A name this scene lacks counts as the best fit.
 */
export function stepMesh(
  facts: FactRecord,
  current: string,
  step: 1 | -1,
): string {
  const variants = modelVariants(facts);
  if (variants.length === 0) return '';
  const at = Math.max(
    0,
    variants.findIndex((v) => v.name === current),
  );
  const i = (at + step + variants.length) % variants.length;
  return i === 0 ? '' : variants[i].name;
}
