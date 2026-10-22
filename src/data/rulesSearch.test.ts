import { describe, expect, it } from 'vitest';
import {
  BASE_JURISDICTION,
  resolveEntries,
  resolveSkeleton,
} from './jurisdictions';
import { DEFAULT_CORPUS_ID, resolveParagraphs } from './corpusText';
import { paragraphsForCite } from './cites';
import {
  entriesForParagraph,
  highlightRuns,
  matches,
  partOf,
  searchParagraphs,
} from './rulesSearch';

function itemsFor(jurisdiction = BASE_JURISDICTION) {
  const paths = Object.keys(resolveSkeleton(jurisdiction));
  return resolveParagraphs(jurisdiction, paths, DEFAULT_CORPUS_ID).items.map(
    (r) => ({
      path: r.path,
      text: r.shown?.para.text,
    }),
  );
}

describe('rules search', () => {
  it('"cone" finds 25(e) and 26(c)', () => {
    const hits = searchParagraphs(itemsFor(), 'cone');
    expect(hits).toContain('25(e)');
    expect(hits.some((p) => p.startsWith('26(c)'))).toBe(true);
  });

  it('matches word starts, case-insensitively, all terms', () => {
    expect(matches('A vessel engaged in Trawling', 'trawl')).toBe(true);
    expect(matches('A vessel engaged in Trawling', 'vessel trawling')).toBe(
      true,
    );
    expect(matches('A vessel engaged in Trawling', 'vessel fishing')).toBe(
      false,
    );
    expect(matches('economic', 'cone')).toBe(false);
    expect(matches('anything', '   ')).toBe(false);
  });

  it('cuts text into highlight runs that rejoin to the original', () => {
    const text = 'a cone, apex upward; two cones';
    const runs = highlightRuns(text, 'cone');
    expect(runs.map((r) => r.text).join('')).toBe(text);
    expect(runs.filter((r) => r.hit).map((r) => r.text)).toEqual([
      'cone',
      'cones',
    ]);
  });

  it('places rules in their Part', () => {
    expect(['3', '9', '25', '32'].map(partOf)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('reaches every applicability entry from a paragraph it cites', () => {
    for (const e of resolveEntries(BASE_JURISDICTION)) {
      const paths = paragraphsForCite(e.cite, BASE_JURISDICTION);
      const reached = paths.some((p) =>
        entriesForParagraph(p, BASE_JURISDICTION).some((x) => x.id === e.id),
      );
      expect(reached, e.id).toBe(true);
    }
  });
});
