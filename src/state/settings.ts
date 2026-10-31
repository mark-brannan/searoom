// Preferences that outlive a visit: language, rule-text corpus, jurisdiction,
// day/night default, presentation and a reduced-motion override. They are
// choices about the learner, not facts about the vessel. A value carried by
// the URL always wins over the stored one, so a shared link shows what its
// sender saw. Storage can be absent or throw (private window, blocked site
// data), so every access is guarded and the app works without it.

import { useSyncExternalStore } from 'react';
import { isJurisdiction } from '../data/jurisdictions';
import { corpusById } from '../data/corpusText';
import { catalogs } from '../i18n';
import type { AppState } from './urlState';
import { deserialize } from './urlState';
import { pickInitialMesh } from '../render/hullModels';

export const SETTINGS_KEY = 'searoom.settings.v1';

export type DayNight = 'night' | 'day';
export type Presentation = 'seascape' | 'lights';
/** 'system' follows the OS prefers-reduced-motion; the others override it. */
export type MotionPref = 'system' | 'reduce' | 'full';

export const DAY_NIGHT: DayNight[] = ['night', 'day'];
export const PRESENTATIONS: Presentation[] = ['seascape', 'lights'];
export const MOTION_PREFS: MotionPref[] = ['system', 'reduce', 'full'];

export interface Settings {
  locale?: string;
  corpus?: string;
  jurisdiction?: string;
  dayNight?: DayNight;
  presentation?: Presentation;
  motion?: MotionPref;
}

const oneOf = <T extends string>(set: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (set as readonly string[]).includes(v);

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return {};
    const r = v as Record<string, unknown>;
    const out: Settings = {};
    if (typeof r.locale === 'string' && r.locale in catalogs)
      out.locale = r.locale;
    if (typeof r.corpus === 'string' && corpusById(r.corpus))
      out.corpus = r.corpus;
    if (typeof r.jurisdiction === 'string' && isJurisdiction(r.jurisdiction))
      out.jurisdiction = r.jurisdiction;
    if (oneOf(DAY_NIGHT, r.dayNight)) out.dayNight = r.dayNight;
    if (oneOf(PRESENTATIONS, r.presentation)) out.presentation = r.presentation;
    if (oneOf(MOTION_PREFS, r.motion)) out.motion = r.motion;
    return out;
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
let snapshot: Settings | null = null;

/**
 * Merge `s` into what is stored: a caller saving two fields leaves the
 * other four as they were. Undefined fields are left alone.
 */
export function saveSettings(s: Settings): void {
  const next: Settings = { ...loadSettings() };
  for (const [k, v] of Object.entries(s))
    if (v !== undefined) (next as Record<string, unknown>)[k] = v;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the preference lasts for this visit only
  }
  snapshot = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = (): Settings => (snapshot ??= loadSettings());
const getServerSnapshot = (): Settings => ({});

/** The stored preferences, re-rendering on every save. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Whether motion should be reduced, given the preference and the OS setting. */
export function reducesMotion(
  pref: MotionPref | undefined,
  osReduces: boolean,
): boolean {
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return osReduces;
}

/**
 * The state a hash describes. Only an empty hash (the bare first visit)
 * takes stored settings: any other link came from a sender, and its omitted
 * `loc`/`j`/`cp` mean the defaults, not "use yours".
 */
export function stateFromHash(
  hash: string,
  stored: Settings = loadSettings(),
  rand: () => number = Math.random,
): AppState {
  const state = deserialize(hash);
  // no `ms` in the link: draw a variant once here; the store writes it back to
  // the hash, so reload and share keep it. An explicit `ms` always wins.
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  if (!new URLSearchParams(query).has('ms'))
    state.mesh = pickInitialMesh(state.facts, rand);
  if (hash.replace(/^#/, '') !== '') return state;
  if (stored.locale) state.locale = stored.locale;
  if (stored.jurisdiction || stored.corpus) {
    // a stored jurisdiction brings its reference corpus unless a stored corpus
    // of that jurisdiction is named; one of another jurisdiction is dropped
    const q = new URLSearchParams();
    if (stored.jurisdiction) q.set('j', stored.jurisdiction);
    if (stored.corpus) q.set('cp', stored.corpus);
    const withJ = deserialize(`?${q.toString()}`);
    state.jurisdiction = withJ.jurisdiction;
    state.corpus = withJ.corpus;
  }
  return state;
}
