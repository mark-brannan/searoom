// Acceptance bar: every entry id in the applicability data is reachable
// through the sandbox — each rules-mode entry chip links to a fixture
// fact record that fires it.

import { describe, expect, it } from 'vitest';
import { applicability } from './colregs';
import { evaluate } from '../engine/evaluate';
import { factsForEntry, paragraphsForCite } from './cites';

describe('entry reachability', () => {
  for (const entry of applicability.entries) {
    it(`${entry.id} has a fixture fact record that fires it`, () => {
      const facts = factsForEntry(entry.id);
      expect(facts).toBeDefined();
      const evaln = evaluate(applicability, facts!);
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
