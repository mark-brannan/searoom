// nav-wright owns the label interface for the scene views it ships
// (profile, bearing, plan). The Benchy view is searoom's own, so its three
// keys extend that interface here rather than widening nav-wright's — the
// package's SceneLabels stays exactly the contract its views need.

import { defaultSceneLabels } from 'nav-wright';
import type { SceneLabels } from 'nav-wright';

export interface SearoomSceneLabels extends SceneLabels {
  benchyAlt: string;
  benchyTiltLabel: string;
  benchyTiltValue: (tilt: number) => string;
}

export const defaultSearoomSceneLabels: SearoomSceneLabels = {
  ...defaultSceneLabels,
  benchyAlt:
    'Benchy view: the vessel as a 3D model with her lights, free to orbit',
  benchyTiltLabel: 'Tilt',
  benchyTiltValue: (tilt) => `${tilt} degrees above the waterline`,
};
