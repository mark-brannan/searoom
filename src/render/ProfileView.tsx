// The boat from abeam (starboard side), lights glowing in place.

import { lazy, Suspense, useState } from 'react';
import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';
import { render3dEnabled } from './featureFlags';
import type { Hull } from './hulls';
import { PX, PZ } from './hulls';
import { ModelErrorBoundary } from './ModelErrorBoundary';
import type { PlacedLight } from './placement';
import type { SceneLabels } from './labels';
import { defaultSceneLabels } from './labels';
import { Glow } from './svg';

// Lazy: three.js (and the Benchy model) only ship to a browser that
// actually hits the flag, so the 2D-default path's bundle is untouched.
const BenchyModel = lazy(() =>
  import('./BenchyModel').then((m) => ({ default: m.BenchyModel })),
);

// The one hull Benchy stands in for while it's behind a flag — see
// featureFlags.ts and MODELS.md. Every other hull keeps the SVG profile
// regardless of the flag.
const BENCHY_HULL_ID = 'power-small';

export function ProfileView({
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
  const anchored = facts['fact:position'] === 'position:anchored';
  // A failed model load degrades to the 2D profile rather than to a blank
  // pane: the lights are the subject of this app, so losing them is worse
  // than losing the hull rendering.
  const [modelFailed, setModelFailed] = useState(false);

  // The scene annotations — the anchor cable and every placed light —
  // built once and drawn over whichever hull rendering is in use. Both
  // paths consume the same `placed` array (the output of placeLights), so
  // there is exactly one light-placement implementation.
  const anchorCable = anchored ? (
    <line
      x1={PX(hull.spec.bowX)}
      y1={PZ(0.14)}
      x2={PX(hull.spec.bowX) + 26}
      y2={238}
      stroke="var(--rig-stroke)"
      strokeWidth={1}
      strokeDasharray="3 4"
    />
  ) : null;

  const lights = placed.map((l) => (
    <Glow
      key={l.key}
      x={PX(l.fx) + l.py * 10}
      y={PZ(l.z)}
      color={l.color}
      flashing={l.character === 'flashing'}
      dim={l.py < -0.05}
      r={l.lightId === 'light:deck_lights' ? 9 : 5}
    />
  ));

  const svgProfile = (
    <svg
      viewBox="0 0 440 240"
      role="img"
      aria-label={labels.profileAlt}
      className="scene-svg"
    >
      <rect width="440" height="240" fill="var(--sea-night)" />
      {/* horizon + waterline */}
      <line x1="0" y1={PZ(0)} x2="440" y2={PZ(0)} stroke="var(--waterline)" strokeWidth="1" />
      <rect x="0" y={PZ(0)} width="440" height={240 - PZ(0)} fill="var(--sea-below)" />
      {anchorCable}
      <hull.Profile />
      {lights}
    </svg>
  );

  if (hull.spec.id === BENCHY_HULL_ID && render3dEnabled() && !modelFailed) {
    const lengthMeters =
      typeof facts['fact:length_m'] === 'number' ? facts['fact:length_m'] : 12;
    // The outer boundary catches a failed chunk load for the lazy import,
    // which happens before BenchyModel's own boundary exists to catch it.
    return (
      <ModelErrorBoundary fallback={svgProfile} onError={() => setModelFailed(true)}>
        <div className="scene-3d-stack" role="img" aria-label={labels.profileAlt}>
          <Suspense fallback={<div className="scene-3d" aria-hidden="true" />}>
            <BenchyModel
              lengthMeters={lengthMeters}
              label={labels.profileAlt}
              fallback={<div className="scene-3d" aria-hidden="true" />}
              onError={() => setModelFailed(true)}
            />
          </Suspense>
          {/* Same coordinate space as the SVG profile (viewBox 0 0 440 240),
              so the annotations sit where the 2D path puts them. The stand-in
              model is framed by <Bounds fit>, so registration against the
              Benchy silhouette is approximate — see the PR body. */}
          <svg
            viewBox="0 0 440 240"
            className="scene-3d-annotations"
            aria-hidden="true"
          >
            {anchorCable}
            {lights}
          </svg>
        </div>
      </ModelErrorBoundary>
    );
  }

  return svgProfile;
}
