import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JURISDICTION_IDS } from '../data/jurisdictions';
import { SETTINGS_KEY, loadSettings, saveSettings, stateFromHash } from './settings';

const other = JURISDICTION_IDS.find((j) => j !== 'intl') ?? 'intl';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  };
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: fakeStorage() });
});

describe('settings persistence', () => {
  it('round-trips locale and jurisdiction', () => {
    saveSettings({ locale: 'fi', jurisdiction: other });
    expect(loadSettings()).toEqual({ locale: 'fi', jurisdiction: other });
  });

  it('fills what the URL leaves out', () => {
    saveSettings({ locale: 'fi', jurisdiction: other });
    const s = stateFromHash('');
    expect(s.locale).toBe('fi');
    expect(s.jurisdiction).toBe(other);
  });

  it('does not overlay stored settings on a query-less path link', () => {
    saveSettings({ locale: 'fi', jurisdiction: other });
    const s = stateFromHash('#/rules');
    expect(s.locale).toBe('en');
    expect(s.jurisdiction).not.toBe(other);
  });

  it('does not overlay stored settings on a link that has a query', () => {
    saveSettings({ locale: 'fi', jurisdiction: other });
    const s = stateFromHash('#/sandbox?x=1');
    expect(s.locale).toBe('en');
    expect(s.jurisdiction).not.toBe(other);
  });

  it('lets the URL win', () => {
    saveSettings({ locale: 'fi', jurisdiction: other });
    const s = stateFromHash('#/sandbox?loc=en&j=intl');
    expect(s.locale).toBe('en');
    expect(s.jurisdiction).toBe('intl');
  });

  it('ignores junk and unknown values', () => {
    window.localStorage.setItem(SETTINGS_KEY, '{"locale":"xx","jurisdiction":"nowhere"}');
    expect(loadSettings()).toEqual({});
    window.localStorage.setItem(SETTINGS_KEY, 'not json');
    expect(loadSettings()).toEqual({});
  });

  it('survives storage that throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(loadSettings()).toEqual({});
    expect(() => saveSettings({ locale: 'fi', jurisdiction: 'intl' })).not.toThrow();
  });
});

describe('opening mesh (searoom#174)', async () => {
  const { selectHull } = await import('nav-wright');
  const { modelVariantsForHull } = await import('../render/hullModels');
  const { serialize, deserialize } = await import('./urlState');
  const hash = '#/sandbox?p=power&a=none&pos=underway&len=30';
  const variants = modelVariantsForHull(selectHull(deserialize(hash).facts));

  it('draws from the class: first and last index, by name', () => {
    expect(variants.length).toBeGreaterThan(1);
    expect(stateFromHash(hash, {}, () => 0).mesh).toBe(variants[0].name);
    expect(stateFromHash(hash, {}, () => 0.999).mesh).toBe(
      variants[variants.length - 1].name,
    );
  });

  it('lets an explicit ms win', () => {
    const last = variants[variants.length - 1].name;
    expect(stateFromHash(`${hash}&ms=${last}`, {}, () => 0).mesh).toBe(last);
  });

  it('carries the pick in the URL so a reload keeps it', () => {
    const picked = stateFromHash(hash, {}, () => 0.999);
    const reloaded = stateFromHash(serialize(picked), {}, () => 0);
    expect(reloaded.mesh).toBe(picked.mesh);
  });
});
