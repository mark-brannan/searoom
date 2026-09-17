// The merge-patch resolution of colregs ADR 0018 (entries) and ADR 0020
// (skeleton). The fixture replay in engine/fixtures.test.ts already proves the
// resolved entry set scores colregs' own cases; these assert the three
// operations the ADRs name — inherit, replace, suppress — and the field-by-
// field merge that a restated row depends on.

import { describe, expect, it } from 'vitest';
import { applicability, rules } from './colregs';
import { mergePatch } from './mergePatch';
import {
  BASE_JURISDICTION,
  JURISDICTION_IDS,
  entrySuppressionsFor,
  isJurisdiction,
  isJurisdictionOnly,
  pathSuppressionsFor,
  resolveEntries,
  resolveSkeleton,
  restatedPathsFor,
} from './jurisdictions';

const INLAND = 'us/inland';

describe('RFC 7396 merge patch', () => {
  it('null deletes a key', () => {
    expect(mergePatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
  });

  it('an unmentioned key is inherited', () => {
    expect(mergePatch({ a: 1, b: 2 }, { a: 9 })).toEqual({ a: 9, b: 2 });
  });

  it('an object recurses field by field', () => {
    expect(mergePatch({ a: { x: 1, y: 2 } }, { a: { y: 3 } })).toEqual({
      a: { x: 1, y: 3 },
    });
  });

  it('an array is replaced wholesale, not merged', () => {
    expect(mergePatch({ a: [1, 2, 3] }, { a: [9] })).toEqual({ a: [9] });
  });

  it('deleting an absent key is not an error', () => {
    expect(mergePatch({ a: 1 }, { b: null })).toEqual({ a: 1 });
  });
});

describe('the jurisdiction registry', () => {
  it('lists the base and every jurisdiction the data carries', () => {
    expect(JURISDICTION_IDS).toContain(BASE_JURISDICTION);
    expect(JURISDICTION_IDS).toContain(INLAND);
  });

  it('puts the base first, so the picker opens on it', () => {
    expect(JURISDICTION_IDS[0]).toBe(BASE_JURISDICTION);
  });

  it('rejects an id the data does not carry', () => {
    expect(isJurisdiction('xx/nowhere')).toBe(false);
  });
});

describe('resolved entries', () => {
  it('the base resolves to its own entries and nothing else', () => {
    const ids = resolveEntries(BASE_JURISDICTION).map((e) => e.id);
    const foreign = applicability.entries
      .filter((e) => e.jurisdiction !== BASE_JURISDICTION)
      .map((e) => e.id);
    for (const id of foreign) expect(ids).not.toContain(id);
  });

  it('inherits a base entry the delta does not mention', () => {
    expect(resolveEntries(INLAND).map((e) => e.id)).toContain('rule:23a_i');
  });

  it('drops a tombstoned entry (ADR 0018: Rule 28 is [Reserved])', () => {
    expect(resolveEntries(INLAND).map((e) => e.id)).not.toContain('rule:28');
    expect(resolveEntries(BASE_JURISDICTION).map((e) => e.id)).toContain(
      'rule:28',
    );
  });

  it('replaces rather than edits: 23(d)(i) out, Inland 23(d) in', () => {
    const ids = resolveEntries(INLAND).map((e) => e.id);
    expect(ids).not.toContain('rule:23d_i');
    expect(ids).toContain('rule:23d');
  });

  it('only tombstones entries that were inherited (ADR 0018 point 5)', () => {
    const base = new Set(
      applicability.entries
        .filter((e) => e.jurisdiction === BASE_JURISDICTION)
        .map((e) => e.id),
    );
    for (const s of entrySuppressionsFor(INLAND)) {
      expect(base.has(s.suppresses), `${s.suppresses} is not a base entry`).toBe(
        true,
      );
    }
  });

  it('every resolved entry is in force under the jurisdiction asked for', () => {
    for (const e of resolveEntries(INLAND)) {
      expect([INLAND, BASE_JURISDICTION]).toContain(e.jurisdiction);
    }
  });
});

describe('resolved skeleton', () => {
  it('inherits a path the delta does not mention', () => {
    expect(resolveSkeleton(INLAND)['25(a)']).toEqual(rules.paragraphs['25(a)']);
  });

  it('drops a path the source does not spell', () => {
    for (const s of pathSuppressionsFor(INLAND)) {
      expect(resolveSkeleton(INLAND)[s.path]).toBeUndefined();
      expect(resolveSkeleton(BASE_JURISDICTION)[s.path]).toBeDefined();
    }
  });

  it('carries an Inland-only path the base has no counterpart for', () => {
    expect(resolveSkeleton(INLAND)['24(j)']).toBeDefined();
    expect(resolveSkeleton(BASE_JURISDICTION)['24(j)']).toBeUndefined();
    expect(isJurisdictionOnly(INLAND, '24(j)')).toBe(true);
  });

  it('a restated path keeps the base figure it says nothing about', () => {
    // ADR 0020 point 2: 21(a) is restated with no `images`, and intl's row
    // carries mastheadarc.gif — the merge is field by field, not row for row.
    const delta = rules.deltas?.[INLAND]?.paragraphs['21(a)'];
    expect(delta).toBeDefined();
    expect(delta?.images).toBeUndefined();
    expect(resolveSkeleton(INLAND)['21(a)'].images).toEqual(
      rules.paragraphs['21(a)'].images,
    );
  });

  it('a restated path is stamped with its own jurisdiction', () => {
    expect(resolveSkeleton(INLAND)['21(a)'].jurisdiction).toBe(INLAND);
    expect(resolveSkeleton(BASE_JURISDICTION)['21(a)'].jurisdiction).toBe(
      BASE_JURISDICTION,
    );
  });

  it('states Rule 28 as a spelled path even though its entry is tombstoned', () => {
    // 33 CFR 83.28 is "[Reserved]" — spelled and voided, not absent, so the
    // Rules reference has a path to mark rather than a silent hole.
    expect(restatedPathsFor(INLAND)).toContain('28');
    expect(resolveSkeleton(INLAND)['28']).toBeDefined();
  });

  it('leaves the base skeleton untouched', () => {
    resolveSkeleton(INLAND);
    expect(resolveSkeleton(BASE_JURISDICTION)).toEqual(rules.paragraphs);
    expect(rules.paragraphs['23(d)(i)']).toBeDefined();
  });
});
