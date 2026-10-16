// The Profile view drawn from the hull's selected mesh: a silhouette in the
// existing wireframe palette (no colour, no texture), lights seated where the
// 3D view seats them (anchorLights on the same profile). The hand-drawn SVG
// profile stays as the fallback while a mesh loads, if it fails, when the
// seats break Annex I horizontal positioning (annexISeats.ts), or when
// profileSource() says 'svg'.

import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Glow, ProfileView, PX, PZ } from 'nav-wright';
import type { Hull, PlacedLight, SceneLabels } from 'nav-wright';
import { anchorLights, profileHullModel } from 'nav-wright/profile';
import type { StationProfile } from 'nav-wright/profile';
import type { FactRecord } from 'colregs-engine';
// Not on nav-wright's export map; the same reach meshProfile.ts makes, for the
// same reason: the view's own placement, not a copy of it.
import { placeScene } from '../../node_modules/nav-wright/dist/sceneProfile.js';
import { lightRadius } from '../../node_modules/nav-wright/dist/modelTransform.js';
import {
  outlineOf,
  silhouettePath,
  verticalFit,
  xPixel,
  yPixel,
} from './silhouette';
import { meshOnlyBreaches } from './annexISeats';

/** Which profile to draw. The hand-drawn SVG is kept behind `?profile=svg`. */
export function profileSource(
  search: string = globalThis.location?.search ?? '',
): 'mesh' | 'svg' {
  return new URLSearchParams(search).get('profile') === 'svg' ? 'svg' : 'mesh';
}

/** The lights seated on a mesh's profile as the 3D view seats them, with
 * its clearance (BenchyModel), so a light clears the structure it is seated
 * on instead of centring on its edge. */
export function seatLights(
  profile: StationProfile,
  placed: PlacedLight[],
  length: number,
  hull: Hull,
): [number, number, number][] {
  return anchorLights(placed, length, hull.spec, profile, lightRadius(length));
}

/** False when the mesh's seats break an Annex I 3(a)/3(b) requirement the
 * hand-drawn profile keeps: the view then draws the hand-drawn one. */
export function meshSeatsLawful(
  placed: PlacedLight[],
  seats: readonly (readonly [number, number, number])[],
  length: number,
  facts: FactRecord,
): boolean {
  return meshOnlyBreaches(placed, seats, length, facts).length === 0;
}

const scenes = new Map<string, Promise<Group>>();
function loadScene(url: string): Promise<Group> {
  let p = scenes.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url).then((g) => g.scene);
    scenes.set(url, p);
    p.catch(() => scenes.delete(url));
  }
  return p;
}

export function MeshProfileView({
  modelUrl,
  hull,
  placed,
  facts,
  labels,
}: {
  modelUrl: string;
  hull: Hull;
  placed: PlacedLight[];
  facts: FactRecord;
  labels?: SceneLabels;
}): ReactElement {
  const length =
    typeof facts['fact:length_m'] === 'number' ? facts['fact:length_m'] : 12;
  const [loaded, setLoaded] = useState<{ url: string; scene: Group } | null>(
    null,
  );
  useEffect(() => {
    if (profileSource() === 'svg') return;
    let live = true;
    loadScene(modelUrl).then(
      (scene) => live && setLoaded({ url: modelUrl, scene }),
      () => live && setLoaded(null),
    );
    return () => {
      live = false;
    };
  }, [modelUrl]);

  const profile: StationProfile | null = useMemo(
    () =>
      loaded && loaded.url === modelUrl
        ? profileHullModel(loaded.scene, length, hull.spec)
        : null,
    [loaded, modelUrl, length, hull],
  );
  const outline = useMemo(
    () =>
      loaded && loaded.url === modelUrl
        ? outlineOf(placeScene(loaded.scene, length, hull.spec), length)
        : null,
    [loaded, modelUrl, length, hull],
  );
  const seats = useMemo(
    () => (profile ? seatLights(profile, placed, length, hull) : null),
    [profile, placed, length, hull],
  );
  const lawful = useMemo(
    () => (seats ? meshSeatsLawful(placed, seats, length, facts) : false),
    [seats, placed, length, facts],
  );

  const fit = useMemo(
    () =>
      profile && outline && seats
        ? verticalFit(
            Math.max(
              profile.mast.top,
              ...outline.top,
              ...seats.map((s) => s[1]),
            ),
            length,
          )
        : 1,
    [profile, outline, seats, length],
  );

  if (
    profileSource() === 'svg' ||
    !profile ||
    !outline ||
    !seats ||
    !lawful
  ) {
    return (
      <ProfileView hull={hull} placed={placed} facts={facts} labels={labels} />
    );
  }

  const anchored = facts['fact:position'] === 'position:anchored';
  return (
    <svg
      viewBox="0 0 440 240"
      role="img"
      aria-label={labels?.profileAlt}
      className="scene-svg"
      data-profile-source="mesh"
    >
      <rect width="440" height="240" fill="var(--sea-night)" />
      <line
        x1="0"
        y1={PZ(0)}
        x2="440"
        y2={PZ(0)}
        stroke="var(--waterline)"
        strokeWidth="1"
      />
      <rect
        x="0"
        y={PZ(0)}
        width="440"
        height={240 - PZ(0)}
        fill="var(--sea-below)"
      />
      {anchored && (
        <line
          x1={PX(hull.spec.bowX)}
          y1={PZ(0.14)}
          x2={PX(hull.spec.bowX) + 26}
          y2={238}
          stroke="var(--rig-stroke)"
          strokeWidth={1}
          strokeDasharray="3 4"
        />
      )}
      <path
        d={silhouettePath(outline, length, fit)}
        fill="var(--hull-fill)"
        stroke="var(--hull-stroke)"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {placed.map((l, i) => (
        <Glow
          key={l.key}
          x={xPixel(seats[i][0], length) + l.py * 10}
          y={yPixel(seats[i][1], length, fit)}
          color={l.color}
          flashing={l.character === 'flashing'}
          dim={l.py < -0.05}
          r={l.lightId === 'light:deck_lights' ? 9 : 5}
        />
      ))}
    </svg>
  );
}
