// The chip reason line is read from the entry, never curated: cite,
// modality, and the scalar gate in its `when`.

import { describe, expect, it } from 'vitest';
import { applicability } from '../data/colregs';
import { evaluateDisplayIn } from '../engine/evaluate';
import type { FactRecord } from '../engine/types';
import { distinguishingEntries, gatesOf, reasonParts } from './displayReason';

const entryById = new Map(applicability.entries.map((e) => [e.id, e]));

const anchoredSloop: FactRecord = {
  'fact:propulsion': 'propulsion:sail',
  'fact:activity': 'activity:none',
  'fact:position': 'position:anchored',
  'fact:length_m': 10,
};

const partsFor = (jurisdiction: string, facts: FactRecord, i: number) => {
  const evaln = evaluateDisplayIn(jurisdiction, facts);
  const display = evaln.displays[i];
  expect(display).toBeDefined();
  return reasonParts(display!, evaln.displays, entryById, evaln.modalities);
};

describe('chip reason', () => {
  it('reads cite, modality and gate off the entry', () => {
    expect(partsFor('intl', anchoredSloop, 0)).toEqual([
      {
        id: 'rule:30b',
        cite: '30(b)',
        modality: 'modality:may',
        gates: [{ fact: 'fact:length_m', op: 'lt', value: 50 }],
      },
    ]);
    expect(partsFor('intl', anchoredSloop, 1)).toEqual([
      {
        id: 'rule:30a',
        cite: '30(a)',
        modality: 'modality:shall',
        gates: [],
      },
    ]);
  });

  it('reports both bounds of a two-gate concession', () => {
    expect(gatesOf(entryById.get('rule:23d_ii')!)).toEqual([
      { fact: 'fact:length_m', op: 'lt', value: 7 },
      { fact: 'fact:max_speed_kn', op: 'lte', value: 7 },
    ]);
  });

  it('names only the entries that differ, not the ones every display shares', () => {
    const aground: FactRecord = { ...anchoredSloop, 'fact:position': 'position:aground' };
    const evaln = evaluateDisplayIn('intl', aground);
    // 30(d)'s red-over-red fires in both displays; 30(a)/30(b) is the choice
    expect(evaln.displays.every((d) => d.entries.includes('rule:30d'))).toBe(true);
    expect(distinguishingEntries(evaln.displays[0]!, evaln.displays)).toEqual([
      'rule:30b',
    ]);
    expect(distinguishingEntries(evaln.displays[1]!, evaln.displays)).toEqual([
      'rule:30a',
    ]);
  });

  it('falls back to the display own entries when nothing distinguishes it', () => {
    const oars: FactRecord = {
      'fact:propulsion': 'propulsion:oars',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 4,
    };
    // the torch alone: 25(d)(ii) is in every display, so it is its own reason
    expect(partsFor('intl', oars, 0).map((p) => p.cite)).toEqual(['25(d)(ii)']);
  });
});
