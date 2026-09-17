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
// Not on nav-wright's export map: the pure profile API lives inside the
// package, next to the component that uses it. This reaches past the map on
// purpose; the alternative is re-deriving it and drifting from it.
import {
  PROFILE_STATIONS,
  placeHullModel,
  sampleEdges,
  stationProfile,
} from '../../node_modules/nav-wright/dist/modelTransform.js';
import type { StationProfile } from '../../node_modules/nav-wright/dist/modelTransform.js';

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
export function worldProfile(scene: THREE.Group, lengthMeters: number): StationProfile {
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
