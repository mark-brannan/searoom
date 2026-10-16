import { describe, expect, it } from 'vitest';
import { selectHull } from 'nav-wright';
import type { PlacedLight } from 'nav-wright';
import { profileHullModel } from 'nav-wright/profile';
import type { FactRecord } from '../engine/types';
import { evaluateDisplayIn } from '../engine/evaluate';
import { lights as lightCatalog } from '../data/colregs';
import { PRESETS } from '../data/presets';
import { placeLights } from './navWright';
import { modelUrlForVariant } from './hullModels';
import { loadHullScene } from './meshProfile';
import { annexISeatBreaches, meshOnlyBreaches } from './annexISeats';
import { meshSeatsLawful, seatLights } from './MeshProfileView';

const light = (lightId: string, fx: number): PlacedLight => ({
  key: `${lightId}@${fx}`,
  lightId,
  color: 'white',
  character: 'steady',
  arc: null,
  fx,
  py: 0,
  z: 1,
  sourceEntry: 'rule:test',
});
const at = (x: number) => [x, 5, 0] as const;
const ship60: FactRecord = {
  'fact:propulsion': 'propulsion:power',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 60,
};

describe('annexISeatBreaches', () => {
  const placed = [
    light('light:masthead', 0.5),
    light('light:masthead', -0.6),
    light('light:sidelights', 0.4),
  ];

  it('passes masthead lights a half length apart, forward one near the stem', () => {
    // stem +30 m: forward light 10 m (1/6 L) aft of it, 32 m apart
    expect(
      annexISeatBreaches(placed, [at(20), at(-12), at(15)], 60, ship60),
    ).toEqual([]);
  });

  it('flags the ferry-loft seats: both masthead lights abaft amidships, 0.01 L apart', () => {
    const cites = annexISeatBreaches(
      placed,
      [at(-0.31 * 60), at(-0.32 * 60), at(0.39 * 60)],
      60,
      ship60,
    ).map((b) => b.cite);
    expect(cites).toEqual(['AnxI.3(a)', 'AnxI.3(a)', 'AnxI.3(b)']);
  });

  it('caps the separation at 100 m', () => {
    // 300 m ship: 100 m apart is enough even though it is under half
    expect(
      annexISeatBreaches(placed, [at(100), at(0), at(90)], 300, {
        ...ship60,
        'fact:length_m': 300,
      }),
    ).toEqual([]);
  });

  it('holds sidelights abaft the masthead only on a power-driven vessel of 20 m or more', () => {
    const one = [light('light:masthead', 0.5), light('light:sidelights', 0.4)];
    const seats = [at(2), at(4)];
    expect(annexISeatBreaches(one, seats, 30, ship60)).toHaveLength(1);
    expect(annexISeatBreaches(one, seats, 15, ship60)).toEqual([]);
    expect(
      annexISeatBreaches(one, seats, 30, {
        ...ship60,
        'fact:propulsion': 'propulsion:sail',
      }),
    ).toEqual([]);
  });
});

describe('meshOnlyBreaches', () => {
  it('keeps the mesh for a fault the hand-drawn profile shares', () => {
    // hand-drawn: masthead at fx 0.1, sidelights at fx 0.25, already 3(b)
    const placed = [light('light:masthead', 0.1), light('light:sidelights', 0.25)];
    expect(annexISeatBreaches(placed, [at(1), at(3)], 30, ship60)).toHaveLength(1);
    expect(meshOnlyBreaches(placed, [at(1), at(3)], 30, ship60)).toEqual([]);
  });
});

/** Seat a fact record's usual display on one of its hull's meshes, the way
 * the Profile view does, and ask whether the mesh profile may be drawn. */
async function meshDrawn(facts: FactRecord, mesh = ''): Promise<boolean> {
  const hull = selectHull(facts);
  const length = facts['fact:length_m'] as number;
  const display = evaluateDisplayIn('intl', facts).displays[0];
  const placed = placeLights(display.lights, hull.spec, facts, lightCatalog);
  const scene = await loadHullScene(modelUrlForVariant(hull, mesh));
  const profile = profileHullModel(scene, length, hull.spec);
  if (!profile) throw new Error(`${hull.spec.id}: mesh has no profile`);
  const seats = seatLights(profile, placed, length, hull);
  return meshSeatsLawful(placed, seats, length, facts);
}

const preset = (id: string) => PRESETS.find((p) => p.id === id)!.facts;

describe('the Profile view falls back when the mesh seats break Annex I', () => {
  it('draws the hand-drawn profile for the 60 m ship on ferry-loft', async () => {
    expect(selectHull(ship60).spec.id).toBe('ferry');
    expect(await meshDrawn(ship60, 'ferry-loft.glb')).toBe(false);
  });

  it('still draws the sloop and the trawler from their meshes', async () => {
    expect(await meshDrawn(preset('sloop'))).toBe(true);
    expect(await meshDrawn(preset('trawler'))).toBe(true);
  });

  it('keeps the tug on its mesh: the hand-drawn tug has the same 3(b) fault', async () => {
    expect(await meshDrawn(preset('tug'))).toBe(true);
  });
});
