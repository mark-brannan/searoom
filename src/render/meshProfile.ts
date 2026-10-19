// Loads a .glb the way the 3D view does and reduces it to the same
// StationProfile the view reads lights' seats from (anchorLights). Shared by
// hullRegistration.test.ts (facet 2: does the mesh register to the spec?)
// and profilePose.test.ts (facet 4: does the anchored 3D pose agree with the
// 2D profile on screen?) so there is one "read a mesh's shape" path, not two.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// The pure profile API, from nav-wright's public `./profile` entry point.
import {
  PROFILE_STATIONS,
  bowShoulder,
  lightPosition,
  stationAt,
  placeHullModel,
  sampleEdges,
  stationProfile,
} from 'nav-wright/profile';
import type { HullSpec } from 'nav-wright';
import type { StationProfile } from 'nav-wright/profile';

/**
 * Hull ids whose best-fit mesh (the picker's first offer for the hull's scene,
 * hullScenes.ts) is known not to fit, each with the mesh it was measured on
 * and its two worst misses (Δ/LOA). hullRegistration.test.ts expects a
 * failure only while the hull still draws that mesh: remove an entry when a
 * mesh that registers lands, and re-measure one whose best fit changes.
 * profilePose.test.ts, whose pose follows the mesh, reads the same map.
 *
 * Every one misses. The lofts are the hull's own profile and plan drawings,
 * so their misses measure how far anchorLights' reading of a drawing (bow
 * shoulder from the plan outline, mast band from the tallest structure)
 * sits from the spec's hand-set stations; closing that is nav-wright#50
 * (place lights from Annex I geometry) or a per-spec retune. The traced
 * sloop carries her real mast, far above the spec's idealized one. Four
 * hulls draw a loft of another hull's drawing, which ties theirs in the
 * catalog (trawler and seiner on fishing-gear, partly-submerged on barge,
 * tanker on bulker, restricted-ability on dredger).
 */
export const KNOWN_MISFITS: ReadonlyMap<string, string> = new Map([
  // masthead x +0.46, aft masthead x +0.19
  ['open', 'loft-open.glb'],
  // aft masthead x +0.22, sternlight x -0.07
  ['power-small', 'loft-power-small.glb'],
  // masthead x -0.38, sidelight x +0.26
  ['power-large', 'loft-power-large.glb'],
  // masthead y +0.90, aft masthead x +0.16
  ['sail-small', 'hans-christian-38t.glb'],
  // aft masthead x +0.22, sidelight x +0.07
  ['sail-large', 'loft-sail-large.glb'],
  // masthead x -0.24, sidelight x +0.07
  ['square-rigger', 'loft-square-rigger.glb'],
  // masthead x -0.35, sidelight x +0.18
  ['trawler', 'loft-fishing-gear.glb'],
  // masthead x -0.35, sidelight x +0.15
  ['seiner', 'loft-fishing-gear.glb'],
  // sidelight x +0.23, aft masthead x +0.20
  ['tug', 'loft-tug.glb'],
  // masthead x -0.34, sidelight x +0.33
  ['pusher', 'loft-pusher.glb'],
  // masthead x +0.23, sidelight x +0.10
  ['barge', 'loft-barge.glb'],
  // sidelight x +0.23, masthead x +0.23
  ['partly-submerged', 'loft-barge.glb'],
  // aft masthead x +0.22, sidelight x +0.08
  ['pilot-boat', 'loft-pilot-boat.glb'],
  // masthead x -0.59, sidelight x +0.21
  ['ferry', 'loft-ferry.glb'],
  // masthead x -0.60, sidelight x +0.56
  ['container-ship', 'loft-container-ship.glb'],
  // masthead x -0.71, sidelight x +0.68
  ['tanker', 'loft-bulker.glb'],
  // masthead x -0.72, sidelight x +0.71
  ['bulker', 'loft-bulker.glb'],
  // masthead x -0.59, sidelight x +0.52
  ['dredger', 'loft-dredger.glb'],
  // masthead x -0.29, sidelight x +0.17
  ['mine-clearance', 'loft-mine-clearance.glb'],
  // masthead x -0.35, sidelight x +0.18
  ['fishing-gear', 'loft-fishing-gear.glb'],
  // sidelight x +0.60, masthead x -0.55
  ['aground', 'loft-aground.glb'],
  // aft masthead x +0.55, sternlight y +0.20
  ['dive-support', 'loft-dive-support.glb'],
  // masthead x -0.53, sternlight y +0.23
  ['wing-in-ground', 'loft-wing-in-ground.glb'],
  // masthead x -0.50, sidelight x +0.22
  ['restricted-ability', 'loft-dredger.glb'],
]);

/** Vite's `?url` import under vitest resolves to a root-relative path, with
 * the deploy base and `/@fs` prefixes in front of it depending on where the
 * file lives. Peel those back to something the filesystem can open. */
function modelPath(url: string): string {
  const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  if (url.startsWith('/@fs/')) return url.slice('/@fs'.length);
  const base = '/searoom/';
  const rel = url.startsWith(base)
    ? url.slice(base.length)
    : url.replace(/^\//, '');
  return path.join(root, rel);
}

/** three's texture path reaches for browser globals under Node, and the
 * Kenney meshes carry an embedded colormap where Benchy had none. The profile
 * is geometry only, so stub them rather than decode an image (as nav-wright's
 * hullMeshCheck does). */
const g = globalThis as Record<string, unknown>;
g.self ??= globalThis;
g.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} });

export async function loadHullScene(url: string): Promise<THREE.Group> {
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
export function worldProfile(
  scene: THREE.Group,
  lengthMeters: number,
): StationProfile {
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
      for (let i = 0; i < geom.index.count; i++)
        index.push(base + geom.index.getX(i));
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
  const profile = stationProfile(
    sampleEdges(xyz, index, lengthMeters / PROFILE_STATIONS / 2),
  );
  if (!profile) throw new Error('mesh has nothing to profile');
  return profile;
}

/**
 * How far, as a fraction of LOA, a seat on the mesh may sit from the spec's
 * station and still count as the same place. A twentieth of the length: on a
 * 12 m boat, 60 cm. Coarser than that and a sidelight is visibly on the
 * wrong part of the hull; finer and the 2D profile's own hand-drawn
 * stations, set to two decimals of half-length, are inside the noise.
 */
export const REGISTRATION_TOLERANCE = 0.05;

export interface Miss {
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
export function compareToSpec(
  spec: HullSpec,
  profile: StationProfile,
  lengthMeters: number,
): Miss[] {
  const world = (fx: number, z: number, py = 0) =>
    lightPosition({ fx, py, z }, lengthMeters);
  const shoulderX = bowShoulder(profile);
  const shoulder = stationAt(profile, shoulderX);
  const transom = stationAt(profile, profile.minX);
  const rows: [string, number, number][] = [
    ['sidelight x (bow shoulder)', shoulderX, world(spec.sideLightX, 0)[0]],
    [
      'sidelight y (deck at shoulder)',
      shoulder.deck,
      world(0, spec.sideLightZ)[1],
    ],
    [
      'sidelight z (half-beam at shoulder)',
      shoulder.halfBeam,
      world(0, 0, spec.beam)[2],
    ],
    [
      'masthead x (mast band fore edge)',
      profile.mast.foreX,
      world(spec.mastX, 0)[0],
    ],
    [
      'masthead y (mast band top)',
      profile.mast.top,
      world(0, spec.mastTopZ)[1],
    ],
    [
      'aft masthead x (mast band aft edge)',
      profile.mast.aftX,
      world(spec.aftMastX, 0)[0],
    ],
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
