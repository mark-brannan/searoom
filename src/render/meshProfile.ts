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
 * Hull ids whose registered mesh is known not to fit, with the measured
 * misses (Δ/LOA) at the time of writing. Remove an id here when a mesh that
 * registers lands; hullRegistration.test.ts then fails until it does, and
 * profilePose.test.ts, whose pose follows the mesh, reads the same set.
 *
 * Kenney Watercraft Kit meshes have cartoon proportions, so every one misses
 * somewhere:
 *
 * open → boat-row-large: sidelight x -0.24, deck +0.09, half-beam +0.28;
 * masthead x -0.12, top +0.09; stern x -0.10, transom top +0.17.
 * power-small → boat-speed-j: sidelight x +0.11, deck +0.08, half-beam +0.06;
 * masthead x -0.47; aft mast x -0.25; stern x -0.08, transom top +0.21.
 * power-large → boat-house-c: sidelight x +0.29, half-beam +0.10; masthead
 * x -0.21, top +0.27; stern x -0.06, transom top +0.10.
 * sail-small → boat-sail-b: sidelight x +0.16, deck +0.16, half-beam +0.08;
 * masthead x -0.13, top +0.73; stern x -0.06, transom top +0.16.
 * sail-large → ship-small: sidelight deck +0.25, half-beam +0.07; masthead
 * top +0.51; aft mast x +0.15; stern x -0.06, transom top +0.80.
 * trawler → boat-fishing-small: sidelight x +0.33, deck +0.12, half-beam
 * +0.07; masthead x -0.14, top +0.38; aft mast x +0.18; stern x -0.07,
 * transom top +0.18.
 * tug → boat-tow-b: sidelight x +0.29, deck +0.07, half-beam +0.07; masthead
 * x +0.13, top +0.26; aft mast x +0.34; stern x -0.08, transom top +0.16.
 * container-ship → ship-cargo-a: sidelight x +0.56, deck -0.12; masthead
 * x -0.11; aft mast x +0.39.
 *
 * Every lofted mesh (nav-wright scripts/loft-hulls.mjs) misses here. The
 * mesh is the hull's own profile and plan drawings, so the misses measure
 * how far anchorLights' reading of a drawing (bow shoulder from the plan
 * outline, mast band from the tallest structure) sits from the spec's
 * hand-set stations. Closing that is nav-wright#50
 * (place lights from Annex I geometry) or a per-spec retune.
 */
export const KNOWN_MISFITS: ReadonlySet<string> = new Set([
  'open',
  'power-small',
  'power-large',
  'sail-small',
  'sail-large',
  'square-rigger',
  'trawler',
  'seiner',
  'tug',
  'barge',
  'pilot-boat',
  'ferry',
  'container-ship',
  'tanker',
  'bulker',
  'cruise-ship',
  'warship',
  'dredger',
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
