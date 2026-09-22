// One case per "yes" row of issue #152's sibling table: the fact record a
// convention row targets must pick the display it names as the opening one,
// not combination 0 (the engine's "no alternative chosen").

import { describe, expect, it } from 'vitest';
import { evaluateDisplay } from 'colregs-engine';
import { applicability, colregsVersion } from './colregs';
import { CONVENTIONS, conventionFor, usualDisplayIndex } from './conventions';
import type { FactRecord } from '../engine/types';

function evaluate(jurisdiction: string, facts: FactRecord) {
  return evaluateDisplay(facts, {
    data: applicability as never,
    jurisdiction,
    dataVersion: colregsVersion,
  });
}

interface Case {
  id: string;
  jurisdiction: string;
  facts: FactRecord;
}

const CASES: Case[] = [
  {
    id: 'rule:29a',
    jurisdiction: 'intl',
    facts: {
      'fact:activity': 'activity:pilot',
      'fact:position': 'position:anchored',
      'fact:length_m': 10,
    },
  },
  {
    id: 'rule:30d',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:aground',
      'fact:length_m': 10,
    },
  },
  {
    id: 'rule:30b',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:length_m': 10,
    },
  },
  {
    id: 'rule:30b:mooring_buoy',
    jurisdiction: 'us/inland',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:moored',
      'fact:on_mooring_buoy': true,
      'fact:length_m': 10,
    },
  },
  {
    id: 'rule:23d_ii',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 6,
      'fact:max_speed_kn': 5,
    },
  },
  {
    id: 'rule:23d_i',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 10,
    },
  },
  {
    id: 'rule:25d_ii',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:oars',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 4,
    },
  },
];

describe('conventions', () => {
  it('covers every case with its own row, in the order it is checked', () => {
    const ids = CASES.map((c) => c.id);
    expect(ids).toEqual(CONVENTIONS.map((c) => c.id));
  });

  it.each(CASES)('$id opens on the usual display, not display 0', (c) => {
    const evaln = evaluate(c.jurisdiction, c.facts);
    // the bug: display 0 is always "no alternative chosen", so a fact
    // record with more than one lawful display must not open there.
    expect(evaln.displays.length).toBeGreaterThan(1);

    const idx = usualDisplayIndex(c.jurisdiction, c.facts, evaln.displays);
    expect(idx).not.toBe(0);
    expect(idx).toBeDefined();

    const row = conventionFor(c.jurisdiction, c.facts);
    expect(row?.id).toBe(c.id);
    expect(evaln.displays[idx!].chosen.sort()).toEqual(row!.chosen.sort());
  });

  it('leaves an unmatched fact record at display 0 (sail underway, already the practice case)', () => {
    const facts: FactRecord = {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 10,
    };
    expect(conventionFor('intl', facts)).toBeUndefined();
    const evaln = evaluate('intl', facts);
    expect(
      usualDisplayIndex('intl', facts, evaln.displays),
    ).toBeUndefined();
  });
});
