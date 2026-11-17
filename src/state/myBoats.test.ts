import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MY_BOATS_KEY,
  deleteBoat,
  parseBoats,
  resetMyBoatsForTest,
  saveBoat,
} from './myBoats';
import type { FactRecord } from '../engine/types';

const SLOOP: FactRecord = {
  'fact:propulsion': 'propulsion:sail',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 12,
};
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
const stored = () =>
  JSON.parse(window.localStorage.getItem(MY_BOATS_KEY) ?? 'null');

describe('saved boats', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: fakeStorage() });
    resetMyBoatsForTest();
  });

  it('keeps named fact records under one key, a name saved again replaced in place', () => {
    saveBoat('Aurora', SLOOP);
    saveBoat('Tender', {
      ...SLOOP,
      'fact:propulsion': 'propulsion:oars',
      'fact:length_m': 3,
    });
    saveBoat('Aurora', { ...SLOOP, 'fact:length_m': 11 });
    const boats = stored();
    expect(boats.map((b: { name: string }) => b.name)).toEqual([
      'Aurora',
      'Tender',
    ]);
    expect(boats[0].facts['fact:length_m']).toBe(11);
  });

  it('deletes by name', () => {
    saveBoat('Aurora', SLOOP);
    deleteBoat('Aurora');
    expect(stored()).toEqual([]);
  });

  it('ignores a blank name', () => {
    saveBoat('   ', SLOOP);
    expect(stored()).toBeNull();
  });

  it('reads back only what a link could carry', () => {
    const raw = JSON.stringify([
      {
        name: 'Aurora',
        facts: {
          ...SLOOP,
          'fact:propulsion': 'propulsion:warp',
          'fact:junk': 1,
        },
      },
      { name: 'Aurora', facts: SLOOP },
      { name: '', facts: SLOOP },
      { name: 'No facts' },
      'nonsense',
    ]);
    const boats = parseBoats(raw);
    expect(boats.map((b) => b.name)).toEqual(['Aurora']);
    const bag = boats[0].facts as Record<string, unknown>;
    expect(bag['fact:junk']).toBeUndefined();
    expect(bag['fact:propulsion']).toBe('propulsion:sail');
  });

  it('reads a stored name trimmed, so a fresh save of it replaces it', () => {
    window.localStorage.setItem(
      MY_BOATS_KEY,
      JSON.stringify([{ name: ' Aurora ', facts: SLOOP }]),
    );
    resetMyBoatsForTest();
    saveBoat('Aurora', { ...SLOOP, 'fact:length_m': 11 });
    expect(stored()).toHaveLength(1);
  });

  it('reads junk as no boats', () => {
    expect(parseBoats('{not json')).toEqual([]);
    expect(parseBoats('{"a":1}')).toEqual([]);
  });
});
