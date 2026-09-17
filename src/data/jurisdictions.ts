// A jurisdiction is a merge patch over `intl` — colregs ADR 0018 for the
// entries, ADR 0020 for the paragraph skeleton. colregs-engine has no
// jurisdiction parameter; it takes resolved data through
// `EvaluateOptions.data`, so searoom resolves the patch here and hands the
// engine a single jurisdiction's rule set.

import { applicability, editions, rules } from './colregs';
import { mergePatch } from './mergePatch';
import type { ApplicabilityData, Entry, Paragraph } from '../engine/types';

/** The base every delta patches. */
export const BASE_JURISDICTION = 'intl';

export interface JurisdictionMeta {
  id: string;
  /** label key in the message catalog */
  labelKey: string;
  /** the instrument this jurisdiction is, from colregs' edition registry */
  instrument: string;
  /** the edition the skeleton consolidates, e.g. `us/inland@2014` */
  skeleton: string;
  /** the amendment the edition consolidates, per REQ-LANG-10 */
  amendedThrough: string;
}

/** One skeleton path a jurisdiction's source does not spell (ADR 0020). */
export interface PathSuppression {
  path: string;
  why: string;
}

/** One inherited entry a jurisdiction tombstones (ADR 0018). */
export interface EntrySuppression {
  jurisdiction: string;
  suppresses: string;
  cite: string;
  why: string;
}

interface SkeletonDelta {
  note?: string;
  paragraphs: Record<string, Paragraph>;
  suppressions: PathSuppression[];
}

const deltas = (rules.deltas ?? {}) as Record<string, SkeletonDelta>;
const entrySuppressions = (applicability.suppressions ??
  []) as EntrySuppression[];

/**
 * Every jurisdiction the data actually carries: the base, plus one per
 * skeleton delta. A jurisdiction with entries but no skeleton delta still
 * counts — the delta tables are independent (ADR 0018 landed before 0020).
 */
export const JURISDICTIONS: JurisdictionMeta[] = (() => {
  const ids = new Set<string>([BASE_JURISDICTION]);
  for (const id of Object.keys(deltas)) ids.add(id);
  for (const e of applicability.entries) ids.add(e.jurisdiction);
  for (const s of entrySuppressions) ids.add(s.jurisdiction);
  return [...ids].sort(byBaseFirst).map((id) => {
    const reg = editions.jurisdictions[id];
    const skeleton = reg?.skeleton ?? '';
    return {
      id,
      labelKey: `jurisdiction.${id}`,
      instrument: reg?.instrument ?? id,
      skeleton,
      amendedThrough: reg?.editions?.[skeleton]?.amended_through ?? '',
    };
  });
})();

function byBaseFirst(a: string, b: string): number {
  if (a === BASE_JURISDICTION) return -1;
  if (b === BASE_JURISDICTION) return 1;
  return a.localeCompare(b);
}

export const JURISDICTION_IDS: string[] = JURISDICTIONS.map((j) => j.id);

export function isJurisdiction(id: string): boolean {
  return JURISDICTION_IDS.includes(id);
}

export function jurisdictionMeta(id: string): JurisdictionMeta | undefined {
  return JURISDICTIONS.find((j) => j.id === id);
}

// ---------------------------------------------------------------- entries

/** The tombstones a jurisdiction lays over inherited entries. */
export function entrySuppressionsFor(id: string): EntrySuppression[] {
  return entrySuppressions.filter((s) => s.jurisdiction === id);
}

/**
 * The merge-patch document of ADR 0018 point 1, keyed by entry id: a
 * jurisdiction's own entries as present keys, its tombstones as `null`.
 */
function entryPatch(id: string): Record<string, Entry | null> {
  const patch: Record<string, Entry | null> = {};
  for (const s of entrySuppressionsFor(id)) patch[s.suppresses] = null;
  for (const e of applicability.entries) {
    if (e.jurisdiction === id) patch[e.id] = e;
  }
  return patch;
}

const entryCache = new Map<string, ApplicabilityData>();

/**
 * `applicability.json` with `entries` resolved for one jurisdiction — own
 * rows present, tombstoned rows gone, everything else inherited from the
 * base. This is what goes to the engine as `EvaluateOptions.data`.
 */
export function resolveApplicability(id: string): ApplicabilityData {
  const hit = entryCache.get(id);
  if (hit) return hit;
  const resolved = { ...applicability, entries: resolveEntries(id) };
  entryCache.set(id, resolved);
  return resolved;
}

/** The resolved entry list, in the base's document order. */
export function resolveEntries(id: string): Entry[] {
  const base: Record<string, Entry> = {};
  const order: string[] = [];
  for (const e of applicability.entries) {
    if (e.jurisdiction !== BASE_JURISDICTION) continue;
    base[e.id] = e;
    order.push(e.id);
  }
  if (id === BASE_JURISDICTION) return order.map((k) => base[k]);
  const patch = entryPatch(id);
  const merged = mergePatch(
    base as never,
    patch as never,
  ) as unknown as Record<string, Entry>;
  // base order first, then this jurisdiction's own additions in data order
  const own = Object.keys(patch).filter((k) => patch[k] !== null && !base[k]);
  return [...order.filter((k) => k in merged), ...own].map((k) => merged[k]);
}

// --------------------------------------------------------------- skeleton

/** The paths a jurisdiction's source does not spell at all (ADR 0020). */
export function pathSuppressionsFor(id: string): PathSuppression[] {
  return deltas[id]?.suppressions ?? [];
}

/**
 * The paths a jurisdiction restates — its text differs from the base, or it
 * has no base counterpart (ADR 0020 point 3). What the Rules reference marks
 * as "reads differently here".
 */
export function restatedPathsFor(id: string): string[] {
  return Object.keys(deltas[id]?.paragraphs ?? {});
}

/** True when the path exists only under this jurisdiction. */
export function isJurisdictionOnly(id: string, path: string): boolean {
  return (
    path in (deltas[id]?.paragraphs ?? {}) && !(path in rules.paragraphs)
  );
}

const skeletonCache = new Map<string, Record<string, Paragraph>>();

/**
 * A jurisdiction's resolved skeleton: its own rows, suppressed paths gone,
 * an unmentioned path inherited whole, a restated path merged field by field
 * so it keeps the base figure it says nothing about (ADR 0020 point 2).
 */
export function resolveSkeleton(id: string): Record<string, Paragraph> {
  const hit = skeletonCache.get(id);
  if (hit) return hit;
  let resolved: Record<string, Paragraph>;
  if (id === BASE_JURISDICTION || !deltas[id]) {
    resolved = rules.paragraphs;
  } else {
    const patch: Record<string, Paragraph | null> = {
      ...deltas[id].paragraphs,
    };
    for (const s of deltas[id].suppressions) patch[s.path] = null;
    resolved = mergePatch(
      rules.paragraphs as never,
      patch as never,
    ) as unknown as Record<string, Paragraph>;
  }
  skeletonCache.set(id, resolved);
  return resolved;
}
