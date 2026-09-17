import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { patternSignature } from '../audio/signalPattern';
import {
  signalForAction,
  signalById,
  signals,
  signalsByRule,
  signalsFor,
} from './soundSignals';

const catalog = en as Record<string, string>;

describe('the signal table', () => {
  it('gives every signal a unique id', () => {
    expect(new Set(signals.map((s) => s.id)).size).toBe(signals.length);
  });

  it('names a situation in the catalog for every signal', () => {
    for (const s of signals) {
      expect(catalog[`signal.${s.id}.situation`]).toBeTruthy();
    }
  });

  it('carries the paragraph its id claims', () => {
    for (const s of signals) {
      expect(s.id.startsWith(s.paragraph.replace(/[()]/g, ''))).toBe(true);
      expect(s.paragraph.startsWith(s.rule)).toBe(true);
    }
  });

  it('gives every signal something to sound', () => {
    for (const s of signals) expect(s.pattern.elements.length).toBeGreaterThan(0);
  });

  it('transcribes no rule text — that is upstream\'s, pending Q-1', () => {
    for (const s of signals) expect(s.text).toBeNull();
  });

  it('keeps the Rule 34 manoeuvring signals distinguishable by ear', () => {
    const r34 = signals.filter((s) => s.rule === '34');
    const sigs = r34.map((s) => patternSignature(s.pattern));
    expect(new Set(sigs).size).toBe(r34.length);
  });

  // A fog signal sounds on an interval; the two one-off signals in Rule 35 —
  // the anchor warning and the pilot's identity signal — are sounded when the
  // moment calls for one, and carry no interval on purpose.
  it.each([
    '35a.making_way',
    '35b.stopped',
    '35c.hampered',
    '35e.towed',
    '35g.anchored',
    '35g.anchored_100m',
    '35h.aground',
  ])('repeats %s at a stated interval', (id) => {
    expect(signalById(id)!.pattern.repeatEveryS).toBeGreaterThan(0);
  });

  it.each(['35g.anchor_warning', '35j.pilot'])(
    'sounds %s once, on the occasion, with no interval',
    (id) => {
      expect(signalById(id)!.pattern.repeatEveryS).toBeUndefined();
    },
  );

  it('has only intl modelled, and says so for other jurisdictions', () => {
    expect(signalsFor('intl').length).toBe(signals.length);
    expect(signalsFor('us/inland')).toEqual([]);
  });

  it('groups by rule without splitting a rule in two', () => {
    const rules = signalsByRule('intl').map((g) => g.rule);
    expect(new Set(rules).size).toBe(rules.length);
  });
});

describe('the encounter seam', () => {
  it.each([
    ['action:alter_starboard', '34(a)'],
    ['action:alter_port', '34(a)'],
    ['action:astern_propulsion', '34(a)'],
    ['action:doubt', '34(d)'],
  ])('gives %s the signal at Rule %s', (action, paragraph) => {
    expect(signalForAction(action)?.paragraph).toBe(paragraph);
  });

  it('gives back nothing for an action with no signal', () => {
    expect(signalForAction('action:hold_course')).toBeUndefined();
  });

  it('points only at signals that exist', () => {
    for (const action of [
      'action:alter_starboard',
      'action:alter_port',
      'action:astern_propulsion',
      'action:doubt',
      'action:overtake_starboard',
      'action:overtake_port',
    ]) {
      expect(signalById(signalForAction(action)!.id)).toBeDefined();
    }
  });
});
