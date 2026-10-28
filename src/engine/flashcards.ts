// Flashcard deck. Cards are generated from the same fixture scenarios the
// quiz draws on: one scenario gives two cards, a scene -> cite and a
// cite -> scene. Ids are stable (fixture name + direction) so the Leitner
// boxes keyed on them survive reloads. Pure: no storage, no React.

import { evaluateDisplayIn } from './evaluate';
import { scenarioPoolFor, citeOf } from './quiz';
import type { Display, FactRecord } from './types';

export type CardDirection = 'scene-to-cite' | 'cite-to-scene';

export interface Card {
  /** stable across reloads: `<fixture name>|<direction>` */
  id: string;
  direction: CardDirection;
  facts: FactRecord;
  display: Display;
  cite: string;
  /** the rule number the cite opens with, e.g. "23" from "Rule 23(a)" */
  rule: string;
  /** fact:propulsion suffix, the vessel family the filter reads */
  family: string;
}

/** The rule number a cite starts with, or '' when it carries none. */
export function ruleOf(cite: string): string {
  return /(\d+)/.exec(cite)?.[1] ?? '';
}

export function buildDeck(jurisdiction: string): Card[] {
  const out: Card[] = [];
  for (const fixture of scenarioPoolFor(jurisdiction)) {
    const display = evaluateDisplayIn(jurisdiction, fixture.facts).displays.find(
      (d) => d.lights.length > 0,
    );
    if (!display) continue;
    const cite = citeOf(jurisdiction, display);
    if (!cite) continue;
    const propulsion = String(
      (fixture.facts as Record<string, unknown>)['fact:propulsion'] ?? '',
    );
    for (const direction of ['scene-to-cite', 'cite-to-scene'] as const) {
      out.push({
        id: `${fixture.name}|${direction}`,
        direction,
        facts: fixture.facts,
        display,
        cite,
        rule: ruleOf(cite),
        family: propulsion.slice(propulsion.indexOf(':') + 1),
      });
    }
  }
  return out;
}

export interface DeckFilter {
  rule?: string;
  family?: string;
}

export function filterDeck(deck: Card[], f: DeckFilter): Card[] {
  return deck.filter(
    (c) => (!f.rule || c.rule === f.rule) && (!f.family || c.family === f.family),
  );
}
