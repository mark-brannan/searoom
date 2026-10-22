import { describe, expect, it } from 'vitest';
import { previewSlug, selectPreviews } from './preview-sites.mjs';

describe('previewSlug', () => {
  it.each([
    ['hold/night-mode', 'night-mode'],
    ['hold/Night_Mode', 'night-mode'],
    ['hold/fi/glossary', 'fi-glossary'],
    ['hold/--x--', 'x'],
    ['hold/', ''],
  ])('%s → %s', (branch, slug) => {
    expect(previewSlug(branch)).toBe(slug);
  });
});

describe('selectPreviews', () => {
  const b = (name, sha) => ({ name, sha });

  it('keeps only holding branches, sorted', () => {
    const { previews } = selectPreviews(
      [
        b('main', 'm'),
        b('hold/zulu', 'z'),
        b('claude/x', 'c'),
        b('hold/alpha', 'a'),
      ],
      new Set(),
    );
    expect(previews).toEqual([
      { branch: 'hold/alpha', slug: 'alpha', sha: 'a' },
      { branch: 'hold/zulu', slug: 'zulu', sha: 'z' },
    ]);
  });

  it('drops a branch whose tip is a merged PR head, and keeps it once it moves on', () => {
    const merged = new Set(['old']);
    expect(selectPreviews([b('hold/x', 'old')], merged).previews).toEqual([]);
    expect(selectPreviews([b('hold/x', 'new')], merged).previews).toEqual([
      { branch: 'hold/x', slug: 'x', sha: 'new' },
    ]);
  });

  it('gives a shared slug to the first branch only', () => {
    const { previews, skipped } = selectPreviews(
      [b('hold/a/b', '2'), b('hold/a-b', '1')],
      new Set(),
    );
    expect(previews.map((p) => p.branch)).toEqual(['hold/a-b']);
    expect(skipped).toEqual([
      { branch: 'hold/a/b', reason: 'slug a-b taken by hold/a-b' },
    ]);
  });

  it('skips a bare prefix', () => {
    expect(selectPreviews([b('hold/', 's')], new Set()).skipped).toEqual([
      { branch: 'hold/', reason: 'empty slug' },
    ]);
  });
});
