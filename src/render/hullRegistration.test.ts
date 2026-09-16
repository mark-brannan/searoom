/// <reference types="node" />
// Registration of a hull's mesh to its HullSpec stations (searoom#22 facet 2).
//
// The 3D view seats each light on the loaded mesh: nav-wright's `anchorLights`
// reads a StationProfile back out of the geometry and moves the sidelights to
// the bow shoulder on the rail, the masthead lights to the tallest structure,
// the sternlight to the transom top. The 2D views put the same lights at the
// HullSpec's analytic stations. The two agree only if the mesh is shaped like
// the profile — which nothing checked until this test.
//
// For every hull id with a registered mesh, this loads the .glb the way the
// view does (same placement, same edge sampling, same profile), then compares
// each seat the mesh yields with the spec station it stands in for, as a
// fraction of the vessel's length.
//
// Benchy is registered for power-small only because it is the one mesh that
// exists (searoom#82). It is a calibration print, 60 x 48 mm, nothing like a
// hull drawn long and low, and it fails every station by a wide margin. That
// failure is recorded in KNOWN_MISFITS as an expected failure (`it.fails`),
// so the day a power-small mesh lands this test flips loudly instead of
// silently passing a stand-in.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { allHulls } from 'nav-wright';
import type { Hull, HullSpec } from 'nav-wright';
// Not on nav-wright's export map: the pure profile API lives inside the
// package, next to the component that uses it. This reaches past the map on
// purpose; the alternative is re-deriving the seats and drifting from them.
import {
  PROFILE_STATIONS,
  bowShoulder,
  lightPosition,
  placeHullModel,
  sampleEdges,
  stationAt,
  stationProfile,
} from '../../node_modules/nav-wright/dist/modelTransform.js';
import type { StationProfile } from '../../node_modules/nav-wright/dist/modelTransform.js';
import { hasRegisteredModel, modelUrlForHull } from './hullModels';

/**
 * How far, as a fraction of LOA, a seat on the mesh may sit from the spec's
 * station and still count as the same place. A twentieth of the length: on a
 * 12 m boat, 60 cm. Coarser than that and a sidelight is visibly on the
 * wrong part of the hull; finer and the 2D profile's own hand-drawn
 * stations, set to two decimals of half-length, are inside the noise.
 */
export const REGISTRATION_TOLERANCE = 0.05;

/**
 * Hull ids whose registered mesh is known not to fit, with the measured
 * misses (Δ/LOA) at the time of writing. Remove an id here when a mesh that
 * registers lands; the test then fails until it does.
 *
 * power-small → Benchy: sidelight x +0.08, deck +0.34, half-beam +0.10;
 * masthead top +0.59; aft mast x +0.09; stern x -0.08, transom top +0.17.
 * Only the masthead's fore-aft station is inside tolerance, at -0.05.
 */
const KNOWN_MISFITS: ReadonlySet<string> = new Set(['power-small']);

/** Any length works — every figure below is divided back out by it. */
const LENGTH_M = 2;

/** Vite's `?url` import under vitest resolves to a root-relative path, with
 * the deploy base and `/@fs` prefixes in front of it depending on where the
 * file lives. Peel those back to something the filesystem can open. */
function modelPath(url: string): string {
  const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  if (url.startsWith('/@fs/')) return url.slice('/@fs'.length);
  const base = '/searoom/';
  const rel = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, '');
  return path.join(root, rel);
}

async function loadScene(url: string): Promise<THREE.Group> {
  const buf = await readFile(modelPath(url));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) =>
    new GLTFLoader().parse(ab, '', resolve, reject),
  );
  return gltf.scene;
}

/** The same profile the view builds in nav-wright's Hull component: place
 * the model as a vessel of `lengthMeters`, flatten it to world-space
 * triangles, sample the edges at half a station, bin fore-aft. */
function profileOf(scene: THREE.Group, lengthMeters: number): StationProfile {
  const raw = new THREE.Box3().setFromObject(scene);
  const { scale, rotationX, position } = placeHullModel(
    { min: { ...raw.min }, max: { ...raw.max } },
    lengthMeters,
  );
  const g = scene.clone(true);
  g.rotation.x = rotationX;
  g.scale.setScalar(scale);
  g.position.set(...position);
  g.updateMatrixWorld(true);

  const chunks: Float32Array[] = [];
  const index: number[] = [];
  let total = 0;
  const v = new THREE.Vector3();
  g.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geom = o.geometry as THREE.BufferGeometry;
    const pos = geom.getAttribute('position');
    if (!pos) return;
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    const base = total / 3;
    if (geom.index) {
      for (let i = 0; i < geom.index.count; i++) index.push(base + geom.index.getX(i));
    } else {
      for (let i = 0; i < pos.count; i++) index.push(base + i);
    }
    chunks.push(out);
    total += out.length;
  });
  const xyz = new Float32Array(total);
  let at = 0;
  for (const c of chunks) {
    xyz.set(c, at);
    at += c.length;
  }
  const profile = stationProfile(sampleEdges(xyz, index, lengthMeters / PROFILE_STATIONS / 2));
  if (!profile) throw new Error('mesh has nothing to profile');
  return profile;
}

interface Miss {
  station: string;
  mesh: number;
  spec: number;
  /** (mesh - spec) / LOA */
  delta: number;
}

/**
 * Each seat `anchorLights` takes from the mesh, against the spec station
 * whose light it receives, in world metres. Fore-aft x, height y, and for
 * the sidelight the half-beam it is pushed out to.
 */
function compare(spec: HullSpec, profile: StationProfile, lengthMeters: number): Miss[] {
  const world = (fx: number, z: number, py = 0) => lightPosition({ fx, py, z }, lengthMeters);
  const shoulderX = bowShoulder(profile);
  const shoulder = stationAt(profile, shoulderX);
  const transom = stationAt(profile, profile.minX);
  const rows: [string, number, number][] = [
    ['sidelight x (bow shoulder)', shoulderX, world(spec.sideLightX, 0)[0]],
    ['sidelight y (deck at shoulder)', shoulder.deck, world(0, spec.sideLightZ)[1]],
    ['sidelight z (half-beam at shoulder)', shoulder.halfBeam, world(0, 0, spec.beam)[2]],
    ['masthead x (mast band fore edge)', profile.mast.foreX, world(spec.mastX, 0)[0]],
    ['masthead y (mast band top)', profile.mast.top, world(0, spec.mastTopZ)[1]],
    ['aft masthead x (mast band aft edge)', profile.mast.aftX, world(spec.aftMastX, 0)[0]],
    ['sternlight x (aftmost point)', profile.minX, world(spec.sternX, 0)[0]],
    ['sternlight y (transom top)', transom.top, world(0, spec.sternZ)[1]],
  ];
  return rows.map(([station, mesh, s]) => ({
    station,
    mesh,
    spec: s,
    delta: (mesh - s) / lengthMeters,
  }));
}

const registered = (Object.values(allHulls) as Hull[]).filter(hasRegisteredModel);

describe('hull mesh registration', () => {
  it('has at least one registered mesh to check', () => {
    expect(registered.map((h) => h.spec.id)).not.toEqual([]);
  });

  for (const hull of registered) {
    const { id } = hull.spec;
    const expectedToFail = KNOWN_MISFITS.has(id);
    const run = expectedToFail ? it.fails : it;
    const title = expectedToFail
      ? `${id}: mesh is a known misfit for its spec (remove from KNOWN_MISFITS when it registers)`
      : `${id}: mesh stations agree with the spec within ${REGISTRATION_TOLERANCE} of LOA`;

    run(title, async () => {
      const profile = profileOf(await loadScene(modelUrlForHull(hull)), LENGTH_M);
      const misses = compare(hull.spec, profile, LENGTH_M).filter(
        (m) => Math.abs(m.delta) > REGISTRATION_TOLERANCE,
      );
      const report = misses
        .map((m) => `${m.station}: mesh ${m.mesh.toFixed(3)} spec ${m.spec.toFixed(3)} Δ/LOA ${m.delta.toFixed(3)}`)
        .join('\n');
      expect(misses.map((m) => m.station), report).toEqual([]);
    });
  }
});
