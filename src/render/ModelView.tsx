// The same view as ProfileView — the boat from abeam with her lights — but
// with the hull drawn as a 3D model instead of an SVG silhouette. Every
// vessel gets the same model; nothing is gated on hull, size or propulsion.

import { lazy, Suspense, useState } from 'react';
import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';
import { AnchorCable, ProfileLights } from './annotations';
import type { Hull } from './hulls';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import type { PlacedLight } from './placement';
import type { SceneLabels } from './labels';
import { defaultSceneLabels } from './labels';
import { ProfileView } from './ProfileView';

// Lazy: three.js (and the model) only ship to a browser that actually
// opens this view, so the 2D views' bundle is untouched.
const HullModel = lazy(() =>
  import('./HullModel').then((m) => ({ default: m.HullModel })),
);

export function ModelView({
  hull,
  placed,
  facts,
  labels = defaultSceneLabels,
}: {
  hull: Hull;
  placed: PlacedLight[];
  facts: FactRecord;
  labels?: SceneLabels;
}): ReactElement {
  // A failed model load degrades to the 2D profile rather than to a blank
  // pane: the lights are the subject of this app, so losing them is worse
  // than losing the hull rendering.
  const [modelFailed, setModelFailed] = useState(false);

  const svgProfile = (
    <ProfileView hull={hull} placed={placed} facts={facts} labels={labels} />
  );
  if (modelFailed) return svgProfile;

  const lengthMeters =
    typeof facts['fact:length_m'] === 'number' ? facts['fact:length_m'] : 12;

  // The outer boundary catches a failed chunk load for the lazy import,
  // which happens before HullModel's own boundary exists to catch it.
  return (
    <ModelErrorBoundary fallback={svgProfile} onError={() => setModelFailed(true)}>
      <div className="scene-3d-stack" role="img" aria-label={labels.modelAlt}>
        <Suspense fallback={<div className="scene-3d" aria-hidden="true" />}>
          <HullModel
            lengthMeters={lengthMeters}
            label={labels.modelAlt}
            fallback={<div className="scene-3d" aria-hidden="true" />}
            onError={() => setModelFailed(true)}
          />
        </Suspense>
        {/* Same coordinate space as the SVG profile (viewBox 0 0 440 240),
            so the annotations sit where the 2D path puts them. The stand-in
            model is framed by <Bounds fit>, so registration against its
            silhouette is approximate — see searoom#22. */}
        <svg
          viewBox="0 0 440 240"
          className="scene-3d-annotations"
          aria-hidden="true"
        >
          <AnchorCable hull={hull} facts={facts} />
          <ProfileLights placed={placed} />
        </svg>
      </div>
    </ModelErrorBoundary>
  );
}
