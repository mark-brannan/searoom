// Issue #113: signposts are generated from what colregs declares, not
// hand-copied prose. These tests are the sync check — they fail when a
// signpost claims something the package contradicts, the same way
// corpusText.test.ts's `knownDrift` pins catch drift in the corpus layer.

import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import fi from '../i18n/fi.json';
import { applicability } from './colregs';
import {
  bulletTextFor,
  isSettledInColregs,
  knownColregsId,
} from './colregsRequirements';
import { corpora as shippedCorpora } from './corpusText';
import { JURISDICTION_IDS } from './jurisdictions';
import {
  allSignposts,
  corpora,
  jurisdictions,
  parts,
  supersededBy,
  type Signpost,
} from './signposts';

const catalogs = { en, fi } as Record<string, Record<string, string>>;

describe('generated rows track colregs', () => {
  it('carries every jurisdiction colregs data has, live, once each', () => {
    for (const id of JURISDICTION_IDS) {
      const sp = jurisdictions.find((j) => j.id === id.replace('/', '-'));
      expect(sp, `${id} has no generated signpost`).toBeDefined();
      expect(sp!.status).toBe('live');
      expect(
        jurisdictions.filter((j) => j.id === sp!.id).length,
        `${id} appears more than once (a stale candidate row was not filtered)`,
      ).toBe(1);
    }
  });

  it('carries every corpus colregs ships, live, once each, with its own tier/language/edition id', () => {
    for (const c of shippedCorpora) {
      const sp = corpora.find((s) => s.corpusId === c.id);
      expect(sp, `${c.id} has no generated signpost`).toBeDefined();
      expect(sp!.status).toBe('live');
      expect(sp!.tier).toBe(c.tier);
      expect(sp!.language).toBe(c.language);
      expect(
        corpora.filter((s) => s.corpusId === c.id).length,
        `${c.id} appears more than once (a stale candidate row was not filtered)`,
      ).toBe(1);
    }
  });

  it('never signposts a corpus as blocked once colregs ships it', () => {
    // A candidate names a language (and sometimes a source), never a
    // corpus id, so the filter matches on those: any candidate still listed
    // must be unmatched by every shipped corpus.
    for (const sp of corpora) {
      if (sp.status === 'live') continue;
      for (const shipped of shippedCorpora) {
        expect(
          supersededBy(sp, shipped),
          `${sp.id} is still listed as ${sp.status} but colregs ships ${shipped.id}`,
        ).toBe(false);
      }
    }
  });

  it('retires a candidate once colregs ships its language (or its named source)', () => {
    const candidate = (over: Partial<Signpost>): Signpost => ({
      id: 'x',
      kind: 'corpus',
      status: 'ranked',
      bodyKeys: [],
      blockers: [],
      link: '',
      ...over,
    });
    const shipped = (language: string, source_id: string) =>
      ({
        ...shippedCorpora[0],
        language,
        source_id,
      }) as (typeof shippedCorpora)[0];
    // language-wide candidate: any source in that language retires it
    expect(
      supersededBy(candidate({ language: 'ru' }), shipped('ru', 'gost')),
    ).toBe(true);
    expect(
      supersededBy(candidate({ language: 'ru' }), shipped('ru-RU', 'gost')),
    ).toBe(true);
    expect(
      supersededBy(candidate({ language: 'ru' }), shipped('rue', 'x')),
    ).toBe(false);
    // source-pinned candidate: only that source retires it — en-US/uscg is
    // shipped today and must not retire the en/unts row
    const enUnts = candidate({ language: 'en', sourceId: 'unts' });
    expect(supersededBy(enUnts, shipped('en-US', 'uscg'))).toBe(false);
    expect(supersededBy(enUnts, shipped('en', 'unts'))).toBe(true);
    // no language at all (`community`) is never retired by data
    expect(supersededBy(candidate({}), shipped('en', 'unts'))).toBe(false);
  });

  it('marks day shapes live exactly when the applicability data carries a shapes entry', () => {
    const hasShapes = applicability.entries.some(
      (e) => (e.shapes?.length ?? 0) > 0,
    );
    const sp = parts.find((p) => p.id === 'day-shapes')!;
    expect(sp.status).toBe(hasShapes ? 'live' : 'modelled-for');
  });

  it('never claims Part B is out-of-scope once applicability data carries a category entry', () => {
    const hasPartB = applicability.entries.some((e) => e.category);
    const sp = parts.find((p) => p.id === 'part-b')!;
    if (hasPartB) expect(sp.status).not.toBe('out-of-scope');
  });
});

describe('colregs registry reader', () => {
  // The struck-through detector is what makes a superseded REQ-* fail a
  // test; nothing cites one today, so pin it against colregs' own doc.
  it('reads a struck-through REQ-* as settled and a live one as open', () => {
    expect(knownColregsId('REQ-PART-4')).toBe(true);
    expect(isSettledInColregs('REQ-PART-4')).toBe(true);
    expect(isSettledInColregs('REQ-PART-2')).toBe(false);
  });

  it('reads gates.json status and rejects an id colregs never declared', () => {
    expect(knownColregsId('GATE-2')).toBe(true);
    expect(isSettledInColregs('GATE-2')).toBe(true);
    expect(knownColregsId('Q-999')).toBe(false);
    expect(knownColregsId('REQ-NOPE-1')).toBe(false);
  });
});

describe("blockers, checked against colregs' own list", () => {
  const allBlockers = allSignposts.flatMap((sp) =>
    sp.blockers.map((b) => ({ sp: sp.id, ...b })),
  );

  it('cites no blocker id that is not an issue reference or a colregs Q-*/REQ-*/GATE-* id', () => {
    for (const b of allBlockers) {
      if (/^#\d+$/.test(b.id)) continue; // a colregs GitHub issue, not checked here
      expect(knownColregsId(b.id), `${b.sp}: ${b.id} is not a colregs id`).toBe(
        true,
      );
    }
  });

  it('cites no REQ-* or GATE-* blocker that colregs itself marks settled', () => {
    for (const b of allBlockers) {
      if (/^#\d+$/.test(b.id) || b.id.startsWith('Q-')) continue;
      expect(
        isSettledInColregs(b.id),
        `${b.sp}: ${b.id} is cited as an active blocker`,
      ).toBe(false);
    }
  });

  // Q-* resolution is prose, not a machine marker (colregsRequirements.ts),
  // so pin the bullet text behind every Q-* blocker actually in play: a
  // change here means colregs moved the goalposts and a human has to look,
  // same as corpusText.test.ts's `knownDrift` for the corpus layer.
  const pinnedQuestions: Record<string, string> = {
    'Q-1': 'Blocks REQ-PART-3.',
    'Q-3': "CEVNI stays open: the UN's default terms",
    'Q-7': 'confirmed **blocked**',
  };

  it('pins the colregs bullet behind every Q-* blocker in use', () => {
    const cited = new Set(
      allBlockers.map((b) => b.id).filter((id) => id.startsWith('Q-')),
    );
    for (const id of cited) {
      expect(
        pinnedQuestions,
        `${id} has no pinned snippet in this test`,
      ).toHaveProperty(id);
      const text = bulletTextFor(id);
      expect(text, `colregs no longer declares ${id}`).toBeDefined();
      expect(
        text,
        `${id}'s bullet no longer contains the pinned snippet — re-read it and update the signpost`,
      ).toContain(pinnedQuestions[id]);
    }
  });
});

describe('shape', () => {
  it('gives every row exactly one of a label or a labelKey, never both or neither', () => {
    for (const sp of allSignposts) {
      const hasLabel = sp.label !== undefined;
      const hasLabelKey = sp.labelKey !== undefined;
      expect(
        hasLabel !== hasLabelKey,
        `${sp.id} must carry exactly one of label/labelKey`,
      ).toBe(true);
    }
  });

  it('has an en and fi catalog entry for every labelKey and bodyKey cited', () => {
    for (const sp of allSignposts) {
      const keys = [sp.labelKey, ...sp.bodyKeys].filter(Boolean) as string[];
      for (const k of keys) {
        for (const [locale, catalog] of Object.entries(catalogs)) {
          expect(
            catalog,
            `${locale} is missing ${sp.id}'s ${k}`,
          ).toHaveProperty(k);
        }
      }
    }
  });

  it('has no duplicate signpost id across jurisdictions/parts/corpora', () => {
    const ids = allSignposts.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
