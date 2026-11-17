// My boat (searoom#121): one vessel's own fact record, and the handful of
// situations she will meet on a passage — the record she was saved with
// varied over how she is going and where she lies, her length and kind kept.
// The quiz, the flashcards, the rules reference and the cheat sheet all read
// her through here, so they agree on what "her" means. Pure: no storage, no
// React.

import { evaluateDisplayIn } from './evaluate';
import { citeOf } from './quiz';
import type { Display, FactRecord } from './types';
import { paragraphsForCite } from '../data/cites';
import { resolveEntries } from '../data/jurisdictions';

/** One situation she meets; `id` keys the catalog (`myBoat.situation.<id>`). */
export interface BoatSituation {
  id:
    | 'sailing'
    | 'motoring'
    | 'rowing'
    | 'underway'
    | 'stopped'
    | 'anchored'
    | 'aground';
  facts: FactRecord;
}

/**
 * Her situations, in passage order. Her own record's activity and length
 * stay; what varies is how she goes and where she lies. A sailing vessel
 * also meets the sea under engine, when she is a power-driven vessel
 * (Rule 3(c)), so she is shown motoring too.
 */
export function boatSituations(facts: FactRecord): BoatSituation[] {
  const base = { ...facts } as Record<string, unknown>;
  // the fact record's own position and way are what this list varies
  delete base['fact:position'];
  delete base['fact:making_way'];
  const at = (patch: Record<string, unknown>) =>
    ({ ...base, ...patch }) as FactRecord;
  const going = {
    'fact:position': 'position:underway',
    'fact:making_way': true,
  };
  const propulsion = String(facts['fact:propulsion'] ?? '');
  const out: BoatSituation[] = [];
  if (propulsion === 'propulsion:sail') {
    out.push({ id: 'sailing', facts: at(going) });
    out.push({
      id: 'motoring',
      facts: at({ ...going, 'fact:propulsion': 'propulsion:power' }),
    });
  } else if (propulsion === 'propulsion:oars') {
    out.push({ id: 'rowing', facts: at(going) });
  } else {
    out.push({ id: 'underway', facts: at(going) });
    out.push({
      id: 'stopped',
      facts: at({
        'fact:position': 'position:underway',
        'fact:making_way': false,
      }),
    });
  }
  out.push({
    id: 'anchored',
    facts: at({ 'fact:position': 'position:anchored' }),
  });
  out.push({
    id: 'aground',
    facts: at({ 'fact:position': 'position:aground' }),
  });
  return out;
}

/** A situation with the displays it may lawfully show, each with its cite. */
export interface SheetRow {
  situation: BoatSituation;
  displays: { display: Display; cite: string }[];
}

/** Her situations under one jurisdiction, with their lawful displays. */
export function boatSheet(jurisdiction: string, facts: FactRecord): SheetRow[] {
  return boatSituations(facts).map((situation) => ({
    situation,
    displays: evaluateDisplayIn(jurisdiction, situation.facts)
      .displays.filter((d) => d.lights.length > 0)
      .map((display) => ({ display, cite: citeOf(jurisdiction, display) })),
  }));
}

/**
 * Scenarios shaped like the quiz's fixture cases, one per situation, so the
 * quiz and the deck can draw on her alone. The name keys progress and the
 * Leitner boxes: the same boat gives the same names across visits.
 */
export function boatScenarios(
  facts: FactRecord,
): { name: string; facts: FactRecord }[] {
  const key = boatKey(facts);
  return boatSituations(facts).map((s) => ({
    name: `my-boat ${key} ${s.id}`,
    facts: s.facts,
  }));
}

/** A stable short key for a fact record: its fields, sorted, values only. */
export function boatKey(facts: FactRecord): string {
  return Object.entries(facts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([k, v]) =>
        `${k.replace(/^fact:/, '')}=${String(v).replace(/^[a-z_]+:/, '')}`,
    )
    .join(',');
}

/** The paragraphs her situations' rules cite, in rule order, each once. */
export function boatParagraphs(
  jurisdiction: string,
  facts: FactRecord,
): string[] {
  const byId = new Map(resolveEntries(jurisdiction).map((e) => [e.id, e]));
  const seen = new Set<string>();
  for (const s of boatSituations(facts)) {
    for (const id of evaluateDisplayIn(jurisdiction, s.facts).applied) {
      const cite = byId.get(id)?.cite;
      if (!cite) continue;
      for (const p of paragraphsForCite(cite, jurisdiction)) seen.add(p);
    }
  }
  return [...seen].sort(comparePaths);
}

/** "23(a)(i)" before "23(c)" before "25(a)": rule number, then the rest. */
function comparePaths(a: string, b: string): number {
  const ra = parseInt(a, 10);
  const rb = parseInt(b, 10);
  return ra !== rb ? ra - rb : a.localeCompare(b);
}

/** Two fact records are one boat when every field agrees. */
export function sameFacts(a: FactRecord, b: FactRecord): boolean {
  return boatKey(a) === boatKey(b);
}
