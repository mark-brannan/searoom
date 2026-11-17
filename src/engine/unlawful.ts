// Unlawful displays (#212). A real watchkeeper meets lights no lawful vessel
// would carry: a burnt-out sidelight, an extra red, a white where a red
// belongs, a pair the wrong way up. The quiz makes them by one change to a lawful display, and the
// engine checks the result against every lawful display of every fact record
// in scope, from every bearing, so a "wrong" display never happens to be
// another vessel's right one. Identify uses the same check to say when the
// lights a learner builds are unlawful, and why.

import type { DisplayLight, Display, FactRecord } from './types';
import { evaluateDisplayIn } from './evaluate';
import {
  IN_LINE,
  THETA_STEP,
  candidatePool,
  identifyCandidates,
} from './identify';
import type { Arrangement, SeenLight } from './identify';
import { mulberry32, placedVisibility } from './quiz';
import type { ReverseQuestion, VisibleLight } from './quiz';

/** What one change did to the lights seen from the bearing. */
export type UnlawfulKind = 'missing' | 'extra' | 'colour' | 'place';
export const UNLAWFUL_KINDS: UnlawfulKind[] = [
  'missing',
  'extra',
  'colour',
  'place',
];

/** The share of judged questions that show an unlawful display, in every quiz mode. */
export const UNLAWFUL_SHARE = 0.2;

/** A light as the eye reads it at night: colour, and whether it flashes. */
export interface LightToken {
  color: string;
  flashing: boolean;
}

/** The change, as the learner is told it: a light gone, added, recoloured, or moved. */
export interface UnlawfulReason {
  kind: UnlawfulKind;
  /** the lawful light: missing, shown in the wrong colour, or the one that belongs on top */
  lawful?: LightToken;
  /** the light shown: extra, the wrong colour, or the one on top that should not be */
  shown?: LightToken;
}

/** One lawful vessel and bearing that shows a view; the "beside" display. */
export interface LawfulExample {
  facts: FactRecord;
  display: Display;
  theta: number;
}

/** An explanation of an unlawful view: the change, and a lawful view it undoes to. */
export interface UnlawfulExplanation extends UnlawfulReason {
  example: LawfulExample;
}

const tokenKey = (t: LightToken) => `${t.color}${t.flashing ? '!' : ''}`;
const parseToken = (k: string): LightToken => ({
  color: k.replace('!', ''),
  flashing: k.endsWith('!'),
});

/** A view's identity: the sorted colour/character multiset, as Identify's free build reads it. */
export function viewKey(lights: LightToken[]): string {
  return lights.map(tokenKey).sort().join(',');
}

/**
 * A view as the eye arranges it: the centreline lights that line up
 * vertically from this bearing, each line top first, and the rest unordered.
 */
interface Layout {
  cols: string[][];
  off: string[];
}

function layoutOf(visible: VisibleLight[]): Layout {
  const centre = visible
    .filter((v) => v.centreline)
    .sort((a, b) => a.across - b.across);
  const cols: VisibleLight[][] = [];
  for (const v of centre) {
    const last = cols[cols.length - 1];
    if (last && v.across - last[0].across <= IN_LINE) last.push(v);
    else cols.push([v]);
  }
  return {
    cols: cols.map((c) => [...c].sort((a, b) => b.z - a.z).map(tokenKey)),
    off: visible.filter((v) => !v.centreline).map(tokenKey),
  };
}

const layoutKey = (l: Layout): string =>
  `${l.cols
    .filter((c) => c.length > 0)
    .map((c) => c.join('>'))
    .sort()
    .join(' ')}|${[...l.off].sort().join(',')}`;

interface LawfulViews {
  /** view key -> the first lawful vessel and bearing found showing it */
  views: Map<string, LawfulExample>;
  /** every lawful layout: the view with its vertical lines in order */
  layouts: Set<string>;
  /** every light token any lawful view contains */
  tokens: string[];
}

const viewsCache = new Map<string, LawfulViews>();

/**
 * Every view a lawful vessel in scope shows from some bearing: each fact
 * record in Identify's candidate pool, each of its lawful displays, every
 * bearing Identify sweeps.
 */
export function lawfulViews(jurisdiction: string): LawfulViews {
  const hit = viewsCache.get(jurisdiction);
  if (hit) return hit;
  const views = new Map<string, LawfulExample>();
  const layouts = new Set<string>();
  const tokens = new Set<string>();
  for (const facts of candidatePool(jurisdiction)) {
    for (const display of evaluateDisplayIn(jurisdiction, facts).displays) {
      if (display.lights.length === 0) continue;
      const visibleAt = placedVisibility(facts, display);
      for (let theta = 0; theta < 360; theta += THETA_STEP) {
        const seen = visibleAt(theta);
        if (seen.length === 0) continue;
        const key = viewKey(seen);
        if (!views.has(key)) views.set(key, { facts, display, theta });
        layouts.add(layoutKey(layoutOf(seen)));
        for (const t of seen) tokens.add(tokenKey(t));
      }
    }
  }
  const out = { views, layouts, tokens: [...tokens].sort() };
  viewsCache.set(jurisdiction, out);
  return out;
}

/** Does some lawful vessel in scope show exactly these lights from some bearing? */
export function isLawfulView(
  lights: LightToken[],
  jurisdiction: string,
): boolean {
  return (
    lights.length === 0 || lawfulViews(jurisdiction).views.has(viewKey(lights))
  );
}

/**
 * Every one-light change that turns these lights into a lawful view: the
 * reasons the view is unlawful, each with a vessel that shows the lawful
 * one. Empty when the view is lawful, or when no single change mends it.
 */
export function explainUnlawful(
  lights: LightToken[],
  jurisdiction: string,
): UnlawfulExplanation[] {
  if (isLawfulView(lights, jurisdiction)) return [];
  const { views, tokens } = lawfulViews(jurisdiction);
  const keys = lights.map(tokenKey);
  const out: UnlawfulExplanation[] = [];
  const seen = new Set<string>();
  const add = (
    kind: UnlawfulKind,
    mended: string[],
    lawful?: string,
    shown?: string,
  ) => {
    const example = views.get([...mended].sort().join(','));
    const id = `${kind}|${lawful ?? ''}|${shown ?? ''}`;
    if (!example || seen.has(id)) return;
    seen.add(id);
    out.push({
      kind,
      ...(lawful ? { lawful: parseToken(lawful) } : {}),
      ...(shown ? { shown: parseToken(shown) } : {}),
      example,
    });
  };
  for (const t of tokens) add('missing', [...keys, t], t);
  keys.forEach((k, i) => {
    const rest = keys.filter((_, j) => j !== i);
    if (rest.length > 0) add('extra', rest, undefined, k);
    for (const t of tokens) if (t !== k) add('colour', [...rest, t], t, k);
  });
  return out;
}

/** Does some lawful vessel show these lights from some bearing, with every vertical line in this order? */
export function isLawfulLayout(
  visible: VisibleLight[],
  jurisdiction: string,
): boolean {
  return (
    visible.length === 0 ||
    lawfulViews(jurisdiction).layouts.has(layoutKey(layoutOf(visible)))
  );
}

/**
 * The kinds of one-light change that turn this layout into a lawful one:
 * add a light anywhere, take one away, recolour one, or swap two.
 */
function layoutMends(
  visible: VisibleLight[],
  jurisdiction: string,
): Set<UnlawfulKind> {
  const { layouts, tokens } = lawfulViews(jurisdiction);
  const base = layoutOf(visible);
  const kinds = new Set<UnlawfulKind>();
  const test = (kind: UnlawfulKind, l: Layout) => {
    if (layouts.has(layoutKey(l))) kinds.add(kind);
  };
  // every light's slot: [column index or -1 for off-line, position]
  const slots: [number, number][] = [
    ...base.cols.flatMap((c, ci) =>
      c.map((_, k) => [ci, k] as [number, number]),
    ),
    ...base.off.map((_, k) => [-1, k] as [number, number]),
  ];
  const get = (l: Layout, [ci, k]: [number, number]) =>
    ci < 0 ? l.off[k] : l.cols[ci][k];
  const copy = (l: Layout): Layout => ({
    cols: l.cols.map((c) => [...c]),
    off: [...l.off],
  });
  const set = (l: Layout, [ci, k]: [number, number], t: string) => {
    if (ci < 0) l.off[k] = t;
    else l.cols[ci][k] = t;
  };
  for (const t of tokens) {
    test('missing', { cols: base.cols, off: [...base.off, t] });
    test('missing', { cols: [...base.cols, [t]], off: base.off });
    base.cols.forEach((c, ci) => {
      for (let k = 0; k <= c.length; k++) {
        const l = copy(base);
        l.cols[ci].splice(k, 0, t);
        test('missing', l);
      }
    });
  }
  for (const s of slots) {
    const l = copy(base);
    if (s[0] < 0) l.off.splice(s[1], 1);
    else l.cols[s[0]].splice(s[1], 1);
    test('extra', l);
    for (const t of tokens) {
      if (t === get(base, s)) continue;
      const r = copy(base);
      set(r, s, t);
      test('colour', r);
    }
  }
  slots.forEach((a, i) =>
    slots.slice(i + 1).forEach((b) => {
      if (get(base, a) === get(base, b)) return;
      const l = copy(base);
      set(l, a, get(base, b));
      set(l, b, get(base, a));
      test('place', l);
    }),
  );
  return kinds;
}

/**
 * Lights Identify was told are one vertical line that no lawful vessel
 * shows in that order, though some does with two of them swapped: the
 * swaps that mend it, each with a vessel that shows the mended line.
 */
export function explainOrder(
  seen: SeenLight[],
  jurisdiction: string,
  arrangement: Arrangement,
): UnlawfulExplanation[] {
  if (arrangement !== 'vertical' || seen.length < 2) return [];
  if (identifyCandidates(seen, jurisdiction, arrangement).length > 0) return [];
  const out: UnlawfulExplanation[] = [];
  seen.forEach((a, i) =>
    seen.slice(i + 1).forEach((b, d) => {
      const j = i + 1 + d;
      if (a.color === b.color && a.flashing === b.flashing) return;
      const swapped = [...seen];
      [swapped[i], swapped[j]] = [b, a];
      const c = identifyCandidates(swapped, jurisdiction, arrangement)[0];
      if (!c) return;
      out.push({
        kind: 'place',
        shown: { color: a.color, flashing: a.flashing },
        lawful: { color: b.color, flashing: b.flashing },
        example: { facts: c.facts, display: c.display, theta: c.thetas[0] },
      });
    }),
  );
  return out;
}

const COLOURS = ['white', 'red', 'green', 'yellow'];

/** An all-round light added at the mast, as no rule asks for. */
const extraLight = (color: string): DisplayLight => ({
  spec: { light: 'light:all_round', color },
  source_entry: 'unlawful',
  sourceEntry: 'unlawful',
  modality: 'modality:shall',
});

/** Every one-entry change to a display, by the kind of change meant. */
function mutations(display: Display): Record<UnlawfulKind, Display[]> {
  const ls = display.lights;
  const out: Record<UnlawfulKind, Display[]> = {
    missing: [],
    extra: [],
    colour: [],
    place: [],
  };
  const withLights = (lights: DisplayLight[]): Display => ({
    ...display,
    lights,
  });
  ls.forEach((l, i) => {
    const count = l.spec.count ?? 1;
    // missing: one of a stack, or the whole entry
    out.missing.push(
      withLights(
        count > 1
          ? ls.map((m, j) =>
              j === i ? { ...m, spec: { ...m.spec, count: count - 1 } } : m,
            )
          : ls.filter((_, j) => j !== i),
      ),
    );
    // colour: only all-round lights take theirs from the entry
    if (l.spec.light === 'light:all_round' && l.spec.color) {
      for (const c of COLOURS) {
        if (c === l.spec.color) continue;
        const recoloured: DisplayLight = {
          ...l,
          spec: { ...l.spec, count: 1, color: c },
        };
        out.colour.push(
          withLights(
            count > 1
              ? [
                  ...ls.map((m, j) =>
                    j === i
                      ? { ...m, spec: { ...m.spec, count: count - 1 } }
                      : m,
                  ),
                  recoloured,
                ]
              : ls.map((m, j) => (j === i ? recoloured : m)),
          ),
        );
      }
    }
  });
  for (const c of COLOURS) out.extra.push(withLights([...ls, extraLight(c)]));
  // place: two lights of a stack, different colours, trade places
  ls.forEach((a, i) =>
    ls.forEach((b, j) => {
      if (
        j <= i ||
        a.spec.light !== 'light:all_round' ||
        b.spec.light !== 'light:all_round'
      )
        return;
      if (!a.spec.position || !b.spec.position || a.spec.color === b.spec.color)
        return;
      out.place.push(
        withLights(
          ls.map((m, k) =>
            k === i
              ? { ...m, spec: { ...m.spec, position: b.spec.position } }
              : k === j
                ? { ...m, spec: { ...m.spec, position: a.spec.position } }
                : m,
          ),
        ),
      );
    }),
  );
  return out;
}

/** How the lights seen changed: exactly one light gone, added or recoloured, else null. */
export function oneChange(
  before: LightToken[],
  after: LightToken[],
): UnlawfulReason | null {
  const left = before.map(tokenKey);
  const right: string[] = [];
  for (const k of after.map(tokenKey)) {
    const at = left.indexOf(k);
    if (at >= 0) left.splice(at, 1);
    else right.push(k);
  }
  if (left.length === 1 && right.length === 0)
    return { kind: 'missing', lawful: parseToken(left[0]) };
  if (left.length === 0 && right.length === 1)
    return { kind: 'extra', shown: parseToken(right[0]) };
  if (left.length === 1 && right.length === 1)
    return {
      kind: 'colour',
      lawful: parseToken(left[0]),
      shown: parseToken(right[0]),
    };
  return null;
}

/** What an unlawful question shows, and what it was made from. */
export interface UnlawfulDisplay {
  /** the display drawn in the scene: the lawful one with one change */
  shown: Display;
  /** the change, as seen from the question's bearing */
  reason: UnlawfulReason;
  /**
   * Every kind of one-light change that mends the scene into some lawful
   * vessel's view: the right answers to "why". The lights alone seldom say
   * which vessel was meant, so a light too many for one may be the wrong
   * colour for another.
   */
  mends: UnlawfulKind[];
}

/**
 * An unlawful variant of a lawful display seen from `theta`: one change,
 * visible from that bearing, whose result no lawful vessel in scope shows
 * from any bearing. Null when no change of this display qualifies.
 */
export function unlawfulVariant(
  facts: FactRecord,
  display: Display,
  theta: number,
  jurisdiction: string,
  rng: () => number,
): UnlawfulDisplay | null {
  const before = placedVisibility(facts, display)(theta);
  const shuffle = <T>(xs: T[]): T[] => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  // each kind as likely to be tried first, however many changes it offers
  const byKind = mutations(display);
  const cands = shuffle([...UNLAWFUL_KINDS]).flatMap((k) => shuffle(byKind[k]));
  for (const shown of cands) {
    const after = placedVisibility(facts, shown)(theta);
    if (after.length === 0) continue;
    if (viewKey(after) === viewKey(before)) {
      const moved = placeVariant(before, after, jurisdiction);
      if (moved) return { shown, ...moved };
      continue;
    }
    const reason = oneChange(before, after);
    if (!reason || isLawfulView(after, jurisdiction)) continue;
    const kinds = new Set(
      explainUnlawful(after, jurisdiction).map((e) => e.kind),
    );
    if (!kinds.has(reason.kind)) continue;
    return { shown, reason, mends: UNLAWFUL_KINDS.filter((k) => kinds.has(k)) };
  }
  return null;
}

/** The same lights in a new order: unlawful only if no lawful vessel lines them up so. */
function placeVariant(
  before: VisibleLight[],
  after: VisibleLight[],
  jurisdiction: string,
): Omit<UnlawfulDisplay, 'shown'> | null {
  if (isLawfulLayout(after, jurisdiction)) return null;
  const was = layoutOf(before).cols;
  const now = layoutOf(after).cols;
  if (was.length !== now.length) return null;
  for (let c = 0; c < now.length; c++) {
    const k = now[c].findIndex((t, i) => t !== was[c][i]);
    if (k < 0) continue;
    const kinds = layoutMends(after, jurisdiction);
    if (!kinds.has('place')) return null;
    return {
      reason: {
        kind: 'place',
        shown: parseToken(now[c][k]),
        lawful: parseToken(was[c][k]),
      },
      mends: UNLAWFUL_KINDS.filter((x) => kinds.has(x)),
    };
  }
  return null;
}

/**
 * A judged question: a reverse question whose seed draws an unlawful display
 * one time in five (UNLAWFUL_SHARE). An unlawful one is tried at the
 * question's bearing first, then at the level's other bearings; a display no
 * change can make unlawful stays lawful.
 */
export function judged(
  q: ReverseQuestion,
  seed: number,
  jurisdiction: string,
  thetas: number[],
): ReverseQuestion {
  const rng = mulberry32(seed ^ 0x212);
  if (rng() >= UNLAWFUL_SHARE) return q;
  for (const theta of [q.theta, ...thetas.filter((t) => t !== q.theta)]) {
    const u = unlawfulVariant(q.facts, q.display, theta, jurisdiction, rng);
    if (!u) continue;
    return {
      ...q,
      theta,
      options: q.options.map((o, i) =>
        i === q.answerIndex ? { ...o, theta } : o,
      ),
      unlawful: u,
    };
  }
  return q;
}
