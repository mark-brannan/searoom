// Full-text search and the part/rule/paragraph tree for the Rules reference.
// Pure functions over already-resolved paragraphs, so the same words the
// reader sees are the words searched (no second copy of the corpus).

import { paragraphsForCite, ruleOf } from './cites';
import { resolveEntries } from './jurisdictions';

export type Part = 'A' | 'B' | 'C' | 'D';

/** The Part of the Rules a rule number belongs to (Rules 1-3 A, 4-19 B, 20-31 C, 32-37 D). */
export function partOf(rule: string): Part {
  const n = Number(rule);
  if (n <= 3) return 'A';
  if (n <= 19) return 'B';
  if (n <= 31) return 'C';
  return 'D';
}

/** Query terms: lowercase, whitespace-split, empties dropped. */
export function termsOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One term as a pattern. It matches at the start of a word, so "cone" finds
 * "cones"; a term ending in "e" also takes the "-ic" form, so "cone" finds
 * "conical" (Rule 25(e) says "conical shape"), without a stemmer.
 */
function termPattern(t: string): string {
  const e = escapeRe(t);
  return t.length >= 4 && t.endsWith('e')
    ? `${escapeRe(t.slice(0, -1))}(?:e|ic)`
    : e;
}

function termRe(terms: string[]): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${terms.map(termPattern).join('|')})`,
    'giu',
  );
}

/** True when every term starts some word of the text. */
export function matches(text: string, query: string): boolean {
  const terms = termsOf(query);
  if (terms.length === 0) return false;
  return terms.every((t) => new RegExp(termRe([t]).source, 'iu').test(text));
}

/** The text cut into plain and matched runs, for highlighting. */
export function highlightRuns(
  text: string,
  query: string,
): { text: string; hit: boolean }[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [{ text, hit: false }];
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${terms.map(termPattern).join('|')})[\\p{L}\\p{N}]*`,
    'giu',
  );
  const runs: { text: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) runs.push({ text: text.slice(last, at), hit: false });
    runs.push({ text: m[0], hit: true });
    last = at + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), hit: false });
  return runs;
}

/** Paths whose shown text matches the query, in the order given. */
export function searchParagraphs(
  items: { path: string; text?: string }[],
  query: string,
): string[] {
  return items
    .filter((i) => i.text !== undefined && matches(i.text, query))
    .map((i) => i.path);
}

/** Entries in force under a jurisdiction whose cite denotes this paragraph. */
export function entriesForParagraph(path: string, jurisdiction: string) {
  return resolveEntries(jurisdiction).filter((e) =>
    paragraphsForCite(e.cite, jurisdiction).includes(path),
  );
}

export { ruleOf };
