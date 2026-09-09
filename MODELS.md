# 3D models

## `public/models/3dbenchy-lowpoly.glb`

3DBenchy — a small motor-cruiser-shaped calibration boat, used as the
stand-in hull for the `power-small` vessel behind the `?render3d=1` flag
(see [src/render/featureFlags.ts](src/render/featureFlags.ts) and
[src/render/BenchyModel.tsx](src/render/BenchyModel.tsx)).

- **Source:** [CreativeTools/3DBenchy](https://github.com/CreativeTools/3DBenchy)
  at commit `b542785f9642ab39db8a778a0ccc934b3ebd829a`,
  `Single-part/3DBenchy.stl`.
- **License:** CC0 (public domain), per
  [3dbenchy.com/license](https://www.3dbenchy.com/license/).
- **Conversion:** the source STL (225,706 triangles) was decimated with
  `trimesh` + `fast-simplification` (quadric edge collapse) to 13,487
  triangles / 6,738 vertices and exported to glTF binary (glb) with
  vertex normals. No textures — a single flat PBR material. Millimetre
  units are preserved from the STL; the renderer scales the model to a
  vessel's `fact:length_m` at render time.
- **Bow orientation:** confirmed against the source mesh, not assumed. The
  hull's cross-section narrows to a point (±1.6 to 2.6mm half-beam) at the
  local `+X` extreme and stays full-width (±11mm half-beam) at the local
  `-X` extreme — the pointed prow is at `+X`, the flat transom at `-X`.
  `BenchyModel` relies on this: it rotates height (`Z`) onto three.js's
  `Y`-up axis and leaves `X` alone, so the bow ends up on `+X` in the
  rendered scene — the same "bow right" convention the SVG profile view
  uses (see [src/render/hulls.tsx](src/render/hulls.tsx)). The scale,
  rotation and waterline-centering arithmetic is in
  [src/render/modelTransform.ts](src/render/modelTransform.ts), which has
  no three.js or React in it and is unit-tested against three.js's own
  bounding-box result.
