// The corpus layer against colregs' own index: every corpus the index
// names is shipped and readable; the reference corpus covers the skeleton;
// fallback is explicit and never silent (REQ-LANG-7); switching corpus
// changes the words and nothing else (REQ-LANG-2).

import { describe, expect, it } from 'vitest';
import { applicability, rules } from './colregs';
import { paragraphsForCite } from './cites';
import {
  DEFAULT_CORPUS_ID,
  corpora,
  corporaFor,
  corpusById,
  corpusIndex,
  editionOf,
  fallbackFor,
  referenceCorpus,
  resolveParagraph,
  resolveParagraphs,
} from './corpora';

const skeletonPaths = Object.keys(rules.paragraphs);

describe('corpus index', () => {
  it('ships every corpus the index names', () => {
    for (const [id, entry] of Object.entries(corpusIndex)) {
      const c = corpusById(id);
      expect(c, `${id} (${entry.file}) is in the index but not shipped`).toBeDefined();
      expect(c!.edition).toBe(entry.edition);
      expect(c!.language).toBe(entry.language);
      expect(c!.tier).toBe(entry.tier);
      expect(Object.keys(c!.paragraphs).length).toBe(entry.paragraphs);
    }
  });

  it('names a registered edition for every corpus', () => {
    for (const c of corpora) {
      expect(editionOf(c), `${c.id} names edition ${c.edition}`).toBeDefined();
    }
  });

  it('has a reference corpus for intl that is the default', () => {
    expect(referenceCorpus.language.startsWith('en')).toBe(true);
    expect(DEFAULT_CORPUS_ID).toBe(referenceCorpus.id);
    expect(fallbackFor(referenceCorpus)).toBeUndefined();
  });

  it('lists the Spanish and Finnish corpora for intl', () => {
    const langs = corporaFor('intl').map((c) => c.language);
    expect(langs).toContain('es');
    expect(langs).toContain('fi');
    expect(langs[0]).toBe(referenceCorpus.language);
  });
});

describe('reference corpus coverage', () => {
  it('supplies text or a recorded gap for every skeleton path', () => {
    for (const p of skeletonPaths) {
      const r = resolveParagraph(p, referenceCorpus.id);
      const gap = (referenceCorpus.gaps ?? []).some((g) => g.path === p);
      expect(
        r.shown !== undefined || gap,
        `${p} has neither text nor a recorded gap in ${referenceCorpus.id}`,
      ).toBe(true);
      expect(r.fallback).toBe(false);
    }
  });
});

describe('per-paragraph fallback (REQ-LANG-7)', () => {
  for (const c of corporaFor('intl').filter((c) => c.id !== referenceCorpus.id)) {
    describe(c.id, () => {
      it('never resolves silently: every path is own text, labelled fallback, or a stated reason', () => {
        for (const p of skeletonPaths) {
          const r = resolveParagraph(p, c.id);
          if (r.shown && !r.fallback) {
            expect(r.shown.corpus.id).toBe(c.id);
            expect(r.reason).toBeUndefined();
          } else if (r.shown) {
            expect(r.fallback).toBe(true);
            expect(r.shown.corpus.id).toBe(referenceCorpus.id);
            expect(r.reason, `${p}: fallback without a reason`).toBeTruthy();
          } else {
            expect(r.reason, `${p}: nothing shown and no reason`).toBeTruthy();
          }
        }
      });

      it('marks a rule as mixed only when some but not all paragraphs fell back', () => {
        const rule25 = skeletonPaths.filter((p) => rules.paragraphs[p].rule === '25');
        const { items, mixed, fallbackCount } = resolveParagraphs(rule25, c.id);
        expect(items.length).toBe(rule25.length);
        expect(mixed).toBe(fallbackCount > 0 && fallbackCount < items.length);
      });
    });
  }
});

describe('switching corpus changes no entry set (REQ-LANG-2)', () => {
  it('resolves every entry cite to the same paths in every corpus', () => {
    for (const entry of applicability.entries) {
      const paths = paragraphsForCite(entry.cite);
      for (const c of corpora) {
        const { items } = resolveParagraphs(paths, c.id);
        expect(items.map((r) => r.path)).toEqual(paths);
      }
    }
  });
});
