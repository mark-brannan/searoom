// Saved boats (searoom#121): named fact records the learner keeps, under one
// localStorage key. A record goes through the URL codec on the way in and on
// the way out, so a stored boat holds only what a link could say and a stale
// or hand-edited value is dropped the way a stale link's would be. Storage can
// be absent or throw (private window, blocked site data): every access is
// guarded, and without it a saved boat lasts the visit.

import { useSyncExternalStore } from 'react';
import type { FactRecord } from '../engine/types';
import { deserialize, serialize, stateWith } from './urlState';

export const MY_BOATS_KEY = 'searoom.myboats.v1';

export interface SavedBoat {
  name: string;
  facts: FactRecord;
}

/** Longest name kept; a longer one is cut. */
export const NAME_MAX = 40;

/** The fact record as a link would carry it: known fields, valid values. */
export function cleanFacts(facts: FactRecord): FactRecord {
  return deserialize(serialize(stateWith({ mode: 'quiz', facts }))).facts;
}

export function parseBoats(raw: string | null): SavedBoat[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const out: SavedBoat[] = [];
    for (const item of v) {
      if (typeof item !== 'object' || item === null) continue;
      const { name, facts } = item as Record<string, unknown>;
      if (typeof name !== 'string' || !name.trim()) continue;
      if (typeof facts !== 'object' || facts === null) continue;
      if (out.some((b) => b.name === name)) continue;
      out.push({
        name: name.trim().slice(0, NAME_MAX),
        facts: cleanFacts(facts as FactRecord),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function load(): SavedBoat[] {
  try {
    return parseBoats(window.localStorage.getItem(MY_BOATS_KEY));
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
let snapshot: SavedBoat[] | null = null;

function write(next: SavedBoat[]): void {
  try {
    window.localStorage.setItem(MY_BOATS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the boats last for this visit only
  }
  snapshot = next;
  listeners.forEach((l) => l());
}

/** Save `facts` under `name`; a boat of that name is replaced in place. */
export function saveBoat(name: string, facts: FactRecord): void {
  const n = name.trim().slice(0, NAME_MAX);
  if (!n) return;
  const boats = getSnapshot();
  const boat = { name: n, facts: cleanFacts(facts) };
  const i = boats.findIndex((b) => b.name === n);
  write(
    i === -1 ? [...boats, boat] : boats.map((b, j) => (j === i ? boat : b)),
  );
}

export function deleteBoat(name: string): void {
  write(getSnapshot().filter((b) => b.name !== name));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = (): SavedBoat[] => (snapshot ??= load());
const EMPTY: SavedBoat[] = [];
const getServerSnapshot = (): SavedBoat[] => EMPTY;

/** The saved boats, re-rendering on every save or delete. */
export function useMyBoats(): SavedBoat[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Test seam: forget the in-memory copy so the next read is from storage. */
export function resetMyBoatsForTest(): void {
  snapshot = null;
}
