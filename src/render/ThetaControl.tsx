// The relative-bearing slider, shared by the bearing view and the Benchy
// view so both drive the same angle with the same control.

import type { ReactElement } from 'react';
import { bearingLabel } from 'nav-wright';
import type { SceneLabels } from 'nav-wright';

export function ThetaControl({
  theta,
  onTheta,
  labels,
}: {
  theta: number;
  onTheta: (t: number) => void;
  labels: SceneLabels;
}): ReactElement {
  return (
    <div className="theta-control">
      <label htmlFor="theta">{labels.bearingThetaLabel}</label>
      <input
        id="theta"
        type="range"
        min={0}
        max={359}
        step={1}
        value={Math.round(theta)}
        onChange={(e) => onTheta(Number(e.target.value))}
        aria-valuetext={labels.bearingThetaValue(
          Math.round(theta),
          labels.aspect[bearingLabel(theta)],
        )}
      />
      <span className="theta-readout">
        {Math.round(theta)}°&ensp;
        {labels.aspect[bearingLabel(theta)]}
      </span>
    </div>
  );
}
