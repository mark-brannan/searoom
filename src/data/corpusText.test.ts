// The corpus layer against colregs' own index: every corpus the index
// names is shipped and readable; the reference corpus covers the skeleton;
// fallback is explicit and never silent (REQ-LANG-7); switching corpus
// changes the words and nothing else (REQ-LANG-2); an inherited path under
// a delta jurisdiction reads from the base corpus and says so (ADR 0020).

import { describe, expect, it } from 'vitest';
import { applicability, rules } from './colregs';
import { paragraphsForCite } from './cites';
import {
  DEFAULT_CORPUS_ID,
  corpora,
  corporaFor,
  corpusById,
  corpusIn,
  corpusIndex,
  editionOf,
  expectedTextCount,
  fallbackFor,
  referenceCorpus,
  referenceCorpusFor,
  resolveParagraph,
  resolveParagraphs,
} from './corpusText';
import {
  BASE_JURISDICTION,
  JURISDICTION_IDS,
  pathSuppressionsFor,
  resolveSkeleton,
  restatedPathsFor,
} from './jurisdictions';

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

  it('has a reference corpus for the base that is the default', () => {
    expect(referenceCorpus.language.startsWith('en')).toBe(true);
    expect(DEFAULT_CORPUS_ID).toBe(referenceCorpus.id);
    expect(fallbackFor(referenceCorpus)).toBeUndefined();
  });

  it('has a reference corpus for every jurisdiction the data carries', () => {
    for (const j of JURISDICTION_IDS) {
      const ref = referenceCorpusFor(j);
      expect(ref, `${j} has no reference corpus`).toBeDefined();
      expect(ref!.edition).toBe(`${j}@${ref!.edition.split('@')[1]}`);
    }
  });

  it('lists the Spanish and Finnish corpora for intl', () => {
    const langs = corporaFor('intl').map((c) => c.language);
    expect(langs).toContain('es');
    expect(langs).toContain('fi');
    expect(langs[0]).toBe(referenceCorpus.language);
  });

  it('never reads one jurisdiction\'s corpus under another', () => {
    const boe = corporaFor('intl').find((c) => c.language === 'es')!;
    expect(corpusIn('intl', boe.id).id).toBe(boe.id);
    expect(corpusIn('us/inland', boe.id).id).toBe(referenceCorpusFor('us/inland')!.id);
    expect(corpusIn('intl', 'nowhere').id).toBe(referenceCorpus.id);
  });

  it('expects a delta jurisdiction to carry only what it restates', () => {
    expect(expectedTextCount('intl')).toBe(skeletonPaths.length);
    expect(expectedTextCount('us/inland')).toBe(restatedPathsFor('us/inland').length);
  });
});

describe('reference corpus coverage', () => {
  // colregs #185: 30(d)(i) and 30(d)(ii) are in the skeleton but the USCG
  // corpus has neither their text nor a recorded gap. Pinned so the drift is
  // visible and this test flips the day the package fixes it.
  const knownDrift = ['30(d)(i)', '30(d)(ii)'];

  it('supplies text or a recorded gap for every skeleton path (colregs #185 excepted)', () => {
    const uncovered = skeletonPaths.filter((p) => {
      const r = resolveParagraph(BASE_JURISDICTION, p, referenceCorpus.id);
      const gap = (referenceCorpus.gaps ?? []).some((g) => g.path === p);
      expect(r.fallback).toBe(false);
      return r.shown === undefined && !gap;
    });
    expect(uncovered).toEqual(knownDrift);
  });
});

describe('per-paragraph fallback (REQ-LANG-7)', () => {
  for (const c of corporaFor('intl').filter((c) => c.id !== referenceCorpus.id)) {
    describe(c.id, () => {
      it('never resolves silently: every path is own text, labelled fallback, or a stated reason', () => {
        for (const p of skeletonPaths) {
          const r = resolveParagraph(BASE_JURISDICTION, p, c.id);
          expect(r.inherited).toBe(false);
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
        const { items, mixed, fallbackCount } = resolveParagraphs(
          BASE_JURISDICTION,
          rule25,
          c.id,
        );
        expect(items.length).toBe(rule25.length);
        expect(mixed).toBe(fallbackCount > 0 && fallbackCount < items.length);
      });
    });
  }
});

describe('inheritance under a delta jurisdiction (ADR 0020)', () => {
  const j = 'us/inland';
  const own = referenceCorpusFor(j)!;
  const skeleton = resolveSkeleton(j);
  const restated = new Set(restatedPathsFor(j));
  const inherited = Object.keys(skeleton).filter((p) => !restated.has(p));

  it('reads an inherited path from the base corpus, labelled inherited, not fallback', () => {
    expect(inherited.length).toBeGreaterThan(0);
    for (const p of inherited) {
      const r = resolveParagraph(j, p, own.id);
      if (own.paragraphs[p]?.text) continue; // the corpus happens to restate it verbatim
      if (!r.shown) {
        // only a base gap may leave an inherited path empty
        expect(r.reason, `${p}: nothing shown and no reason`).toBeTruthy();
        continue;
      }
      expect(r.inherited).toBe(true);
      expect(r.fallback).toBe(false);
      expect(r.shown.corpus.id).toBe(referenceCorpus.id);
      expect(r.shown.corpus.language).toBe(own.language);
    }
  });

  it('never shows base text for a restated path the corpus has not filled', () => {
    for (const p of restated) {
      const r = resolveParagraph(j, p, own.id);
      if (r.shown) {
        expect(r.shown.corpus.id).not.toBe(referenceCorpus.id);
      } else {
        expect(r.inherited).toBe(false);
        expect(r.reason, `${p}: nothing shown and no reason`).toBeTruthy();
      }
    }
  });

  it('resolves nothing for a path the jurisdiction voids', () => {
    for (const s of pathSuppressionsFor(j)) {
      expect(skeleton[s.path]).toBeUndefined();
    }
  });
});

describe('switching corpus changes no entry set (REQ-LANG-2)', () => {
  it('resolves every entry cite to the same paths in every corpus', () => {
    for (const entry of applicability.entries) {
      const paths = paragraphsForCite(entry.cite, entry.jurisdiction);
      for (const c of corporaFor(entry.jurisdiction)) {
        const { items } = resolveParagraphs(entry.jurisdiction, paths, c.id);
        expect(items.map((r) => r.path)).toEqual(paths);
      }
    }
  });
});
