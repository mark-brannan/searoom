// Why one chip is not another. colregs-engine ranks `displays[]` most
// specific concession first, base rule last (colregs-engine #137, ruled in
// searoom #152), so index 0 is the display the Convention wrote for this
// vessel. The chips say so in the data's own terms — the entry that makes
// this display different from its neighbours, its modality and the gate it
// sits behind. No convention table, no curated prose: every word below is
// read from the entry.

import type { Display, Entry, Modality } from '../engine/types';

/** One scalar bound out of an entry's `when` — `length_m lt 50`. */
export interface Gate {
  fact: string;
  op: 'lt' | 'lte' | 'gt' | 'gte';
  value: number;
}

/** One entry's contribution to a chip's reason line. */
export interface ReasonPart {
  id: string;
  cite: string;
  modality: Modality;
  gates: Gate[];
}

const OPS = ['lt', 'lte', 'gt', 'gte'] as const;

/** The scalar bounds in an entry's `when`, in the order the data lists them. */
export function gatesOf(entry: Entry): Gate[] {
  const out: Gate[] = [];
  for (const [fact, value] of Object.entries(entry.when ?? {})) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      continue;
    for (const op of OPS) {
      const bound = (value as Record<string, unknown>)[op];
      if (typeof bound === 'number') out.push({ fact, op, value: bound });
    }
  }
  return out;
}

/**
 * The entries that make `display` different from the others in the same
 * evaluation — the choice points. Every display in a set shares the entries
 * that fired unconditionally (27(b) for a RAM at anchor, 30(d) aground);
 * what distinguishes them is the alternative each one exercised. When
 * nothing distinguishes it — a single-display evaluation, or the "none
 * chosen" branch of a `one_of` whose option is the only entry — the
 * display's own entries are the reason.
 */
export function distinguishingEntries(
  display: Display,
  displays: readonly Display[],
): string[] {
  const shared = display.entries.filter((id) =>
    displays.every((d) => d.entries.includes(id)),
  );
  const own = display.entries.filter((id) => !shared.includes(id));
  return own.length > 0 ? own : display.entries;
}

/**
 * The reason line for one chip, one part per distinguishing entry.
 * `modalities` is the evaluation's modality map — Rule 20(c) can shift an
 * entry's modality for these facts, and the shifted one is what applies.
 */
export function reasonParts(
  display: Display,
  displays: readonly Display[],
  entryById: ReadonlyMap<string, Entry>,
  modalities: Record<string, Modality>,
): ReasonPart[] {
  return distinguishingEntries(display, displays).flatMap((id) => {
    const entry = entryById.get(id);
    if (!entry) return [];
    return [
      {
        id,
        cite: entry.cite,
        modality: modalities[id] ?? entry.modality,
        gates: gatesOf(entry),
      },
    ];
  });
}
