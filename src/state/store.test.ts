import { afterEach, describe, expect, it, vi } from 'vitest';
import { editsText, fromHash, startSync, useApp } from './store';
import { deserialize, serialize, stateWith } from './urlState';
import { PRESETS } from '../data/presets';
import { meshOnChange } from '../render/hullModels';

describe('fact-record undo', () => {
  it('steps the facts back, with the mesh they were shown on', () => {
    const [a, b] = PRESETS.map((p) => p.facts as never);
    const { patch } = useApp.getState();
    patch({ facts: a, sandbox: { mesh: 'before.glb' } });
    const start = useApp.getState().state;
    const mesh = meshOnChange(a, b);
    patch({ facts: b, ...(mesh !== undefined && { sandbox: { mesh } }) });
    useApp.getState().undo();
    const after = useApp.getState().state;
    expect(after.facts).toEqual(start.facts);
    expect(after.sandbox.mesh).toBe('before.glb');
  });

  it('leaves no entry for a patch that does not change the facts', () => {
    const before = useApp.getState().undoStack.length;
    useApp.getState().patch({ locale: 'en' });
    expect(useApp.getState().undoStack.length).toBe(before);
  });
});

describe('editsText', () => {
  const input = (type: string) => ({ tagName: 'INPUT', type }) as never;
  it('leaves ctrl/cmd+Z to text fields', () => {
    expect(editsText(input('text'))).toBe(true);
    expect(editsText(input('number'))).toBe(true);
    expect(editsText({ tagName: 'TEXTAREA' } as never)).toBe(true);
  });
  it('takes ctrl/cmd+Z on a slider, checkbox, radio or select', () => {
    expect(editsText(input('range'))).toBe(false);
    expect(editsText(input('checkbox'))).toBe(false);
    expect(editsText(input('radio'))).toBe(false);
    expect(editsText({ tagName: 'SELECT' } as never)).toBe(false);
    expect(editsText(null)).toBe(false);
  });
});

/** A hash-routed tab: a history stack that fires hashchange on traversal. */
function fakeTab(initial: string) {
  const entries = [initial];
  let i = 0;
  const listeners = new Map<string, (() => void)[]>();
  const fire = (type: string) => listeners.get(type)?.forEach((f) => f());
  const go = (to: number) => {
    const from = entries[i];
    i = to;
    if (entries[i] !== from) fire('hashchange');
  };
  vi.stubGlobal('window', {
    location: {
      get hash() {
        return entries[i];
      },
    },
    addEventListener: (t: string, f: () => void) =>
      listeners.set(t, [...(listeners.get(t) ?? []), f]),
    removeEventListener: (t: string, f: () => void) =>
      listeners.set(t, (listeners.get(t) ?? []).filter((g) => g !== f)),
  });
  vi.stubGlobal('history', {
    pushState: (_: unknown, __: string, url: string) => {
      entries.splice(i + 1);
      entries.push(url);
      i += 1;
    },
    replaceState: (_: unknown, __: string, url: string) => {
      entries[i] = url;
    },
  });
  return {
    entries,
    back: () => go(Math.max(0, i - 1)),
    forward: () => go(Math.min(entries.length - 1, i + 1)),
  };
}

describe('back and forward per mode (#107)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a hash carries its own mode; the other modes keep their view state', () => {
    const current = stateWith({
      sandbox: { theta: 90 },
      quiz: { seed: 7, n: 3 },
      rules: { path: '27(a)(i)' },
    });
    const s = fromHash(current, '#/sandbox?th=200');
    expect(s.sandbox.theta).toBe(200);
    expect(s.quiz).toBe(current.quiz);
    expect(s.rules).toBe(current.rules);
    expect(fromHash(current, '#/quiz/1/9').sandbox).toBe(current.sandbox);
  });

  it('a mode switch pushes; everything else replaces', () => {
    const tab = fakeTab('#/sandbox');
    const app = useApp.getState();
    app.replace(deserialize('#/sandbox'));
    const stop = startSync();
    try {
      app.patch({ sandbox: { theta: 90 } }); // replaces
      expect(tab.entries).toHaveLength(1);
      app.setMode('quiz'); // pushes
      app.patch({ quiz: { n: 2 } }); // a new question replaces
      app.patch({ quiz: { direction: 'reverse' } }); // replaces
      expect(tab.entries).toHaveLength(2);
      app.setMode('rules'); // pushes
      app.patch({ rules: { path: '27(a)(i)' } }); // replaces
      app.patch({ locale: 'fi' }); // replaces
      expect(tab.entries.map((h) => h.split('?')[0])).toEqual([
        '#/sandbox',
        '#/quiz/1/2',
        '#/rules/27(a)(i)',
      ]);

      const now = () => useApp.getState().state;
      tab.back(); // the quiz as it was left
      expect([now().mode, now().quiz.n, now().quiz.direction]).toEqual(['quiz', 2, 'reverse']);
      tab.back(); // the Sandbox as it was left
      expect([now().mode, now().sandbox.theta]).toEqual(['sandbox', 90]);
      // stepping back through the other modes lost neither's view state
      expect(now().rules.path).toBe('27(a)(i)');
      expect(now().quiz.n).toBe(2);
      expect(tab.entries).toHaveLength(3); // back pushes nothing

      tab.forward();
      tab.forward();
      expect([now().mode, now().rules.path, now().sandbox.theta]).toEqual([
        'rules',
        '27(a)(i)',
        90,
      ]);
      expect(now().quiz).toMatchObject({ n: 2, direction: 'reverse' });
    } finally {
      stop();
    }
  });

  it('back into a non-canonical hash of another mode replaces it in place', () => {
    // an older link sits behind the entry the app loaded on
    const tab = fakeTab('#/sandbox?view=profile');
    history.pushState(null, '', '#/quiz');
    const app = useApp.getState();
    app.replace(deserialize('#/quiz'));
    const stop = startSync();
    try {
      expect(tab.entries).toHaveLength(2);
      tab.back(); // lands on the old link: canonicalised in place, not pushed
      expect(useApp.getState().state.mode).toBe('sandbox');
      expect(tab.entries).toHaveLength(2);
      expect(tab.entries[0]).toBe(serialize(useApp.getState().state));
      tab.forward(); // the quiz entry survived
      expect(useApp.getState().state.mode).toBe('quiz');
    } finally {
      stop();
    }
  });
});
