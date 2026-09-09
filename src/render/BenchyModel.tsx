// Renders the Benchy model in place of one hull's 2D profile (power-small),
// behind the ?render3d=1 flag — see featureFlags.ts. Everything else
// (lights, other hulls) stays on the SVG path.
//
// Model: public/models/3dbenchy-lowpoly.glb — see MODELS.md for
// provenance, license and the bow-orientation check this component relies
// on (local +X is the bow).

import { Suspense, useMemo } from 'react';
import type { ReactElement } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = `${import.meta.env.BASE_URL}models/3dbenchy-lowpoly.glb`;

function Benchy({ lengthMeters }: { lengthMeters: number }): ReactElement {
  const { scene } = useGLTF(MODEL_URL);

  const group = useMemo(() => {
    const g = scene.clone(true);

    // Model space (millimetres, per the STL source): local +X is the bow,
    // local Y is beam, local Z is height. Rotate height onto three.js's
    // conventional up axis; this leaves the bow on +X untouched.
    g.rotation.x = -Math.PI / 2;

    const rawSize = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3());
    const scale = rawSize.x > 0 ? lengthMeters / rawSize.x : 1;
    g.scale.setScalar(scale);

    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const center = box.getCenter(new THREE.Vector3());
    // Center fore-aft and athwartships; rest the keel on the waterline.
    g.position.set(-center.x, -box.min.y, -center.z);

    return g;
  }, [scene, lengthMeters]);

  return <primitive object={group} />;
}
useGLTF.preload(MODEL_URL);

/** Heading-aligned, beam-on view: bow to the right, matching the SVG
 * profile's convention (hulls.tsx: "bow right"). */
export function BenchyModel({ lengthMeters }: { lengthMeters: number }): ReactElement {
  return (
    <Canvas className="scene-3d" dpr={[1, 2]} gl={{ antialias: true }}>
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
  );
}
