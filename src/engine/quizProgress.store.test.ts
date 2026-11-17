import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_ASPECT_RUNS,
  exportProgress,
  loadAspectRuns,
  loadProgress,
  mergeAspectRuns,
  parseAspectRuns,
  parseProgress,
  recordAspectRun,
  saveProgress,
} from './quizProgress';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

const run = (at: number, meanError = 30) => ({ at, scenes: 10, meanError, within: 4 });

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

describe('the local progress store, v2', () => {
  it('keeps quiz tallies across a reload', () => {
    saveProgress({ trawler: { right: 1, wrong: 2 } });
    expect(loadProgress()).toEqual({ trawler: { right: 1, wrong: 2 } });
  });

  it('reads tallies a v1 store left behind', () => {
    localStorage.setItem('searoom.quiz.progress.v1', '{"sloop":{"right":3,"wrong":0}}');
    expect(loadProgress()).toEqual({ sloop: { right: 3, wrong: 0 } });
  });

  it('appends an aspect drill beside the quiz tallies, losing neither', () => {
    saveProgress({ trawler: { right: 1, wrong: 0 } });
    recordAspectRun(run(1_800_000_000_000));
    saveProgress({ trawler: { right: 2, wrong: 0 } });
    expect(loadAspectRuns()).toEqual([run(1_800_000_000_000)]);
    expect(loadProgress()).toEqual({ trawler: { right: 2, wrong: 0 } });
  });

  it('keeps only the newest runs', () => {
    for (let i = 1; i <= MAX_ASPECT_RUNS + 5; i++) recordAspectRun(run(i));
    const runs = loadAspectRuns();
    expect(runs).toHaveLength(MAX_ASPECT_RUNS);
    expect(runs[0].at).toBe(6);
  });

  it('carries the runs through an export, and importing twice adds none', () => {
    const json = JSON.parse(exportProgress({}, [run(5), run(9)]));
    expect(json.version).toBe(2);
    const once = mergeAspectRuns([], parseAspectRuns(json));
    expect(mergeAspectRuns(once, parseAspectRuns(json))).toEqual([run(5), run(9)]);
    expect(parseProgress(json)).toEqual({});
  });

  it('drops a malformed run from an import', () => {
    expect(
      parseAspectRuns({
        aspect: [run(5), { at: 6, scenes: 10, meanError: 400, within: 1 }, { at: 'x' }, null],
      }),
    ).toEqual([run(5)]);
  });
});
