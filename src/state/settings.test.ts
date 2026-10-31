import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JURISDICTION_IDS } from '../data/jurisdictions';
import {
  SETTINGS_KEY,
  loadSettings,
  reducesMotion,
  saveSettings,
  stateFromHash,
} from './settings';
import { corporaFor } from '../data/corpusText';
import { defaultCorpusFor } from './urlState';

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

  it('round-trips all six and merges partial saves', () => {
    const corpus = corporaFor(other)[0].id;
    saveSettings({
      locale: 'fi',
      corpus,
      jurisdiction: other,
      dayNight: 'day',
      presentation: 'lights',
      motion: 'reduce',
    });
    // the store saves only locale and jurisdiction; the rest must survive it
    saveSettings({ locale: 'en', jurisdiction: other });
    expect(loadSettings()).toEqual({
      locale: 'en',
      corpus,
      jurisdiction: other,
      dayNight: 'day',
      presentation: 'lights',
      motion: 'reduce',
    });
  });

  it('restores a stored corpus with its jurisdiction on a bare visit', () => {
    const list = corporaFor(other);
    const corpus = list[list.length - 1].id;
    saveSettings({ jurisdiction: other, corpus });
    expect(stateFromHash('').corpus).toBe(corpus);
  });

  it('drops a stored corpus of another jurisdiction', () => {
    const intlCorpus = corporaFor('intl')[0].id;
    saveSettings({ jurisdiction: other, corpus: intlCorpus });
    const s = stateFromHash('');
    expect(s.jurisdiction).toBe(other);
    expect(s.corpus).not.toBe(intlCorpus);
  });

  it('lets a link without cp mean the reference corpus, not the stored one', () => {
    const ref = defaultCorpusFor('intl');
    const alt = corporaFor('intl').find((c) => c.id !== ref);
    expect(alt).toBeDefined();
    saveSettings({ jurisdiction: 'intl', corpus: alt!.id });
    expect(stateFromHash('').corpus).toBe(alt!.id);
    expect(stateFromHash('#/sandbox?j=intl').corpus).toBe(ref);
  });

  it('resolves the motion override against the OS', () => {
    expect(reducesMotion(undefined, true)).toBe(true);
    expect(reducesMotion('system', false)).toBe(false);
    expect(reducesMotion('reduce', false)).toBe(true);
    expect(reducesMotion('full', true)).toBe(false);
  });

  it('ignores junk and unknown values', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      '{"locale":"xx","jurisdiction":"nowhere","corpus":"no.such","dayNight":"dusk","presentation":3,"motion":"fast"}',
    );
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
    expect(() =>
      saveSettings({ locale: 'fi', jurisdiction: 'intl' }),
    ).not.toThrow();
  });

  it('keeps every preference for the visit when storage throws', async () => {
    vi.resetModules();
    const fresh = await import('./settings');
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    fresh.saveSettings({ motion: 'reduce' });
    fresh.saveSettings({ dayNight: 'day' });
    // storage comes back: the next save writes what the visit held, not just itself
    vi.stubGlobal('window', { localStorage: fakeStorage() });
    fresh.saveSettings({ presentation: 'lights' });
    expect(fresh.loadSettings()).toEqual({
      motion: 'reduce',
      dayNight: 'day',
      presentation: 'lights',
    });
  });
});

describe('opening mesh (searoom#174)', async () => {
  const { modelVariants } = await import('../render/hullModels');
  const { serialize, deserialize } = await import('./urlState');
  const hash = '#/sandbox?p=power&a=none&pos=underway&len=30';
  const variants = modelVariants(deserialize(hash).facts).filter(
    (v) => v.inClass,
  );

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
