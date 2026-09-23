// colregs-engine ranks `displays[]` most specific concession first, base
// rule last (colregs-engine #137, ruled in searoom #152), and searoom opens
// every scene on index 0. The nine rows of that issue's acceptance table,
// re-asserted here through this app's own seam, so an engine regression
// fails in this repo and not only upstream.

import { describe, expect, it } from 'vitest';
import { evaluateDisplayIn } from './evaluate';
import type { FactRecord } from './types';

interface Row {
  name: string;
  jurisdiction: string;
  facts: FactRecord;
  /** The entries of display 0, order-independent. */
  display0: string[];
}

const ROWS: Row[] = [
  {
    name: 'sail 10 m anchored: 30(b), not the 30(a) big-ship pair',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:length_m': 10,
    },
    display0: ['rule:30b'],
  },
  {
    name: 'power 10 m underway: 23(d)(i)',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 10,
    },
    display0: ['rule:23d_i'],
  },
  {
    name: 'power 6 m / 7 kn underway: 23(d)(ii), the tighter gate',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 6,
      'fact:max_speed_kn': 7,
    },
    display0: ['rule:23d_ii'],
  },
  {
    name: 'sail 10 m underway: 25(b) tricolor',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 10,
    },
    display0: ['rule:25b'],
  },
  {
    name: 'oars 4 m: 25(d)(ii) torch only',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:oars',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 4,
    },
    display0: ['rule:25d_ii'],
  },
  {
    name: 'sail 6 m underway: 25(b), with 25(d)(i) last',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 6,
    },
    display0: ['rule:25b'],
  },
  {
    name: 'sail 10 m aground: 30(b) + 30(d)',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:aground',
      'fact:length_m': 10,
    },
    display0: ['rule:30b', 'rule:30d'],
  },
  {
    name: 'RAM 30 m anchored: 27(b) + 30(b)',
    jurisdiction: 'intl',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:ram',
      'fact:position': 'position:anchored',
      'fact:length_m': 30,
    },
    display0: ['rule:27b_i', 'rule:27b_iv', 'rule:30b'],
  },
  {
    name: 'pilot 15 m anchored: 29(a) + 30(b)',
    jurisdiction: 'intl',
    facts: {
      'fact:activity': 'activity:pilot',
      'fact:propulsion': 'propulsion:power',
      'fact:position': 'position:anchored',
      'fact:length_m': 15,
    },
    display0: ['rule:29a', 'rule:30b'],
  },
];

describe('displays[] is ranked, concession first', () => {
  for (const row of ROWS) {
    it(row.name, () => {
      const evaln = evaluateDisplayIn(row.jurisdiction, row.facts);
      expect([...(evaln.displays[0]?.entries ?? [])].sort()).toEqual(
        [...row.display0].sort(),
      );
    });
  }

  it('the base rule is still lawful, just not first', () => {
    const anchored = evaluateDisplayIn('intl', {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:length_m': 10,
    });
    expect(anchored.displays.flatMap((d) => d.entries)).toContain('rule:30a');
  });

  it("sail 6 m underway keeps 25(d)(i)'s torch last", () => {
    const evaln = evaluateDisplayIn('intl', {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:length_m': 6,
    });
    expect(evaln.displays.at(-1)?.entries).toEqual(['rule:25d_i']);
  });
});
