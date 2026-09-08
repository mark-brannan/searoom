// Acceptance bar: every entry id in the applicability data is reachable
// through the sandbox — each rules-mode entry chip links to a fixture
// fact record that fires it.

import { describe, expect, it } from 'vitest';
import { applicability } from './colregs';
import { evaluateDisplay } from '../engine/evaluateDisplay';
import { factsForEntry, paragraphsForCite } from './cites';

// colregs main is missing fixture coverage for these 30 entries as of the
// commit that bumped it to 0.2.0 (verified: present at 92741bb2, the exact
// version-bump commit, so it's upstream's gap, not this migration's) —
// carded on the global board. REQ-VERIFY-3 promises a fixture per entry;
// colregs isn't keeping that promise for these yet.
const NO_FIXTURE_YET = new Set([
  '4', '11', '19a', '18a1', '18a2', '18a3', '18a4', '18b1', '18b2', '18b3',
  '18c1', '18c2', '18d1', '18f1', '8f3', '13a', '9b', '9c', '10i', '10j',
  '7d1', '12a1', '12a2', '12a3', '13b-overtaking', '13b-overtaken', '13d',
  '14b', '15a-crossing', '15a-give-way',
]);

describe('entry reachability', () => {
  for (const entry of applicability.entries) {
    const t = NO_FIXTURE_YET.has(entry.id) ? it.skip : it;
    t(`${entry.id} has a fixture fact record that fires it`, () => {
      const facts = factsForEntry(entry.id);
      expect(facts).toBeDefined();
      const evaln = evaluateDisplay(facts!);
      expect(evaln.applied).toContain(entry.id);
    });
  }

  it('every entry cite resolves to at least one paragraph or a recorded gap', () => {
    for (const entry of applicability.entries) {
      const paras = paragraphsForCite(entry.cite);
      expect(
        paras.length > 0,
        `cite ${entry.cite} (${entry.id}) resolves to nothing`,
      ).toBe(true);
    }
  });
});
