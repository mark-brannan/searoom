// The nav-wright boundary. nav-wright pins its own copy of colregs-engine,
// so its `DisplayLight` is a structurally identical but nominally distinct
// type from the one searoom's engine returns — the two `Modality` unions come
// from different generated files. One cast, here, rather than at every view.

import { placeLights as navPlaceLights } from 'nav-wright';
import type { DisplayLight } from '../engine/types';

type NavDisplayLights = Parameters<typeof navPlaceLights>[0];

export function placeLights(
  lights: DisplayLight[],
  ...rest: [
    Parameters<typeof navPlaceLights>[1],
    Parameters<typeof navPlaceLights>[2],
    Parameters<typeof navPlaceLights>[3],
  ]
): ReturnType<typeof navPlaceLights> {
  return navPlaceLights(lights as unknown as NavDisplayLights, ...rest);
}
