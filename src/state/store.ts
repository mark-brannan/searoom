// The one app state store. Holds the AppState record (the situation, one
// view-state slice per mode, preferences); the URL codec in urlState.ts
// serializes it. Modes subscribe to the slice they use, so App passes nothing
// down.
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { AppState, Mode, SliceKey, StatePatch } from './urlState';
import { SLICES, defaultCorpusFor, deserialize, serialize, slicesIn } from './urlState';
import { saveSettings, stateFromHash } from './settings';

/** A change to the state; a slice in it is merged into that slice. */
export type Patch = StatePatch;

const UNDO_DEPTH = 200;

interface AppStore {
  state: AppState;
  /** Previous fact records, newest last, each with the mesh it was shown on. */
  undoStack: { facts: AppState['facts']; mesh: string }[];
  patch: (p: Patch) => void;
  setMode: (mode: Mode) => void;
  /** Step the fact record back one change. */
  undo: () => void;
  /** Replace the state wholesale (hash -> state). Not an undoable change. */
  replace: (s: AppState) => void;
}

export function applyPatch(s: AppState, p: Patch): AppState {
  const next: AppState = {
    ...s,
    ...p,
    sandbox: p.sandbox ? { ...s.sandbox, ...p.sandbox } : s.sandbox,
    quiz: p.quiz ? { ...s.quiz, ...p.quiz } : s.quiz,
    rules: p.rules ? { ...s.rules, ...p.rules } : s.rules,
  };
  // the corpus belongs to the jurisdiction in view: switching jurisdiction
  // re-picks that jurisdiction's reference corpus unless the patch names one
  if (
    p.jurisdiction !== undefined &&
    p.jurisdiction !== s.jurisdiction &&
    p.corpus === undefined
  ) {
    next.corpus = defaultCorpusFor(p.jurisdiction);
  }
  return next;
}

/**
 * The state a hash names, over the current one. A hash carries only its own
 * mode's view state, so stepping back into one mode leaves the others' as
 * they were.
 */
export function fromHash(current: AppState, hash: string): AppState {
  const s = deserialize(hash);
  const own = slicesIn(s.mode);
  const kept = Object.fromEntries(
    SLICES.filter((k) => !own.includes(k)).map((k) => [k, current[k]]),
  );
  return { ...s, ...kept };
}

export const useApp = create<AppStore>((set) => ({
  state: stateFromHash(
    typeof window === 'undefined' ? '' : window.location.hash,
  ),
  undoStack: [],
  patch: (p) =>
    set(({ state: s, undoStack }) => {
      const factsChanged =
        p.facts !== undefined &&
        JSON.stringify(p.facts) !== JSON.stringify(s.facts);
      return {
        state: applyPatch(s, p),
        undoStack: factsChanged
          ? [...undoStack, { facts: s.facts, mesh: s.sandbox.mesh }].slice(-UNDO_DEPTH)
          : undoStack,
      };
    }),
  // the history entry for a mode switch is startSync's: every mode change pushes
  setMode: (mode) => set(({ state }) => ({ state: { ...state, mode } })),
  undo: () =>
    set(({ state, undoStack }) => {
      const prev = undoStack[undoStack.length - 1];
      if (!prev) return {};
      // the mesh goes back with the hull it was picked for
      return {
        state: {
          ...state,
          facts: prev.facts,
          sandbox: { ...state.sandbox, mesh: prev.mesh },
        },
        undoStack: undoStack.slice(0, -1),
      };
    }),
  replace: (s) => set({ state: s }),
}));

export const usePatch = (): AppStore['patch'] => useApp((s) => s.patch);
/** One mode's view state; re-renders only when that slice changes. */
export function useSlice<K extends SliceKey>(k: K): AppState[K] {
  return useApp((s) => s.state[k]);
}
/** The situation: the jurisdiction and the fact record. */
export const useSituation = (): Pick<AppState, 'jurisdiction' | 'facts'> =>
  useApp(
    useShallow((s) => ({ jurisdiction: s.state.jurisdiction, facts: s.state.facts })),
  );
/** Preferences and the open signpost. */
export const usePrefs = (): Pick<AppState, 'locale' | 'corpus' | 'signpost'> =>
  useApp(
    useShallow((s) => ({
      locale: s.state.locale,
      corpus: s.state.corpus,
      signpost: s.state.signpost,
    })),
  );
export const useMode = (): Mode => useApp((s) => s.state.mode);
export const useJurisdiction = (): string => useApp((s) => s.state.jurisdiction);

/** Inputs with their own text undo keep ctrl/cmd+Z; a slider, box or select has none. */
const OWN_UNDO = /^(text|search|number|email|url|tel|password)$/;
export function editsText(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el.tagName === 'INPUT' && OWN_UNDO.test((el as HTMLInputElement).type);
}

/**
 * Wire the store to the URL and keyboard: hash -> state (back button, hand
 * edit), state -> hash, and ctrl/cmd+Z for the fact record. Returns a cleanup.
 */
export function startSync(): () => void {
  // History: a mode switch pushes an entry, so back steps between modes;
  // every other change replaces the entry it is on.
  let last = useApp.getState().state;
  const write = (state: AppState) => {
    const target = serialize(state);
    if (window.location.hash !== target) {
      if (state.mode !== last.mode) history.pushState(null, '', target);
      else history.replaceState(null, '', target);
    }
    last = state;
  };

  const onHash = () => {
    const current = useApp.getState().state;
    const s = fromHash(current, window.location.hash);
    if (serialize(s) === serialize(current)) return;
    // a state that came from the hash is where history already is, never a
    // step: write only canonicalises the entry in place
    last = s;
    useApp.getState().replace(s);
  };
  window.addEventListener('hashchange', onHash);
  const unsub = useApp.subscribe((s, prev) => {
    if (s.state !== prev.state) write(s.state);
  });
  // preferences that outlive the visit
  const saveIfChanged = (s: AppState, prev?: AppState) => {
    if (
      !prev ||
      s.locale !== prev.locale ||
      s.jurisdiction !== prev.jurisdiction ||
      s.corpus !== prev.corpus
    )
      saveSettings({
        locale: s.locale,
        jurisdiction: s.jurisdiction,
        corpus: s.corpus,
      });
  };
  const unsubSettings = useApp.subscribe((s, prev) =>
    saveIfChanged(s.state, prev.state),
  );
  saveIfChanged(useApp.getState().state);
  // the initial state may need normalising into the hash
  write(useApp.getState().state);

  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z')
      return;
    if (editsText(e.target)) return;
    if (useApp.getState().undoStack.length === 0) return;
    e.preventDefault();
    useApp.getState().undo();
  };
  window.addEventListener('keydown', onKey);

  return () => {
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('keydown', onKey);
    unsub();
    unsubSettings();
  };
}
