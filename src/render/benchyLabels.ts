// The Benchy view's own label fields, on top of nav-wright's SceneLabels.
// nav-wright's published SceneLabels (v0.1.1) predates the 3D view — it
// doesn't carry benchyAlt/benchyTiltLabel/benchyTiltValue yet. This is a
// local extension until the Benchy files move to nav-wright in phase 4b
// (#18) and those fields land upstream.

import type { SceneLabels } from 'nav-wright';
import { defaultSceneLabels } from 'nav-wright';

export interface BenchySceneLabels extends SceneLabels {
  benchyAlt: string;
  benchyTiltLabel: string;
  benchyTiltValue: (tilt: number) => string;
}

export const defaultBenchyLabels: BenchySceneLabels = {
  ...defaultSceneLabels,
  benchyAlt:
    'Benchy view: the vessel as a 3D model with her lights, free to orbit',
  benchyTiltLabel: 'Tilt',
  benchyTiltValue: (tilt) => `${tilt} degrees above the waterline`,
};
