// Property sweep over the fact space (searoom #123): the engine run over a
// grid of fact records at the COLREGS thresholds and every discrete value,
// asserting the invariants documented in docs/engine-notes.md ("Sweep
// invariants"). The fixture replay pins chosen cases; this finds the record
// nobody wrote a fixture for. A violation is a colregs conversation (an issue
// carrying the failing record), never an app-side patch.

import { describe, expect, it } from 'vitest';
import factsJson from 'colregs/data/facts.json';
import { applicability } from '../data/colregs';
import { evaluateDisplayIn } from './evaluate';
import type { Display, DisplayEvaluation, Entry, FactRecord } from './types';

const facts = factsJson as unknown as {
  axes: Record<string, { values: string[] }>;
};

const JURISDICTIONS = ['intl', 'us/inland'] as const;
const LENGTHS = [3, 6.9, 7, 11.9, 12, 19.9, 20, 49.9, 50, 99.9, 100, 150];
const TOW_LENGTHS = [150, 200, 201];
const SPEEDS = [19, 20, 21];

/** Every record the grid names, with the jurisdiction to evaluate it under. */
function* grid(): Generator<{ jurisdiction: string; facts: FactRecord }> {
  const propulsion = facts.axes['fact:propulsion']!.values;
  const activity = facts.axes['fact:activity']!.values;
  const position = facts.axes['fact:position']!.values;
  for (const jurisdiction of JURISDICTIONS)
    for (const p of propulsion)
      for (const a of activity)
        for (const pos of position)
          for (const makingWay of pos === 'position:underway'
            ? [true, false]
            : [undefined])
            for (const len of LENGTHS)
              for (const time of ['time:night', 'time:day'])
                for (const vis of ['visibility:good', 'visibility:restricted'])
                  for (const extra of extras(p, a, len)) {
                    const f = {
                      'fact:propulsion': p,
                      'fact:activity': a,
                      'fact:position': pos,
                      'fact:length_m': len,
                      'fact:time': time,
                      'fact:visibility': vis,
                      ...extra,
                    } as FactRecord;
                    if (makingWay !== undefined)
                      f['fact:making_way'] = makingWay;
                    yield { jurisdiction, facts: f };
                  }
}

/** The scalar and boolean variations that only matter for some records. */
function extras(
  propulsion: string,
  activity: string,
  len: number,
): FactRecord[] {
  if (activity === 'activity:towing' && len >= 12)
    return TOW_LENGTHS.map((t) => ({ 'fact:tow_length_m': t }));
  if (
    propulsion === 'propulsion:power' &&
    activity === 'activity:none' &&
    len < 20
  )
    return SPEEDS.map((s) => ({ 'fact:max_speed_kn': s }));
  if (
    propulsion === 'propulsion:power' &&
    activity === 'activity:none' &&
    len >= 20
  )
    return [{}, { 'fact:motorsailing': true }];
  return [{}];
}

// One Map keyed by entry id: entry ids are unique across the whole data set
// (asserted below), so a jurisdiction's entries never shadow another's.
const entryById = new Map<string, Entry>(
  (applicability.entries as Entry[]).map((e) => [e.id, e]),
);

const lightId = (l: { spec: { light?: string } }) => l.spec.light;

/** The `rel:excludes` ids of an entry, by id. */
function excludesOf(id: string): string[] {
  const e = entryById.get(id) as Record<string, unknown> | undefined;
  return (e?.['rel:excludes'] as string[] | undefined) ?? [];
}

function violationsOf(ev: DisplayEvaluation): string[] {
  const out: string[] = [];
  // 1. a firing entry yields a lawful display, and no display is empty
  const fired = ev.applied.filter(
    (id) =>
      !ev.exempted.some((x) => x.id === id) &&
      !ev.overridden.some((x) => x.id === id),
  );
  if (ev.displays.length === 0 && fired.length > 0) {
    const shows = fired.some((id) => {
      const e = entryById.get(id) as
        { lights?: unknown[]; shapes?: unknown[] } | undefined;
      return (e?.lights?.length ?? 0) + (e?.shapes?.length ?? 0) > 0;
    });
    if (shows) out.push(`entries fired (${fired.join(',')}) but no display`);
  }
  ev.displays.forEach((d: Display, i) => {
    const tag = `display ${i} [${d.entries.join('+')}]`;
    // A lone empty display is the engine's "nothing to show" (nothing applies,
    // everything exempted, or only night lights by day). An empty display
    // beside others is an alternative that names no entry and shows nothing.
    if (ev.displays.length > 1) {
      if (d.entries.length === 0) out.push(`${tag}: no entries`);
      if (d.lights.length + d.shapes.length === 0)
        out.push(`${tag}: shows nothing`);
    }

    // 2. no duplicate lights: the same spec from the same entry via the same import
    const seen = new Set<string>();
    for (const l of d.lights) {
      const key = JSON.stringify([l.spec, l.source_entry, l.via ?? null]);
      if (seen.has(key)) out.push(`${tag}: duplicate light ${key}`);
      seen.add(key);
    }

    // 3. at most one sternlight; sidelights in pairs or one combined lantern
    const count = (id: string) =>
      d.lights
        .filter((l) => lightId(l) === id)
        .reduce((n, l) => n + (l.spec.count ?? 1), 0);
    if (count('light:sternlight') > 1)
      out.push(`${tag}: ${count('light:sternlight')} sternlights`);
    const stbd = count('light:sidelight_starboard');
    const port = count('light:sidelight_port');
    if (stbd !== port)
      out.push(`${tag}: sidelights unpaired (stbd ${stbd}, port ${port})`);
    if (count('light:sidelights') > 0 && (stbd > 0 || port > 0))
      out.push(`${tag}: sidelight pair and combined sidelights both shown`);

    // 4. alternatives a relation excludes are never co-shown
    for (const id of d.entries)
      for (const x of excludesOf(id))
        if (d.entries.includes(x))
          out.push(`${tag}: ${id} excludes ${x} but both shown`);
  });

  // 5. a `shall` entry that stands (not exempted, overridden, or replaced by a
  // chosen alternative) is in every display
  for (const id of fired) {
    if (ev.modalities[id] !== 'modality:shall') continue;
    const replaced = [...entryById.values()].some((e) => {
      const lieu = (e as Record<string, unknown>)['rel:in_lieu_of'] as
        string[] | undefined;
      return lieu?.includes(id) && fired.includes(e.id);
    });
    if (replaced) continue;
    ev.displays.forEach((d, i) => {
      if (!d.entries.includes(id))
        out.push(`display ${i} [${d.entries.join('+')}]: shall ${id} missing`);
    });
  }
  return out;
}

/**
 * Violation classes already reported to colregs, keyed by the normalised
 * message the sweep prints. `covers` scopes each entry to the records the
 * report is about: a violation of a listed class on any other record is
 * unreported and fails. An entry must still cover at least one violation (a
 * stale entry fails), so fixing it upstream forces the line out.
 */
interface Reported {
  issue: string;
  covers: (f: FactRecord, ev: DisplayEvaluation) => boolean;
}
// A `may` option is optional, so the engine emits "show nothing" as one more
// alternative: a display with no entries or no lights, beside the lit ones.
// colregs#223 has the 23(d)(i) record and the 25(b) and 30(d) ones of the
// same shape; rule:23d is the us/inland twin of 23(d)(i). Covered only when
// one of those entries applied: an empty alternative beside any other entry
// is not this report and fails.
const EMPTY_ALT_ENTRIES = new Set([
  'rule:23d_i',
  'rule:23d',
  'rule:25b',
  'rule:30d',
]);
const emptyAlternative: Reported = {
  issue: 'mark-brannan/colregs#223',
  covers: (_f, ev) => ev.applied.some((id) => EMPTY_ALT_ENTRIES.has(id)),
};
const REPORTED: Record<string, Reported> = {
  '[..]: no entries': emptyAlternative,
  '[..]: shows nothing': emptyAlternative,
  '[..]: N sternlights': {
    // rule:25d_ii is gated on propulsion:oars alone, so it co-fires with every
    // activity and 26(c)'s imported Rule 23 lights add a second sternlight.
    issue: 'mark-brannan/colregs#224',
    covers: (f) => f['fact:propulsion'] === 'propulsion:oars',
  },
};

describe('property sweep over the fact space (#123)', () => {
  it('has unique entry ids across every jurisdiction', () => {
    const ids = (applicability.entries as Entry[]).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds every display invariant across the grid', () => {
    const unreported = new Map<string, string>();
    const covered = new Set<string>();
    for (const { jurisdiction, facts: f } of grid()) {
      const ev = evaluateDisplayIn(jurisdiction, f);
      for (const v of violationsOf(ev)) {
        const key = v
          .replace(/display \d+ /, '')
          .replace(/\[[^\]]*\]/, '[..]')
          .replace(/\d+ sternlights/, 'N sternlights')
          .replace(/rule:\S+/g, 'R');
        if (REPORTED[key]?.covers(f, ev)) covered.add(key);
        else if (!unreported.has(key))
          unreported.set(key, `${jurisdiction} ${JSON.stringify(f)}`);
      }
    }
    expect(
      [...unreported].map(([v, rec]) => `${v}\n    first record: ${rec}`),
    ).toEqual([]);
    const stale = Object.keys(REPORTED).filter((k) => !covered.has(k));
    expect(stale, 'reported classes no longer occur; drop them').toEqual([]);
  });

  it('surfaces known_omissions as complete records', () => {
    const omissions = applicability.known_omissions ?? [];
    expect(omissions.length).toBeGreaterThan(0);
    for (const o of omissions) {
      expect(o.cite, 'cite').toBeTruthy();
      expect(o.what, `${o.cite} what`).toBeTruthy();
      expect(o.why, `${o.cite} why`).toBeTruthy();
    }
  });
});
