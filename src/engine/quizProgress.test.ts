import { describe, expect, it } from 'vitest';
import {
  exportProgress,
  mergeProgress,
  nextDrillSeed,
  parseProgress,
  questionFor,
  record,
  rulesInPool,
  rulesOfCite,
  weight,
} from './quizProgress';
import { deserialize, serialize } from '../state/urlState';

describe('quiz progress', () => {
  it('counts right and wrong per scenario', () => {
    let p = record({}, 'trawler', false);
    p = record(p, 'trawler', false);
    p = record(p, 'trawler', true);
    expect(p.trawler).toEqual({ right: 1, wrong: 2 });
  });

  it('weights a twice-missed scenario above an unseen one above a mastered one', () => {
    const p = { trawler: { right: 0, wrong: 2 }, sloop: { right: 8, wrong: 0 } };
    expect(weight(p, 'trawler')).toBeGreaterThan(weight(p, 'new'));
    expect(weight(p, 'new')).toBeGreaterThan(weight(p, 'sloop'));
    expect(weight(p, 'sloop')).toBeGreaterThan(0);
  });

  it('round-trips an export and drops malformed entries from an import', () => {
    const p = { a: { right: 1, wrong: 2 } };
    expect(parseProgress(JSON.parse(exportProgress(p)))).toEqual(p);
    expect(
      parseProgress({ entries: { ok: { right: 1, wrong: 0 }, bad: { right: -1, wrong: 'x' } } }),
    ).toEqual({ ok: { right: 1, wrong: 0 } });
    expect(parseProgress('nope')).toBeNull();
  });

  it('merging the same file twice does not double the counts', () => {
    const a = { x: { right: 1, wrong: 2 } };
    const once = mergeProgress({}, a);
    expect(mergeProgress(once, a)).toEqual(a);
  });

  it('a drill reaches a missed scenario sooner than the plain sequence does', () => {
    const missed = questionFor(1, false, 'intl').fixtureName;
    const progress = { [missed]: { right: 0, wrong: 6 } };
    let hitsDrill = 0;
    let hitsPlain = 0;
    for (let s = 1; s <= 40; s++) {
      const d = nextDrillSeed(s, false, 'intl', progress, '');
      if (questionFor(d, false, 'intl').fixtureName === missed) hitsDrill++;
      if (questionFor(s + 1, false, 'intl').fixtureName === missed) hitsPlain++;
    }
    expect(hitsDrill).toBeGreaterThan(hitsPlain);
  });

  it('a drill is a pure function of its inputs, so the seed in the URL is shareable', () => {
    const a = nextDrillSeed(5, false, 'intl', {}, '');
    expect(nextDrillSeed(5, false, 'intl', {}, '')).toBe(a);
    expect(questionFor(a, false, 'intl').cite).toBe(questionFor(a, false, 'intl').cite);
  });

  it('a per-rule drill only asks about that rule', () => {
    const rule = rulesInPool('intl')[0];
    expect(rule).toBeTruthy();
    const s = nextDrillSeed(1, false, 'intl', {}, rule);
    expect(rulesOfCite(questionFor(s, false, 'intl').cite)).toContain(rule);
  });
});

describe('parseProgress with a hostile key', () => {
  it('drops __proto__ instead of setting the prototype', () => {
    const json = JSON.parse(
      '{"entries":{"__proto__":{"right":1,"wrong":1},"ok":{"right":2,"wrong":0}}}',
    );
    const p = parseProgress(json)!;
    expect(Object.keys(p)).toEqual(['ok']);
    expect(Object.getPrototypeOf(p)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).right).toBeUndefined();
  });
});

describe('quiz state in the URL', () => {
  it('round-trips seed, direction, mode, index and rule', () => {
    const quiz = {
      seed: 4242,
      direction: 'reverse' as const,
      mode: 'exam' as const,
      n: 4,
      rule: '27',
    };
    const back = deserialize(serialize({ ...deserialize('#/quiz'), quiz }));
    expect(back.quiz).toEqual(quiz);
  });

  it('ignores junk in a hand-edited link', () => {
    const s = deserialize('#/quiz/-3/x?qm=cheat&qr=abc');
    expect(s.quiz).toMatchObject({ seed: 1, mode: 'practice', n: 1, rule: '' });
  });
});
