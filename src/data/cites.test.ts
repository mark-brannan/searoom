// Acceptance bar: every entry id in the applicability data is reachable
// through the sandbox — each rules-mode entry chip links to a fixture
// fact record that fires it.

import { describe, expect, it } from 'vitest';
import { applicability } from './colregs';
import { evaluateDisplay } from 'colregs-engine';
import { factsForEntry, paragraphsForCite } from './cites';

// colregs 0.2.0 split the one-vessel `display` category (lights and shapes,
// evaluateDisplay's own domain) from the two-vessel `precedence`,
// `classification` and `scope` categories (which vessel gives way — read a
// Situation, not a FactRecord). colregs main carries fixtures for the
// two-vessel entries too (fixtures/situation-fixtures.json, every case
// `binding`), but colregs-engine has no evaluator for a Situation yet — only
// evaluateDisplay, which the two-vessel entries' predicates were never meant
// to run through. Tracked upstream: colregs-engine needs an evaluateSituation
// entry point before these can be reached the same way. Once it exists, this
// loop should cover them via situation-fixtures.json instead of skipping.
const TWO_VESSEL_CATEGORIES = new Set(['precedence', 'classification', 'scope']);

describe('entry reachability', () => {
  for (const entry of applicability.entries) {
    if (TWO_VESSEL_CATEGORIES.has(entry.category ?? 'display')) continue;
    it(`${entry.id} has a fixture fact record that fires it`, () => {
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
