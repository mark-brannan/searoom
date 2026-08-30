// The curated base-drawing set (design doc: hybrid model — a small set of
// base vessel drawings, lights rendered dynamically on top). Coordinates
// share one space with light placement: fx fore-aft in [-1,1] (bow +1),
// z height (0 = waterline), py athwartships (starboard +).

import type { ReactElement } from 'react';
import type { FactRecord } from '../engine/types';

export interface HullSpec {
  id: string;
  /** half-beam in py units */
  beam: number;
  mastX: number;
  mastTopZ: number;
  aftMastX: number;
  aftMastTopZ: number;
  sideLightX: number;
  sideLightZ: number;
  bowX: number;
  sternX: number;
  sternZ: number;
}

// profile view mapping (viewBox 0 0 440 240, waterline y=185, bow right)
export const PX = (fx: number) => 220 + fx * 185;
export const PZ = (z: number) => 185 - z * 150;

const hullStroke = 'var(--hull-stroke)';
const hullFill = 'var(--hull-fill)';
const rigStroke = 'var(--rig-stroke)';

function d(points: [number, number][]): string {
  return (
    points
      .map(([fx, z], i) => `${i === 0 ? 'M' : 'L'}${PX(fx).toFixed(1)},${PZ(z).toFixed(1)}`)
      .join(' ') + ' Z'
  );
}

function mast(fx: number, topZ: number, deckZ = 0.12): ReactElement {
  return (
    <line
      x1={PX(fx)}
      y1={PZ(deckZ)}
      x2={PX(fx)}
      y2={PZ(topZ) - 6}
      stroke={rigStroke}
      strokeWidth={2}
    />
  );
}

export interface Hull {
  spec: HullSpec;
  Profile: () => ReactElement;
  /** top-down outline points (fx, py) for the plan view */
  plan: [number, number][];
}

const sailPlan: [number, number][] = [
  [1, 0],
  [0.7, 0.16],
  [-0.1, 0.22],
  [-0.75, 0.17],
  [-0.9, 0.1],
  [-0.9, -0.1],
  [-0.75, -0.17],
  [-0.1, -0.22],
  [0.7, -0.16],
];

const shipPlan: [number, number][] = [
  [1, 0],
  [0.75, 0.2],
  [-0.6, 0.22],
  [-0.95, 0.2],
  [-0.98, 0.08],
  [-0.98, -0.08],
  [-0.95, -0.2],
  [-0.6, -0.22],
  [0.75, -0.2],
];

const sailSmall: Hull = {
  spec: {
    id: 'sail-small',
    beam: 0.2,
    mastX: 0.12,
    mastTopZ: 0.92,
    aftMastX: -0.4,
    aftMastTopZ: 0.7,
    sideLightX: 0.35,
    sideLightZ: 0.16,
    bowX: 0.92,
    sternX: -0.88,
    sternZ: 0.16,
  },
  plan: sailPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.95, 0.2],
          [0.98, 0.12],
          [0.85, 0.02],
          [-0.8, 0.02],
          [-0.9, 0.14],
          [-0.88, 0.2],
          [0.4, 0.24],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* cabin trunk */}
      <path
        d={d([
          [0.35, 0.2],
          [0.3, 0.3],
          [-0.45, 0.3],
          [-0.55, 0.2],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.12, 0.92, 0.3)}
      {/* boom + backstay + forestay */}
      <line x1={PX(0.12)} y1={PZ(0.4)} x2={PX(-0.6)} y2={PZ(0.36)} stroke={rigStroke} strokeWidth={1.5} />
      <line x1={PX(0.12)} y1={PZ(0.92) - 6} x2={PX(0.94)} y2={PZ(0.18)} stroke={rigStroke} strokeWidth={0.75} />
      <line x1={PX(0.12)} y1={PZ(0.92) - 6} x2={PX(-0.87)} y2={PZ(0.18)} stroke={rigStroke} strokeWidth={0.75} />
    </g>
  ),
};

const sailLarge: Hull = {
  ...sailSmall,
  spec: { ...sailSmall.spec, id: 'sail-large', mastTopZ: 1.05, beam: 0.22 },
};

const openBoat: Hull = {
  spec: {
    id: 'open',
    beam: 0.22,
    mastX: 0.0,
    mastTopZ: 0.5,
    aftMastX: -0.3,
    aftMastTopZ: 0.4,
    sideLightX: 0.3,
    sideLightZ: 0.14,
    bowX: 0.85,
    sternX: -0.8,
    sternZ: 0.14,
  },
  plan: sailPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.85, 0.2],
          [0.9, 0.1],
          [0.75, 0.03],
          [-0.7, 0.03],
          [-0.8, 0.12],
          [-0.8, 0.18],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* thwarts */}
      <line x1={PX(0.25)} y1={PZ(0.16)} x2={PX(0.25)} y2={PZ(0.08)} stroke={rigStroke} strokeWidth={1} />
      <line x1={PX(-0.35)} y1={PZ(0.16)} x2={PX(-0.35)} y2={PZ(0.08)} stroke={rigStroke} strokeWidth={1} />
    </g>
  ),
};

const powerSmall: Hull = {
  spec: {
    id: 'power-small',
    beam: 0.22,
    mastX: 0.05,
    mastTopZ: 0.6,
    aftMastX: -0.45,
    aftMastTopZ: 0.5,
    sideLightX: 0.45,
    sideLightZ: 0.2,
    bowX: 0.9,
    sternX: -0.85,
    sternZ: 0.18,
  },
  plan: sailPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.92, 0.28],
          [0.95, 0.16],
          [0.8, 0.04],
          [-0.75, 0.04],
          [-0.85, 0.14],
          [-0.85, 0.24],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* windscreen + hardtop */}
      <path
        d={d([
          [0.4, 0.26],
          [0.25, 0.44],
          [-0.35, 0.44],
          [-0.45, 0.24],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.05, 0.6, 0.44)}
    </g>
  ),
};

const powerLarge: Hull = {
  spec: {
    id: 'power-large',
    beam: 0.22,
    mastX: 0.2,
    mastTopZ: 0.78,
    aftMastX: -0.5,
    aftMastTopZ: 0.95,
    sideLightX: 0.3,
    sideLightZ: 0.32,
    bowX: 0.92,
    sternX: -0.88,
    sternZ: 0.24,
  },
  plan: shipPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.94, 0.34],
          [0.97, 0.2],
          [0.85, 0.05],
          [-0.85, 0.05],
          [-0.9, 0.2],
          [-0.9, 0.3],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      <path
        d={d([
          [0.45, 0.32],
          [0.4, 0.5],
          [0.05, 0.5],
          [-0.05, 0.62],
          [-0.6, 0.62],
          [-0.68, 0.3],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.2, 0.78, 0.5)}
      {mast(-0.5, 0.95, 0.62)}
    </g>
  ),
};

const ship: Hull = {
  spec: {
    id: 'ship',
    beam: 0.24,
    mastX: 0.55,
    mastTopZ: 0.85,
    aftMastX: -0.35,
    aftMastTopZ: 1.05,
    sideLightX: -0.3,
    sideLightZ: 0.55,
    bowX: 0.95,
    sternX: -0.92,
    sternZ: 0.3,
  },
  plan: shipPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.97, 0.42],
          [1.0, 0.3],
          [0.9, 0.08],
          [-0.9, 0.08],
          [-0.95, 0.26],
          [-0.93, 0.4],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* hatches / containers amidships */}
      <path
        d={d([
          [0.45, 0.42],
          [0.45, 0.52],
          [-0.25, 0.52],
          [-0.25, 0.42],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={0.75}
      />
      {/* aft superstructure */}
      <path
        d={d([
          [-0.35, 0.4],
          [-0.35, 0.72],
          [-0.7, 0.72],
          [-0.7, 0.4],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.55, 0.85, 0.42)}
      {mast(-0.35, 1.05, 0.72)}
      {/* funnel */}
      <path
        d={d([
          [-0.55, 0.72],
          [-0.52, 0.86],
          [-0.62, 0.86],
          [-0.65, 0.72],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
    </g>
  ),
};

const trawler: Hull = {
  spec: {
    id: 'trawler',
    beam: 0.22,
    mastX: 0.15,
    mastTopZ: 0.9,
    aftMastX: -0.55,
    aftMastTopZ: 0.72,
    sideLightX: 0.2,
    sideLightZ: 0.35,
    bowX: 0.92,
    sternX: -0.86,
    sternZ: 0.2,
  },
  plan: sailPlan,
  Profile: () => (
    <g>
      <path
        d={d([
          [0.93, 0.36],
          [0.96, 0.22],
          [0.82, 0.05],
          [-0.8, 0.05],
          [-0.86, 0.16],
          [-0.86, 0.26],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* wheelhouse forward */}
      <path
        d={d([
          [0.55, 0.34],
          [0.5, 0.56],
          [0.15, 0.56],
          [0.1, 0.32],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.15, 0.9, 0.56)}
      {/* aft gantry */}
      <path
        d={`M${PX(-0.45)},${PZ(0.22)} L${PX(-0.55)},${PZ(0.72)} L${PX(-0.65)},${PZ(0.22)}`}
        fill="none"
        stroke={rigStroke}
        strokeWidth={2}
      />
      {/* trawl warp */}
      <line x1={PX(-0.55)} y1={PZ(0.7)} x2={PX(-0.95)} y2={PZ(0.02)} stroke={rigStroke} strokeWidth={0.75} />
    </g>
  ),
};

const tug: Hull = {
  spec: {
    id: 'tug',
    beam: 0.24,
    mastX: 0.1,
    mastTopZ: 0.95,
    aftMastX: -0.5,
    aftMastTopZ: 0.6,
    sideLightX: 0.25,
    sideLightZ: 0.38,
    bowX: 0.88,
    sternX: -0.85,
    sternZ: 0.2,
  },
  plan: [
    [1, 0],
    [0.6, 0.2],
    [-0.6, 0.22],
    [-0.85, 0.16],
    [-0.9, 0],
    [-0.85, -0.16],
    [-0.6, -0.22],
    [0.6, -0.2],
  ],
  Profile: () => (
    <g>
      <path
        d={d([
          [0.9, 0.4],
          [0.94, 0.24],
          [0.8, 0.06],
          [-0.8, 0.06],
          [-0.86, 0.18],
          [-0.86, 0.26],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* tall wheelhouse */}
      <path
        d={d([
          [0.4, 0.38],
          [0.35, 0.68],
          [-0.05, 0.68],
          [-0.12, 0.36],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1}
      />
      {mast(0.1, 0.95, 0.68)}
      {/* towing bitts + fender bow */}
      <line x1={PX(-0.4)} y1={PZ(0.26)} x2={PX(-0.4)} y2={PZ(0.36)} stroke={rigStroke} strokeWidth={2.5} />
      <path
        d={`M${PX(0.9)},${PZ(0.4)} q6,-4 4,-16`}
        fill="none"
        stroke={hullStroke}
        strokeWidth={2.5}
      />
    </g>
  ),
};

const barge: Hull = {
  spec: {
    id: 'barge',
    beam: 0.24,
    mastX: 0.0,
    mastTopZ: 0.45,
    aftMastX: -0.5,
    aftMastTopZ: 0.4,
    sideLightX: 0.75,
    sideLightZ: 0.18,
    bowX: 0.9,
    sternX: -0.88,
    sternZ: 0.16,
  },
  plan: [
    [1, 0.12],
    [1, -0.12],
    [0.9, -0.2],
    [-0.9, -0.2],
    [-1, -0.12],
    [-1, 0.12],
    [-0.9, 0.2],
    [0.9, 0.2],
  ],
  Profile: () => (
    <g>
      <path
        d={d([
          [0.92, 0.2],
          [0.95, 0.1],
          [0.9, 0.04],
          [-0.9, 0.04],
          [-0.94, 0.1],
          [-0.92, 0.2],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={1.5}
      />
      {/* cargo mound */}
      <path
        d={d([
          [0.7, 0.2],
          [0.4, 0.3],
          [-0.5, 0.3],
          [-0.75, 0.2],
        ])}
        fill={hullFill}
        stroke={hullStroke}
        strokeWidth={0.75}
      />
    </g>
  ),
};

export function selectHull(facts: FactRecord): Hull {
  const activity = facts['fact:activity'];
  const length = typeof facts['fact:length_m'] === 'number'
    ? (facts['fact:length_m'] as number)
    : 12;
  if (activity === 'activity:fishing' || activity === 'activity:trawling')
    return trawler;
  if (activity === 'activity:towing' || activity === 'activity:pushing')
    return tug;
  if (activity === 'activity:being_towed') return barge;
  const propulsion = facts['fact:propulsion'];
  if (propulsion === 'propulsion:oars') return openBoat;
  if (propulsion === 'propulsion:sail')
    return length < 20 ? sailSmall : sailLarge;
  if (length < 7) return openBoat;
  if (length < 20) return powerSmall;
  if (length < 50) return powerLarge;
  return ship;
}

export const allHulls = {
  sailSmall,
  sailLarge,
  openBoat,
  powerSmall,
  powerLarge,
  ship,
  trawler,
  tug,
  barge,
};
