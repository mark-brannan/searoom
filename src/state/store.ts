// The one app state store. Holds the AppState record (facts, per-mode view
// state, preferences); the URL codec in urlState.ts serializes it. Modes read
// what they use from here, so App passes nothing down.
import { create } from 'zustand';
import type { AppState, Mode } from './urlState';
import { defaultCorpusFor, deserialize, serialize } from './urlState';
import { saveSettings, stateFromHash } from './settings';

export type Patch = Partial<AppState>;

const UNDO_DEPTH = 200;

interface AppStore {
  state: AppState;
  /** Previous fact records, newest last, each with the mesh it was shown on. */
  undoStack: Pick<AppState, 'facts' | 'mesh'>[];
  patch: (p: Patch) => void;
  setMode: (mode: Mode) => void;
  /** Step the fact record back one change. */
  undo: () => void;
  /** Replace the state wholesale (hash -> state). Not an undoable change. */
  replace: (s: AppState) => void;
}

export const useApp = create<AppStore>((set, get) => ({
  state: stateFromHash(
    typeof window === 'undefined' ? '' : window.location.hash,
  ),
  undoStack: [],
  patch: (p) =>
    set(({ state: s, undoStack }) => {
      const next = { ...s, ...p };
      // the corpus belongs to the jurisdiction in view: switching jurisdiction
      // re-picks that jurisdiction's reference corpus unless the patch names one
      if (
        p.jurisdiction !== undefined &&
        p.jurisdiction !== s.jurisdiction &&
        p.corpus === undefined
      ) {
        next.corpus = defaultCorpusFor(p.jurisdiction);
      }
      const factsChanged =
        p.facts !== undefined &&
        JSON.stringify(p.facts) !== JSON.stringify(s.facts);
      return {
        state: next,
        undoStack: factsChanged
          ? [...undoStack, { facts: s.facts, mesh: s.mesh }].slice(-UNDO_DEPTH)
          : undoStack,
      };
    }),
  setMode: (mode) => {
    // mode switches get a history entry so back works between modes
    const next = { ...get().state, mode };
    history.pushState(null, '', serialize(next));
    set({ state: next });
  },
  undo: () =>
    set(({ state, undoStack }) => {
      const prev = undoStack[undoStack.length - 1];
      if (!prev) return {};
      // the mesh goes back with the hull it was picked for
      return {
        state: { ...state, ...prev },
        undoStack: undoStack.slice(0, -1),
      };
    }),
  replace: (s) => set({ state: s }),
}));

export const useAppState = (): AppState => useApp((s) => s.state);
export const usePatch = (): AppStore['patch'] => useApp((s) => s.patch);

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
  const onHash = () => {
    const s = deserialize(window.location.hash);
    if (serialize(s) !== serialize(useApp.getState().state))
      useApp.getState().replace(s);
  };
  window.addEventListener('hashchange', onHash);

  let lastQuizN = useApp.getState().state.quizN;
  const write = (state: AppState) => {
    const target = serialize(state);
    if (window.location.hash !== target) {
      // each quiz question is a history entry, so back reopens the last one
      const step = state.mode === 'quiz' && state.quizN !== lastQuizN;
      if (step) history.pushState(null, '', target);
      else history.replaceState(null, '', target);
    }
    lastQuizN = state.quizN;
  };
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
