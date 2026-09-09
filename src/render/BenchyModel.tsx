// Renders the vessel as a 3D model, for the "Benchy" scene view. Every
// vessel uses the same stand-in mesh regardless of hull, size or mode of
// propulsion; only the length scaling varies.
//
// The lights are drawn in the scene rather than as a 2D overlay: the view
// orbits, so a flat annotation layer in profile coordinates would slide
// off the hull the moment you dragged it. They come from the same
// placeLights output the 2D views use, so there is still one
// light-placement implementation; what changes here is only where on the
// mesh each light is seated. The mesh's shape is read back as a station
// profile and each light snapped to the surface at its station (see
// anchorLights in modelTransform.ts), so a sidelight sits on the rail
// and a masthead light clears the cabin instead of landing inside it.
//
// Model: public/models/3dbenchy-lowpoly.glb — see MODELS.md for
// provenance, license and the bow-orientation check this component relies
// on (local +X is the bow). The scale/orientation math itself lives in
// modelTransform.ts, where it is unit-tested.

import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import type { PlacedLight } from 'nav-wright';
import {
  PROFILE_STATIONS,
  anchorLights,
  lightPosition,
  placeHullModel,
  sampleEdges,
  stationProfile,
} from './modelTransform';
import type { HullStations } from './modelTransform';
import { DEFAULT_TILT, MAX_TILT } from '../state/urlState';

const MODEL_URL = `${import.meta.env.BASE_URL}models/3dbenchy-lowpoly.glb`;

const NO_HULL: HullStations = { beam: 0, mastX: NaN, aftMastX: NaN, sternX: NaN };

/** Camera distance as a multiple of the vessel's length. */
const ORBIT_DISTANCE = 1.6;

/** Bead radius for a light, and how far off the surface it is seated. */
function lightRadius(lengthMeters: number): number {
  return Math.max(lengthMeters * 0.012, 0.12);
}

/** Every mesh under `root` as one world-space triangle list: flat xyz
 * vertices and a merged index. */
function worldMesh(root: THREE.Object3D): { xyz: Float32Array; index: number[] } {
  const chunks: Float32Array[] = [];
  const index: number[] = [];
  let total = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
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
  return { xyz, index };
}

/** The placed hull and her lights, seated on it. One component because
 * the lights need the mesh's profile, which only exists once the model
 * has loaded — so they arrive together, on the hull, rather than the
 * lights appearing first at their analytic positions and then jumping. */
function Hull({
  lengthMeters,
  hull,
  placed,
}: {
  lengthMeters: number;
  hull: HullStations;
  placed: PlacedLight[];
}): ReactElement {
  const { scene } = useGLTF(MODEL_URL);

  const { group, profile } = useMemo(() => {
    const g = scene.clone(true);
    const raw = new THREE.Box3().setFromObject(scene);
    const { scale, rotationX, position } = placeHullModel(
      { min: { ...raw.min }, max: { ...raw.max } },
      lengthMeters,
    );

    g.rotation.x = rotationX;
    g.scale.setScalar(scale);
    g.position.set(...position);
    g.updateMatrixWorld(true);

    // Sample the edges at half a station so a flat roof spanning several
    // stations still registers in each of them.
    const { xyz, index } = worldMesh(g);
    const spacing = lengthMeters / PROFILE_STATIONS / 2;
    return { group: g, profile: stationProfile(sampleEdges(xyz, index, spacing)) };
  }, [scene, lengthMeters]);

  const positions = useMemo(
    () =>
      profile
        ? anchorLights(placed, lengthMeters, hull, profile, lightRadius(lengthMeters))
        : null,
    [placed, lengthMeters, hull, profile],
  );

  return (
    <>
      <primitive object={group} />
      {placed.map((l, i) => (
        <SceneLight
          key={l.key}
          light={l}
          lengthMeters={lengthMeters}
          position={positions?.[i]}
        />
      ))}
    </>
  );
}
useGLTF.preload(MODEL_URL);

/** One light: a small emissive bead inside an additive halo, so it reads
 * as a light source from any angle rather than as a coloured dot that
 * disappears edge-on.
 *
 * Drawn without depth testing, so a light is never swallowed by the
 * stand-in mesh's oversized superstructure — which is a cartoon's, not
 * this vessel's. The 2D profile likewise draws every light regardless of
 * what is in front of it; arc culling is the bearing view's job. */
function SceneLight({
  light,
  lengthMeters,
  position,
}: {
  light: PlacedLight;
  lengthMeters: number;
  /** Where to seat it; falls back to the analytic position when the mesh
   * could not be profiled. */
  position?: [number, number, number];
}): ReactElement {
  const halo = useRef<THREE.Mesh>(null);
  const r = lightRadius(lengthMeters);
  const at = position ?? lightPosition(light, lengthMeters);

  useFrame(({ clock }) => {
    if (!halo.current) return;
    const on =
      light.character !== 'flashing' || clock.elapsedTime % 1.2 < 0.35;
    halo.current.visible = on;
  });

  return (
    <group position={at}>
      <mesh renderOrder={2}>
        <sphereGeometry args={[r, 12, 12]} />
        <meshBasicMaterial
          color={light.color}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={halo} renderOrder={1}>
        <sphereGeometry args={[r * 2.6, 12, 12]} />
        <meshBasicMaterial
          color={light.color}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The anchor cable, when she is anchored: bow to the seabed, drawn in the
 * scene for the same reason the lights are. */
function AnchorCable({ lengthMeters }: { lengthMeters: number }): ReactElement {
  const points = useMemo(
    () => [
      new THREE.Vector3(lengthMeters / 2, lengthMeters * 0.08, 0),
      new THREE.Vector3(lengthMeters * 0.95, -lengthMeters * 0.35, 0),
    ],
    [lengthMeters],
  );
  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points],
  );
  return (
    <primitive
      object={new THREE.Line(geometry, new THREE.LineDashedMaterial({
        color: '#7d8ea3',
        dashSize: lengthMeters * 0.03,
        gapSize: lengthMeters * 0.03,
      }))}
      onUpdate={(l: THREE.Line) => l.computeLineDistances()}
    />
  );
}

const DEG = Math.PI / 180;
const MIN_POLAR = (90 - MAX_TILT) * DEG;
const MAX_POLAR = 90 * DEG;

/** Drives the camera from `theta` (relative bearing of the viewer, the
 * same angle the bearing view's slider carries) and `tilt` (elevation
 * above the waterline), and reports both back when the user drags, so
 * each stays one number rather than two. */
function OrbitRig({
  theta,
  onTheta,
  tilt,
  onTilt,
  lengthMeters,
}: {
  theta: number;
  onTheta?: (t: number) => void;
  tilt: number;
  onTilt?: (t: number) => void;
  lengthMeters: number;
}): ReactElement {
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  // The last angles this component itself reported. Without them, our own
  // report comes back as a prop and re-seats the camera mid-drag.
  const reported = useRef<{ theta: number; tilt: number } | null>(null);

  const distance = lengthMeters * ORBIT_DISTANCE;
  // The stand-in mesh is about 0.8 of its length tall; aim at its middle so
  // it sits centred in the frame rather than riding the top edge.
  const targetY = lengthMeters * 0.38;

  useEffect(() => {
    const r = reported.current;
    if (r && Math.abs(r.theta - theta) < 0.5 && Math.abs(r.tilt - tilt) < 0.5)
      return;
    const polar = Math.min(MAX_POLAR, Math.max(MIN_POLAR, (90 - tilt) * DEG));
    const rad = theta * DEG;
    // theta 0 = seen from ahead (+X, the bow), 90 = from her starboard
    // beam (+Z), matching the bearing view's aspects. At 90 the bow falls
    // to the right of the frame, as it does in the 2D profile.
    camera.position.set(
      distance * Math.sin(polar) * Math.cos(rad),
      distance * Math.cos(polar) + targetY,
      distance * Math.sin(polar) * Math.sin(rad),
    );
    controls.current?.update();
  }, [theta, tilt, camera, distance, targetY]);

  return (
    <OrbitControls
      ref={controls}
      target={[0, targetY, 0]}
      enablePan
      enableZoom
      minDistance={lengthMeters * 0.5}
      maxDistance={lengthMeters * 8}
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={MAX_POLAR}
      onChange={() => {
        const c = controls.current;
        if (!c) return;
        // three's azimuthal angle is measured from +Z toward +X; theta 0
        // puts the camera on +X, which is three's 90 degrees. Its polar
        // angle is from straight up; tilt is from the waterline.
        const deg = (90 - c.getAzimuthalAngle() / DEG + 360) % 360;
        const next = {
          theta: Math.round(deg),
          tilt: Math.round(90 - c.getPolarAngle() / DEG),
        };
        const prev = reported.current;
        if (prev && prev.theta === next.theta && prev.tilt === next.tilt) return;
        reported.current = next;
        if (next.theta !== prev?.theta) onTheta?.(next.theta);
        if (next.tilt !== prev?.tilt) onTilt?.(next.tilt);
      }}
    />
  );
}

export function BenchyModel({
  lengthMeters,
  placed,
  anchored = false,
  theta = 90,
  onTheta,
  tilt = DEFAULT_TILT,
  onTilt,
  hull = NO_HULL,
  label,
  fallback = <div className="scene-3d" />,
  onError,
}: {
  lengthMeters: number;
  placed: PlacedLight[];
  anchored?: boolean;
  /** Relative bearing of the viewer, in degrees — the same angle the
   * bearing view carries, so the two views agree on where you stand. */
  theta?: number;
  onTheta?: (t: number) => void;
  /** Camera elevation above the waterline, degrees. */
  tilt?: number;
  onTilt?: (t: number) => void;
  /** The hull spec's stations (half-beam, masts, stern) in fx/py units,
   * so each light can be seated on the mesh's counterpart of where the 2D
   * profile put it. The default seats everything on the centreline. */
  hull?: HullStations;
  /** Accessible name for the canvas. Comes from the caller's SceneLabels —
   * these views render without an IntlProvider, by design (searoom#20). */
  label?: string;
  /** Shown if the model or the WebGL context fails. */
  fallback?: ReactNode;
  onError?: (error: unknown) => void;
}): ReactElement {
  return (
    <ModelErrorBoundary fallback={fallback} onError={onError}>
      <Canvas
        className="scene-3d"
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ fov: 40, near: 0.1, far: lengthMeters * 40 }}
        role="img"
        aria-label={label}
      >
        <color attach="background" args={['#0a1622']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.3} />
        <OrbitRig
          theta={theta}
          onTheta={onTheta}
          tilt={tilt}
          onTilt={onTilt}
          lengthMeters={lengthMeters}
        />
        <Suspense fallback={null}>
          <Hull lengthMeters={lengthMeters} hull={hull} placed={placed} />
        </Suspense>
        {anchored && <AnchorCable lengthMeters={lengthMeters} />}
      </Canvas>
    </ModelErrorBoundary>
  );
}
