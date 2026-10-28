// Quiz v2's learner model: per-scenario right/wrong counts kept in the
// browser (no account), a file export/import for moving them between
// devices, and a weighted choice of the next question. The generator in
// quiz.ts stays pure; weighting works by choosing which seed to ask next,
// so a question stays reproducible from its seed in the URL.

import { evaluateDisplayIn } from './evaluate';
import { QUIZ_DIFFICULTIES, citeOf, makeForward, makeReverse, scenarioPoolAt } from './quiz';
import type { QuizDifficulty, QuizQuestion } from './quiz';

export interface Tally {
  right: number;
  wrong: number;
}
/** keyed by the fixture scenario's name */
export type Progress = Record<string, Tally>;

const STORE_KEY = 'searoom.quiz.progress.v1';
export const EXPORT_VERSION = 1;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? parseProgress(JSON.parse(raw)) ?? {} : {};
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* private window or blocked storage: progress lasts this visit only */
  }
}

export function record(p: Progress, scenario: string, correct: boolean): Progress {
  const t = p[scenario] ?? { right: 0, wrong: 0 };
  return {
    ...p,
    [scenario]: {
      right: t.right + (correct ? 1 : 0),
      wrong: t.wrong + (correct ? 0 : 1),
    },
  };
}

const count = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e9 ? v : null;

/** Untrusted input (a hand-edited or stale file): anything malformed is dropped. */
export function parseProgress(json: unknown): Progress | null {
  if (typeof json !== 'object' || json === null) return null;
  const entries = (json as { entries?: unknown }).entries;
  if (typeof entries !== 'object' || entries === null) return null;
  const out: Progress = {};
  for (const [name, t] of Object.entries(entries)) {
    if (name === '__proto__') continue; // would set out's prototype, not a key
    const right = count((t as Tally)?.right);
    const wrong = count((t as Tally)?.wrong);
    if (right !== null && wrong !== null) out[name] = { right, wrong };
  }
  return out;
}

export function exportProgress(p: Progress): string {
  return JSON.stringify({ app: 'searoom', version: EXPORT_VERSION, entries: p }, null, 2);
}

/**
 * Importing the same file twice must not double the counts, so a merge keeps
 * the larger of each count rather than summing.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const out: Progress = { ...a };
  for (const [name, t] of Object.entries(b)) {
    if (name === '__proto__') continue;
    const o = out[name];
    out[name] = o
      ? { right: Math.max(o.right, t.right), wrong: Math.max(o.wrong, t.wrong) }
      : t;
  }
  return out;
}

/**
 * How much a scenario wants asking again: each miss adds, each success
 * takes a little back, never below the floor (a mastered scenario still
 * comes up). Unseen scenarios sit between: new material is worth a look.
 */
export function weight(p: Progress, scenario: string): number {
  const t = p[scenario];
  if (!t) return 1.5;
  return Math.max(0.25, 1 + 2 * t.wrong - 0.5 * t.right);
}

export function questionFor(
  seed: number,
  reverse: boolean,
  jurisdiction: string,
  difficulty: QuizDifficulty = 'hard',
): QuizQuestion {
  return reverse
    ? makeReverse(seed, jurisdiction, difficulty)
    : makeForward(seed, jurisdiction, difficulty);
}

/** "27(a)(i), 27(b)" -> ["27"] */
export function rulesOfCite(cite: string): string[] {
  const rules = cite
    .split(',')
    .map((c) => c.trim().match(/^\d+/)?.[0])
    .filter((r): r is string => !!r);
  return [...new Set(rules)];
}

const poolRules = new Map<string, string[]>();
/** Rule numbers a jurisdiction's scenarios exercise at one difficulty, for the per-rule set. */
export function rulesInPool(
  jurisdiction: string,
  difficulty: QuizDifficulty = 'hard',
): string[] {
  const key = `${jurisdiction}|${difficulty}`;
  const hit = poolRules.get(key);
  if (hit) return hit;
  const found = new Set<string>();
  for (const c of scenarioPoolAt(jurisdiction, difficulty)) {
    for (const d of evaluateDisplayIn(jurisdiction, c.facts).displays)
      for (const r of rulesOfCite(citeOf(jurisdiction, d))) found.add(r);
  }
  const list = [...found].sort((a, b) => Number(a) - Number(b));
  poolRules.set(key, list);
  return list;
}

/**
 * The level a drill asks at: the chosen one, or the first harder one whose
 * scenarios exercise the drilled rule, so a rule filter never runs dry.
 */
export function drillDifficulty(
  jurisdiction: string,
  rule: string,
  difficulty: QuizDifficulty,
): QuizDifficulty {
  if (!rule) return difficulty;
  const levels = QUIZ_DIFFICULTIES.slice(QUIZ_DIFFICULTIES.indexOf(difficulty));
  return levels.find((d) => rulesInPool(jurisdiction, d).includes(rule)) ?? 'hard';
}

const CANDIDATES = 16;
const MAX_SCAN = 200;

/**
 * The next question's seed after `after`: scan upward from it, keep the
 * first few that fit the rule filter, and pick among them with the
 * scenario weights. The pick is made from the seed alone plus local
 * progress, so what lands in the URL is reproducible by anyone.
 */
export function nextDrillSeed(
  after: number,
  reverse: boolean,
  jurisdiction: string,
  progress: Progress,
  rule: string,
  difficulty: QuizDifficulty = 'hard',
): number {
  const cands: { seed: number; w: number }[] = [];
  for (let s = after + 1; s <= after + MAX_SCAN && cands.length < CANDIDATES; s++) {
    let q: QuizQuestion;
    try {
      q = questionFor(s, reverse, jurisdiction, difficulty);
    } catch {
      continue;
    }
    if (rule && !rulesOfCite(q.cite).includes(rule)) continue;
    cands.push({ seed: s, w: weight(progress, q.fixtureName) });
  }
  if (cands.length === 0) return after + 1;
  const total = cands.reduce((n, c) => n + c.w, 0);
  // deterministic in (after, progress): the draw is seeded by `after`
  let r = (((after * 2654435761) >>> 0) / 4294967296) * total;
  for (const c of cands) {
    r -= c.w;
    if (r < 0) return c.seed;
  }
  return cands[cands.length - 1].seed;
}

/**
 * The seed a drill keeps when its level changes: the current one if its
 * question at the new level still asks about the drilled rule, else the next
 * drill seed from it. A seed picked for one level can ask about another rule
 * at the next.
 */
export function drillSeedAt(
  seed: number,
  reverse: boolean,
  jurisdiction: string,
  progress: Progress,
  rule: string,
  difficulty: QuizDifficulty,
): number {
  if (!rule) return seed;
  try {
    if (rulesOfCite(questionFor(seed, reverse, jurisdiction, difficulty).cite).includes(rule))
      return seed;
  } catch {
    // no question at this seed: pick another
  }
  return nextDrillSeed(seed, reverse, jurisdiction, progress, rule, difficulty);
}
