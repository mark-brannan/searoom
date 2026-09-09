// Renders the Benchy model in place of one hull's 2D profile (power-small),
// behind the ?render3d=1 flag — see featureFlags.ts. Everything else
// (other hulls) stays on the SVG path; the lights and the anchor
// indication are drawn over this canvas by ProfileView, from the same
// placeLights output the SVG path uses.
//
// Model: public/models/3dbenchy-lowpoly.glb — see MODELS.md for
// provenance, license and the bow-orientation check this component relies
// on (local +X is the bow). The scale/orientation math itself lives in
// modelTransform.ts, where it is unit-tested.

import { Suspense, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import { placeHullModel } from './modelTransform';

const MODEL_URL = `${import.meta.env.BASE_URL}models/3dbenchy-lowpoly.glb`;

function Benchy({ lengthMeters }: { lengthMeters: number }): ReactElement {
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

/** Heading-aligned, beam-on view: bow to the right, matching the SVG
 * profile's convention (hulls.tsx: "bow right"). */
export function BenchyModel({
  lengthMeters,
  label,
  fallback = <div className="scene-3d" />,
  onError,
}: {
  lengthMeters: number;
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
        role="img"
        aria-label={label}
      >
        <color attach="background" args={['#0a1622']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -3]} intensity={0.3} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.3}>
            <Benchy lengthMeters={lengthMeters} />
          </Bounds>
        </Suspense>
      </Canvas>
    </ModelErrorBoundary>
  );
}
