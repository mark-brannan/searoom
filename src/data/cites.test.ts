// Acceptance bar: every entry id in the applicability data is reachable
// through the sandbox — each rules-mode entry chip links to a fixture
// fact record that fires it, under that fixture's own jurisdiction.

import { describe, expect, it } from 'vitest';
import { applicability } from './colregs';
import { evaluateDisplayIn } from '../engine/evaluate';
import {
  BASE_JURISDICTION,
  entrySuppressionsFor,
} from './jurisdictions';
import { factsForEntry, jurisdictionForEntry, paragraphsForCite } from './cites';

// `evaluateDisplay` answers the one-vessel lights-and-shapes category only
// (colregs ADR 0005). The two-vessel categories — which vessel gives way —
// read a Situation, not a FactRecord; colregs ships situation fixtures for
// them but colregs-engine has no Situation entry point yet, so they are not
// reachable this way. Once it exists, this loop should cover them via
// situation-fixtures.json instead of skipping.
const DISPLAY_CATEGORIES = new Set([undefined, 'category:display']);

describe('entry reachability', () => {
  for (const entry of applicability.entries) {
    if (!DISPLAY_CATEGORIES.has(entry.category)) continue;
    it(`${entry.id} has a fixture fact record that fires it`, () => {
      const facts = factsForEntry(entry.id);
      expect(facts).toBeDefined();
      const jurisdiction = jurisdictionForEntry(entry.id) ?? entry.jurisdiction;
      const evaln = evaluateDisplayIn(jurisdiction, facts!);
      expect(evaln.applied).toContain(entry.id);
    });
  }

  it('every entry cite resolves to at least one paragraph in its own jurisdiction', () => {
    for (const entry of applicability.entries) {
      const paras = paragraphsForCite(entry.cite, entry.jurisdiction);
      expect(
        paras.length > 0,
        `cite ${entry.cite} (${entry.id}) resolves to nothing under ${entry.jurisdiction}`,
      ).toBe(true);
    }
  });

  it('a tombstoned entry still resolves its cite at the base', () => {
    // ADR 0018 point 6 wants both sides visible: the entry is in force under
    // `intl`, so the Rules reference must still be able to reach its text.
    for (const s of entrySuppressionsFor('us/inland')) {
      expect(
        paragraphsForCite(s.cite, BASE_JURISDICTION).length > 0,
        `suppressed cite ${s.cite} resolves to nothing at the base`,
      ).toBe(true);
    }
  });
});
