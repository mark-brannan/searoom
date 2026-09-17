// The corpus layer against colregs' own registry: every corpus the registry
// names for a jurisdiction is bundled, Rule 25 reads in each with its
// provenance, a paragraph missing from a corpus falls back to that
// jurisdiction's reference and says so (REQ-LANG-7), a path inherited from
// the base is inheritance rather than fallback (ADR 0020), and switching
// corpus moves no entry set (REQ-LANG-2).

import { describe, expect, it } from 'vitest';
import { entriesForRule, paragraphsForCite, ruleOf } from './cites';
import {
  REFERENCE_CORPUS_ID,
  corpusById,
  corpusIdsFor,
  corpusIndex,
  coverage,
  editionFor,
  isCorpusId,
  referenceCorpusIdFor,
} from './corpora';
import {
  corpusFor,
  resolveParagraphs,
  ruleTitleFor,
  textFor,
  viewParagraph,
} from './corpusText';
import { evaluateDisplayIn } from '../engine/evaluate';
import { BASE_JURISDICTION, resolveSkeleton } from './jurisdictions';
import { DEFAULT_FACTS } from '../state/urlState';

const skeletonPaths = Object.keys(resolveSkeleton(BASE_JURISDICTION));
const rule25 = skeletonPaths.filter((p) => ruleOf(p) === '25');
const intlCorpusIds = corpusIdsFor(BASE_JURISDICTION);

describe('corpus registry', () => {
  it('bundles every corpus the registry names for the base', () => {
    expect(intlCorpusIds).toContain(REFERENCE_CORPUS_ID);
    for (const id of intlCorpusIds) {
      expect(isCorpusId(id)).toBe(true);
      expect(corpusById(id).id).toBe(id);
    }
  });

  it('agrees with the registry on paragraph counts', () => {
    for (const id of Object.keys(corpusIndex)) {
      if (!isCorpusId(id)) continue;
      expect(Object.keys(corpusById(id).paragraphs).length).toBe(
        corpusIndex[id].paragraphs,
      );
    }
  });

  it('names the edition each corpus reflects', () => {
    for (const id of intlCorpusIds) {
      const e = editionFor(corpusById(id));
      expect(e.jurisdiction).toBe('intl');
      expect(e.amendedThrough).toBeTruthy();
      expect(e.inForce).toBeTruthy();
    }
  });

  it('rejects an unknown corpus id', () => {
    expect(isCorpusId('intl@2016.xx.nowhere')).toBe(false);
    expect(corpusById('intl@2016.xx.nowhere').id).toBe(REFERENCE_CORPUS_ID);
  });

  it('gives each jurisdiction its own reference corpus', () => {
    expect(referenceCorpusIdFor(BASE_JURISDICTION)).toBe(REFERENCE_CORPUS_ID);
    for (const j of ['intl', 'us/inland']) {
      const ref = referenceCorpusIdFor(j);
      expect(isCorpusId(ref)).toBe(true);
      expect(corpusIdsFor(j)).toContain(ref);
    }
  });

  it('reads a corpus of another jurisdiction as this one is reference', () => {
    // a stale txt= never renders one instrument's words under another's heading
    expect(corpusFor('us/inland', 'intl@2016.es.boe').id).toBe(
      referenceCorpusIdFor('us/inland'),
    );
    expect(corpusFor('intl', 'intl@2016.es.boe').id).toBe('intl@2016.es.boe');
  });
});

describe('Rule 25 in every corpus', () => {
  it('has paragraphs in the skeleton', () => {
    expect(rule25.length).toBeGreaterThan(0);
  });

  for (const id of ['intl@2016.es.boe', 'intl@2016.fi.finlex']) {
    it(`reads in ${id} with tier and source visible`, () => {
      const { paragraphs } = resolveParagraphs(BASE_JURISDICTION, rule25, id);
      for (const p of paragraphs) {
        expect(p.requested.id).toBe(id);
        expect(p.corpus.tier).toBeTruthy();
        expect(p.corpus.source.publisher).toBeTruthy();
        expect(p.text ?? p.gap).toBeTruthy();
      }
      expect(ruleTitleFor(BASE_JURISDICTION, rule25, id)).toBeTruthy();
    });

    it(`says which paragraphs of ${id} come from the reference`, () => {
      const own = corpusById(id).paragraphs;
      for (const p of rule25) {
        const r = viewParagraph(BASE_JURISDICTION, p, id);
        if (p in own) {
          expect(r.fallback).toBe(false);
          expect(r.corpus.id).toBe(id);
        } else if (r.text !== undefined) {
          expect(r.fallback).toBe(true);
          expect(r.corpus.id).toBe(REFERENCE_CORPUS_ID);
        }
      }
    });
  }

  it('never labels a single-corpus run as mixed', () => {
    expect(
      resolveParagraphs(BASE_JURISDICTION, rule25, REFERENCE_CORPUS_ID).mixed,
    ).toBe(false);
  });

  it('labels a run as mixed only when both corpora contribute', () => {
    for (const id of intlCorpusIds) {
      const cov = coverage(id, rule25);
      const { mixed, fallbacks, paragraphs } = resolveParagraphs(
        BASE_JURISDICTION,
        rule25,
        id,
      );
      const withText = paragraphs.filter((p) => p.text !== undefined).length;
      expect(fallbacks).toBe(withText - cov.have);
      expect(mixed).toBe(cov.have > 0 && cov.have < withText);
    }
  });

  it('records the reference gap for a path no corpus has', () => {
    const r = viewParagraph(BASE_JURISDICTION, '24(g)(i)', 'intl@2016.fi.finlex');
    expect(r.text).toBeUndefined();
    expect(r.gap).toMatch(/USCG|not present/);
  });
});

describe('the corpus axis and the jurisdiction axis are separate', () => {
  it('reads an inherited path as inheritance, not fallback', () => {
    const inherited = skeletonPaths.find(
      (p) =>
        textFor('us/inland', p) !== undefined &&
        textFor('us/inland', p)?.own === false,
    );
    expect(inherited).toBeTruthy();
    const r = textFor('us/inland', inherited!)!;
    expect(r.own).toBe(false);
    expect(r.fallback).toBe(false);
    expect(r.corpus.id).toBe(REFERENCE_CORPUS_ID);
  });
});

describe('REQ-LANG-2: the corpus is invisible to the engine', () => {
  it('changes no entry set', () => {
    const applied = [
      ...evaluateDisplayIn(BASE_JURISDICTION, DEFAULT_FACTS).applied,
    ].sort();
    for (const id of intlCorpusIds) {
      corpusById(id);
      expect(
        [...evaluateDisplayIn(BASE_JURISDICTION, DEFAULT_FACTS).applied].sort(),
      ).toEqual(applied);
    }
  });

  it('cites the same skeleton paths whichever corpus is read', () => {
    for (const e of entriesForRule('25')) {
      const paths = paragraphsForCite(e.cite);
      for (const id of intlCorpusIds) {
        expect(
          resolveParagraphs(BASE_JURISDICTION, paths, id).paragraphs.map(
            (p) => p.path,
          ),
        ).toEqual(paths);
      }
    }
  });
});
