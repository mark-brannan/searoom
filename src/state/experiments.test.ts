import { afterEach, describe, expect, it, vi } from 'vitest';
import { variantOf } from './experiments';

function withStorage(stored: Record<string, string>) {
  vi.stubGlobal('window', {
    location: { search: '' },
    localStorage: { getItem: (k: string) => stored[k] ?? null },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('variantOf', () => {
  it('falls back to the control with no query and no storage', () => {
    expect(variantOf('layout', '')).toBe('a');
  });

  it('takes the stored pick over the control', () => {
    withStorage({ 'searoom.x.layout': 'c' });
    expect(variantOf('layout', '')).toBe('c');
  });

  it('takes the query string over the stored pick', () => {
    withStorage({ 'searoom.x.layout': 'c' });
    expect(variantOf('layout', '?layout=a')).toBe('a');
  });

  it('ignores a garbage query and a garbage stored value', () => {
    withStorage({ 'searoom.x.layout': 'zz' });
    expect(variantOf('layout', '?layout=b')).toBe('a');
  });

  it('falls through a garbage query to the stored pick', () => {
    withStorage({ 'searoom.x.layout': 'c' });
    expect(variantOf('layout', '?layout=')).toBe('c');
  });

  it('survives storage that throws', () => {
    vi.stubGlobal('window', {
      location: { search: '' },
      get localStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(variantOf('layout', '')).toBe('a');
  });
});
