import { describe, expect, it } from 'vitest';
import { buildDeck, filterDeck, ruleOf } from './flashcards';
import {
  BOXES,
  INTERVAL_DAYS,
  dueQueue,
  grade,
  loadBoxes,
  saveBoxes,
} from '../state/leitner';

describe('flashcard deck', () => {
  const deck = buildDeck('intl');
  it('has two cards per scenario with unique stable ids and a cite', () => {
    expect(deck.length).toBeGreaterThan(20);
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
    expect(deck.every((c) => c.cite && c.display.lights.length > 0)).toBe(true);
    expect(buildDeck('intl').map((c) => c.id)).toEqual(deck.map((c) => c.id));
  });
  it('filters by rule and by vessel family', () => {
    const rule = deck[0].rule;
    expect(filterDeck(deck, { rule }).every((c) => c.rule === rule)).toBe(true);
    expect(filterDeck(deck, { family: 'sail' }).every((c) => c.family === 'sail')).toBe(true);
    expect(ruleOf('Rule 23(a)(i)')).toBe('23');
  });
});

describe('Leitner boxes', () => {
  it('promotes on right, drops to box 1 on wrong, spaces by box', () => {
    let b = grade({}, 'a', true, 100);
    expect(b.a).toEqual({ box: 2, due: 100 + INTERVAL_DAYS[1] });
    for (let i = 0; i < 9; i++) b = grade(b, 'a', true, 100);
    expect(b.a.box).toBe(BOXES);
    b = grade(b, 'a', false, 100);
    expect(b.a).toEqual({ box: 1, due: 101 });
  });
  it('queues unseen and due cards, lowest box first', () => {
    const boxes = { a: { box: 3, due: 100 }, b: { box: 2, due: 200 } };
    const q = dueQueue([{ id: 'a' }, { id: 'b' }, { id: 'c' }], boxes, 100);
    expect(q.map((c) => c.id)).toEqual(['c', 'a']);
  });
  it('round-trips through storage and survives storage that throws', () => {
    const mem = new Map<string, string>();
    const ok = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    saveBoxes({ a: { box: 4, due: 9 } }, ok);
    expect(loadBoxes(ok)).toEqual({ a: { box: 4, due: 9 } });
    const bad = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadBoxes(bad)).toEqual({});
    expect(() => saveBoxes({}, bad)).not.toThrow();
    mem.set('searoom.flashcards.v1', '{"a":{"box":99,"due":1},"b":"x"}');
    expect(loadBoxes(ok)).toEqual({});
  });
});
