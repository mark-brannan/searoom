// Renders the vessel as a 3D model, for the "Benchy" scene view. Every
// vessel uses the same stand-in mesh regardless of hull, size or mode of
// propulsion; only the length scaling varies.
//
// The lights are drawn in the scene rather than as a 2D overlay: the view
// orbits, so a flat annotation layer in profile coordinates would slide
// off the hull the moment you dragged it. They come from the same
// placeLights output the 2D views use (see lightPosition in
// modelTransform.ts), so there is still one light-placement
// implementation.
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
import type { PlacedLight } from './placement';
import { lightPosition, placeHullModel } from './modelTransform';

const MODEL_URL = `${import.meta.env.BASE_URL}models/3dbenchy-lowpoly.glb`;

/** Camera distance as a multiple of the vessel's length. */
const ORBIT_DISTANCE = 1.6;

function Model({ lengthMeters }: { lengthMeters: number }): ReactElement {
  const { scene } = useGLTF(MODEL_URL);

  const group = useMemo(() => {
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

    return g;
  }, [scene, lengthMeters]);

  return <primitive object={group} />;
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
}: {
  light: PlacedLight;
  lengthMeters: number;
}): ReactElement {
  const halo = useRef<THREE.Mesh>(null);
  const r = Math.max(lengthMeters * 0.012, 0.12);
  const position = lightPosition(light, lengthMeters);

  useFrame(({ clock }) => {
    if (!halo.current) return;
    const on =
      light.character !== 'flashing' || clock.elapsedTime % 1.2 < 0.35;
    halo.current.visible = on;
  });

  return (
    <group position={position}>
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

/** Drives the camera from `theta` (relative bearing of the viewer, the
 * same angle the bearing view's slider carries) and reports back when the
 * user drags, so the two stay one number rather than two. */
function OrbitRig({
  theta,
  onTheta,
  lengthMeters,
}: {
  theta: number;
  onTheta?: (t: number) => void;
  lengthMeters: number;
}): ReactElement {
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  // The last theta this component itself reported. Without it, our own
  // report comes back as a prop and re-seats the camera mid-drag.
  const reported = useRef<number | null>(null);

  const distance = lengthMeters * ORBIT_DISTANCE;
  // The stand-in mesh is about 0.8 of its length tall; aim at its middle so
  // it sits centred in the frame rather than riding the top edge.
  const targetY = lengthMeters * 0.38;

  useEffect(() => {
    if (reported.current !== null && Math.abs(reported.current - theta) < 0.5)
      return;
    const c = controls.current;
    const polar = c ? c.getPolarAngle() : Math.PI / 2 - 0.18;
    const rad = (theta * Math.PI) / 180;
    // theta 0 = seen from ahead (+X, the bow), 90 = from her starboard
    // beam (+Z), matching the bearing view's aspects. At 90 the bow falls
    // to the right of the frame, as it does in the 2D profile.
    camera.position.set(
      distance * Math.sin(polar) * Math.cos(rad),
      distance * Math.cos(polar) + targetY,
      distance * Math.sin(polar) * Math.sin(rad),
    );
    c?.update();
  }, [theta, camera, distance, targetY]);

  return (
    <OrbitControls
      ref={controls}
      target={[0, targetY, 0]}
      enablePan
      enableZoom
      minDistance={lengthMeters * 0.5}
      maxDistance={lengthMeters * 8}
      onChange={() => {
        if (!onTheta) return;
        const c = controls.current;
        if (!c) return;
        // three's azimuthal angle is measured from +Z toward +X; theta 0
        // puts the camera on +X, which is three's 90 degrees.
        const deg = (90 - (c.getAzimuthalAngle() * 180) / Math.PI + 360) % 360;
        const rounded = Math.round(deg);
        if (rounded === reported.current) return;
        reported.current = rounded;
        onTheta(rounded);
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
        <OrbitRig theta={theta} onTheta={onTheta} lengthMeters={lengthMeters} />
        <Suspense fallback={null}>
          <Model lengthMeters={lengthMeters} />
        </Suspense>
        {anchored && <AnchorCable lengthMeters={lengthMeters} />}
        {placed.map((l) => (
          <SceneLight key={l.key} light={l} lengthMeters={lengthMeters} />
        ))}
      </Canvas>
    </ModelErrorBoundary>
  );
}
