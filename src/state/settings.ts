// Preferences that outlive a visit: UI language and jurisdiction. They are
// choices about the learner, not facts about the vessel. A value carried by
// the URL always wins over the stored one, so a shared link shows what its
// sender saw. Storage can be absent or throw (private window, blocked site
// data), so every access is guarded and the app works without it.

import { isJurisdiction } from '../data/jurisdictions';
import { catalogs } from '../i18n';
import type { AppState } from './urlState';
import { deserialize } from './urlState';
import { pickInitialMesh } from '../render/hullModels';

export const SETTINGS_KEY = 'searoom.settings.v1';

export interface Settings {
  locale?: string;
  jurisdiction?: string;
}

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return {};
    const { locale, jurisdiction } = v as Record<string, unknown>;
    const out: Settings = {};
    if (typeof locale === 'string' && locale in catalogs) out.locale = locale;
    if (typeof jurisdiction === 'string' && isJurisdiction(jurisdiction))
      out.jurisdiction = jurisdiction;
    return out;
  } catch {
    return {};
  }
}

export function saveSettings(s: Pick<AppState, 'locale' | 'jurisdiction'>): void {
  try {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ locale: s.locale, jurisdiction: s.jurisdiction }),
    );
  } catch {
    // storage unavailable: the preference lasts for this visit only
  }
}

/**
 * The state a hash describes. Only an empty hash (the bare first visit)
 * takes stored settings: any other link came from a sender, and its omitted
 * `loc`/`j` mean the defaults, not "use yours".
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
  if (stored.jurisdiction) {
    // a stored jurisdiction brings its own reference corpus, unless the URL names one
    const withJ = deserialize(
      `${hash}?j=${encodeURIComponent(stored.jurisdiction)}`,
    );
    state.jurisdiction = withJ.jurisdiction;
    state.corpus = withJ.corpus;
  }
  return state;
}
