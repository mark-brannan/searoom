import { describe, expect, it } from 'vitest';
import {
  boatParagraphs,
  boatScenarios,
  boatSheet,
  boatSituations,
} from './myBoat';
import { QUIZ_DIFFICULTIES, makeForward, makeReverse } from './quiz';
import { BASE_JURISDICTION } from '../data/jurisdictions';
import type { FactRecord } from './types';

const SLOOP: FactRecord = {
  'fact:propulsion': 'propulsion:sail',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 12,
};

const POWER_60: FactRecord = {
  ...SLOOP,
  'fact:propulsion': 'propulsion:power',
  'fact:length_m': 60,
};
const DINGHY: FactRecord = {
  ...SLOOP,
  'fact:propulsion': 'propulsion:oars',
  'fact:length_m': 3,
};
const KINDS = [
  ['12 m sloop', SLOOP, ['sailing', 'motoring', 'anchored', 'aground']],
  [
    '60 m power vessel',
    POWER_60,
    ['underway', 'stopped', 'anchored', 'aground'],
  ],
  ['3 m boat under oars', DINGHY, ['rowing', 'anchored', 'aground']],
] as const;

describe('my boat', () => {
  it.each(KINDS)('meets the %s in her own situations', (_, facts, ids) => {
    expect(boatSituations(facts).map((s) => s.id)).toEqual(ids);
  });

  it('meets a sloop sailing, motoring, at anchor and aground, at her own length', () => {
    const s = boatSituations(SLOOP);
    expect(s.map((x) => x.id)).toEqual([
      'sailing',
      'motoring',
      'anchored',
      'aground',
    ]);
    for (const x of s) expect(x.facts['fact:length_m']).toBe(12);
    expect(s[1].facts['fact:propulsion']).toBe('propulsion:power');
  });

  it('gives every situation of a 12 m sloop at least one lawful display, each cited', () => {
    const sheet = boatSheet(BASE_JURISDICTION, SLOOP);
    for (const row of sheet) {
      expect(row.displays.length, row.situation.id).toBeGreaterThan(0);
      for (const d of row.displays)
        expect(d.cite, row.situation.id).not.toBe('');
    }
    // under sail at 12 m: sidelights and sternlight, or the masthead tricolour
    expect(sheet[0].displays.length).toBeGreaterThanOrEqual(2);
  });

  it('cites the sailing, power-driven and anchored rules', () => {
    const rules = new Set(
      boatParagraphs(BASE_JURISDICTION, SLOOP).map((p) => parseInt(p, 10)),
    );
    for (const r of [23, 25, 30]) expect(rules.has(r), `Rule ${r}`).toBe(true);
  });

  it.each(KINDS)(
    'asks only about the %s, at every level, both directions',
    (_, facts) => {
      const pool = boatScenarios(facts);
      const names = new Set(pool.map((p) => p.name));
      for (const d of QUIZ_DIFFICULTIES)
        for (let seed = 1; seed <= 10; seed++) {
          expect(
            names.has(
              makeForward(seed, BASE_JURISDICTION, d, pool).fixtureName,
            ),
          ).toBe(true);
          expect(
            names.has(
              makeReverse(seed, BASE_JURISDICTION, d, pool).fixtureName,
            ),
          ).toBe(true);
        }
    },
  );

  it('names her scenarios the same way on every visit, wherever she lies', () => {
    expect(boatScenarios({ ...SLOOP })).toEqual(boatScenarios(SLOOP));
    const atAnchor: FactRecord = {
      ...SLOOP,
      'fact:position': 'position:anchored',
    };
    expect(boatScenarios(atAnchor)).toEqual(boatScenarios(SLOOP));
  });
});
