// The signal table: one row per (rule paragraph, trigger), with the sounding
// pattern that paragraph prescribes.
//
// PROVISIONAL — this table is searoom's, not colregs'. colregs carries no
// Part D data at all: `rules.json`'s skeleton stops at Rule 31 and no corpus
// has Rules 32-37, because REQ-PART-3 requires the Q-1 ADR
// (mark-brannan/colregs#168) before any Part D data is written. Q-1 asks
// whether signals are applicability entries with an `event:` predicate
// namespace, or a table keyed by (paragraph, trigger) with a `sound:`
// vocabulary.
//
// So this file is shaped like the second candidate, deliberately: when the
// ADR lands and the data follows, either this file becomes a thin adapter
// over colregs' table, or `signalsFor()` is rewritten to read entries — and
// nothing above it changes. `text: null` everywhere is the honest part: the
// rule paragraphs are upstream's to publish, and the mode shows the Q-1
// signpost where the text will go rather than a local transcription.
//
// Situation wording is UI chrome in the message catalog, as every other
// label in the app is. No rule text is transcribed here.

import type { SignalPattern } from '../audio/signalPattern';

export type SignalCategory =
  | 'manoeuvre' // Rule 34, in sight of one another
  | 'restricted-visibility' // Rule 35
  | 'attention'; // Rule 36

export interface SoundSignal {
  /** `<paragraph>.<trigger>` — stable, and the i18n key stem */
  id: string;
  /** citation unit, as everywhere else in the app */
  paragraph: string;
  rule: string;
  jurisdiction: string;
  category: SignalCategory;
  /**
   * What makes her sound it. `event:` because that is the namespace Q-1's
   * first candidate would need; harmless if the answer is the second.
   */
  trigger: string;
  pattern: SignalPattern;
  /**
   * Hull length in metres the whistle band is chosen from when this signal
   * is sounded on its own — the paragraph's own vessel where it names one
   * (35(g)'s hundred metres), otherwise the mode's picker decides.
   */
  lengthM?: number;
  /**
   * The paragraph's text, when colregs carries it. Always null today; the
   * mode renders the Q-1 signpost in its place.
   */
  text: null;
}

const RAPID = 0.25;

/** Rule 34(d): five short and rapid blasts. */
const rapidShorts = (n: number): SignalPattern => ({
  elements: Array.from({ length: n }, () => ({
    sound: 'short' as const,
    gapAfterS: RAPID,
    durationS: 0.8,
  })),
});

const blasts = (
  sounds: ('short' | 'prolonged')[],
  repeatEveryS?: number,
  gapAfterS?: number,
): SignalPattern => ({
  elements: sounds.map((sound) => ({ sound, gapAfterS })),
  repeatEveryS,
});

export const signals: SoundSignal[] = [
  // Rule 34(a) — manoeuvring signals, in sight of one another
  {
    id: '34a.starboard',
    paragraph: '34(a)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:altering_course_starboard',
    pattern: blasts(['short']),
    text: null,
  },
  {
    id: '34a.port',
    paragraph: '34(a)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:altering_course_port',
    pattern: blasts(['short', 'short']),
    text: null,
  },
  {
    id: '34a.astern',
    paragraph: '34(a)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:operating_astern_propulsion',
    pattern: blasts(['short', 'short', 'short']),
    text: null,
  },
  // Rule 34(c) — overtaking in a narrow channel
  {
    id: '34c.overtake_starboard',
    paragraph: '34(c)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:intend_overtake_starboard',
    pattern: blasts(['prolonged', 'prolonged', 'short']),
    text: null,
  },
  {
    id: '34c.overtake_port',
    paragraph: '34(c)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:intend_overtake_port',
    pattern: blasts(['prolonged', 'prolonged', 'short', 'short']),
    text: null,
  },
  {
    id: '34c.agreement',
    paragraph: '34(c)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:agree_to_overtaking',
    pattern: blasts(['prolonged', 'short', 'prolonged', 'short']),
    text: null,
  },
  // Rule 34(d) — doubt
  {
    id: '34d.doubt',
    paragraph: '34(d)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:doubt',
    pattern: rapidShorts(5),
    text: null,
  },
  // Rule 34(e) — approaching an obstructed bend
  {
    id: '34e.bend',
    paragraph: '34(e)',
    rule: '34',
    jurisdiction: 'intl',
    category: 'manoeuvre',
    trigger: 'event:approaching_blind_bend',
    pattern: blasts(['prolonged']),
    text: null,
  },
  // Rule 35 — restricted visibility
  {
    id: '35a.making_way',
    paragraph: '35(a)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:power_driven_making_way',
    pattern: blasts(['prolonged'], 120),
    text: null,
  },
  {
    id: '35b.stopped',
    paragraph: '35(b)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:power_driven_underway_stopped',
    // the paragraph names the interval between the two: about two seconds
    pattern: blasts(['prolonged', 'prolonged'], 120, 2),
    text: null,
  },
  {
    id: '35c.hampered',
    paragraph: '35(c)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:hampered_or_sailing_or_fishing_or_towing',
    pattern: blasts(['prolonged', 'short', 'short'], 120),
    text: null,
  },
  {
    id: '35e.towed',
    paragraph: '35(e)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:manned_vessel_towed',
    pattern: blasts(['prolonged', 'short', 'short', 'short'], 120),
    text: null,
  },
  {
    id: '35g.anchored',
    paragraph: '35(g)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:at_anchor',
    pattern: { elements: [{ sound: 'bell_rapid' }], repeatEveryS: 60 },
    text: null,
  },
  {
    id: '35g.anchored_100m',
    paragraph: '35(g)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:at_anchor_100m_or_more',
    // bell forward, gong aft
    pattern: {
      elements: [{ sound: 'bell_rapid', gapAfterS: 0.5 }, { sound: 'gong_rapid' }],
      repeatEveryS: 60,
    },
    lengthM: 120,
    text: null,
  },
  {
    id: '35g.anchor_warning',
    paragraph: '35(g)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:at_anchor_warning_of_position',
    pattern: blasts(['short', 'prolonged', 'short']),
    text: null,
  },
  {
    id: '35h.aground',
    paragraph: '35(h)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:aground',
    pattern: {
      elements: [
        { sound: 'bell', gapAfterS: 0.6 },
        { sound: 'bell', gapAfterS: 0.6 },
        { sound: 'bell', gapAfterS: 0.9 },
        { sound: 'bell_rapid', gapAfterS: 0.9 },
        { sound: 'bell', gapAfterS: 0.6 },
        { sound: 'bell', gapAfterS: 0.6 },
        { sound: 'bell' },
      ],
      repeatEveryS: 60,
    },
    text: null,
  },
  {
    id: '35j.pilot',
    paragraph: '35(j)',
    rule: '35',
    jurisdiction: 'intl',
    category: 'restricted-visibility',
    trigger: 'event:pilot_vessel_on_duty',
    pattern: rapidShorts(4),
    text: null,
  },
];

/**
 * Rule 36 prescribes no pattern — any signal that cannot be mistaken for one
 * of these. It is a row in the mode with nothing to play, which is the
 * content, not a gap.
 */
export const attentionParagraph = {
  paragraph: '36',
  rule: '36',
  jurisdiction: 'intl',
  id: '36.attention',
};

/** Signals for a jurisdiction. Only `intl` is modelled; see the mode's note. */
export function signalsFor(jurisdiction: string): SoundSignal[] {
  return jurisdiction === 'intl' ? signals : [];
}

export function signalById(id: string): SoundSignal | undefined {
  return signals.find((s) => s.id === id);
}

/** Signals grouped by the rule they come from, in paragraph order. */
export function signalsByRule(
  jurisdiction: string,
): { rule: string; signals: SoundSignal[] }[] {
  const out: { rule: string; signals: SoundSignal[] }[] = [];
  for (const s of signalsFor(jurisdiction)) {
    const last = out[out.length - 1];
    if (last && last.rule === s.rule) last.signals.push(s);
    else out.push({ rule: s.rule, signals: [s] });
  }
  return out;
}

/**
 * The Rule 34 signal that accompanies a manoeuvre, by the action an
 * encounter recommends. The seam the Encounters milestone plugs into
 * (searoom #89 step 4): it takes an action identifier and gives back the
 * signal, so the encounter panel never has to know the table's shape.
 */
const ACTION_SIGNALS: Record<string, string> = {
  'action:alter_starboard': '34a.starboard',
  'action:alter_port': '34a.port',
  'action:astern_propulsion': '34a.astern',
  'action:doubt': '34d.doubt',
  'action:overtake_starboard': '34c.overtake_starboard',
  'action:overtake_port': '34c.overtake_port',
};

export function signalForAction(action: string): SoundSignal | undefined {
  const id = ACTION_SIGNALS[action];
  return id ? signalById(id) : undefined;
}
