// UI experiments: one control and its treatments per experiment, so a layout
// under trial can be flipped without a branch. A viewer's assignment comes
// from the query string (?layout=c, shareable and checked first), else what
// they last picked (browser storage), else the control. Experiment state is
// kept out of AppState and the hash on purpose: it is how the app looks, not
// what it shows.

import { useSyncExternalStore } from 'react';

export const EXPERIMENTS = {
  /** Sandbox page layout. a: rail, stage, arcs panel. c: the scene first. */
  layout: { variants: ['a', 'c'], control: 'a' },
} as const;

export type Experiment = keyof typeof EXPERIMENTS;
export type Variant<E extends Experiment> =
  (typeof EXPERIMENTS)[E]['variants'][number];

const STORAGE_PREFIX = 'searoom.x.';
const listeners = new Set<() => void>();

function isVariant<E extends Experiment>(e: E, v: unknown): v is Variant<E> {
  return (EXPERIMENTS[e].variants as readonly unknown[]).includes(v);
}

function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The variant this viewer sees: query string, then their last pick, then control. */
export function variantOf<E extends Experiment>(
  e: E,
  search = typeof window === 'undefined' ? '' : window.location.search,
): Variant<E> {
  const fromQuery = new URLSearchParams(search).get(e);
  if (isVariant(e, fromQuery)) return fromQuery;
  const fromStorage =
    typeof window === 'undefined' ? null : stored(STORAGE_PREFIX + e);
  if (isVariant(e, fromStorage)) return fromStorage;
  return EXPERIMENTS[e].control;
}

/** Assign a variant: remembered, and written into the query string so the URL
 * shows (and shares) the treatment in view. */
export function setVariant<E extends Experiment>(e: E, v: Variant<E>): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + e, v);
  } catch {
    // storage blocked: the query string still carries the pick
  }
  const url = new URL(window.location.href);
  url.searchParams.set(e, v);
  history.replaceState(history.state, '', url);
  listeners.forEach((l) => l());
}

// back and forward can restore an earlier query string
function subscribe(l: () => void): () => void {
  listeners.add(l);
  window.addEventListener('popstate', l);
  return () => {
    listeners.delete(l);
    window.removeEventListener('popstate', l);
  };
}

export function useVariant<E extends Experiment>(e: E): Variant<E> {
  return useSyncExternalStore(
    subscribe,
    () => variantOf(e),
    () => EXPERIMENTS[e].control,
  );
}
