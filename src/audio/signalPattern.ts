// The sound vocabulary and its timing: Rule 32's durations, Annex III's
// whistle bands, and the scheduling arithmetic that turns a pattern into a
// timeline. Pure — no Web Audio here, so it is testable in node and the
// synthesiser below it has nothing to decide.
//
// PROVISIONAL, pending colregs Q-1 (mark-brannan/colregs#168): whether Part D
// is an entry model or a signal table is upstream's call, and until it lands
// this vocabulary lives here. It is deliberately shaped like the ADR's
// candidate (b) — a signal table keyed by (paragraph, trigger) with a `sound:`
// vocabulary — so adopting the upstream data is a swap of `src/data/
// soundSignals.ts`, not a rewrite of the mode.

/** One sounding. `bell`/`gong` are strokes; `bell_rapid` is Rule 35(g)'s ringing. */
export type Sound =
  | 'short'
  | 'prolonged'
  | 'bell'
  | 'gong'
  | 'bell_rapid'
  | 'gong_rapid';

/** Rule 32: a short blast is about one second, a prolonged one four to six. */
export const DURATION_S: Record<Sound, number> = {
  short: 1,
  prolonged: 5,
  bell: 0.9,
  gong: 1.4,
  // Rule 35(g): rapid ringing of the bell for about five seconds
  bell_rapid: 5,
  gong_rapid: 5,
};

/** Silence between soundings where the rule does not name one. */
export const DEFAULT_GAP_S = 1;

/** "Rapid" — Rule 34(d)'s five short blasts, and 35(g)'s ringing. */
export const RAPID_GAP_S = 0.25;

export interface SignalElement {
  sound: Sound;
  /** silence after this element, seconds; DEFAULT_GAP_S when unset */
  gapAfterS?: number;
  /** override the Rule 32 duration where a rule names a different one */
  durationS?: number;
}

export interface SignalPattern {
  elements: SignalElement[];
  /**
   * The rule's repetition interval in seconds — Rule 35's "at intervals of
   * not more than two minutes", 35(g)'s one minute. Display only; the player
   * sounds one cycle.
   */
  repeatEveryS?: number;
}

export interface ScheduledSound {
  sound: Sound;
  /** seconds from the start of the pattern */
  atS: number;
  durationS: number;
}

/** A pattern flattened to absolute times. One cycle, starting at zero. */
export function timeline(pattern: SignalPattern): ScheduledSound[] {
  const out: ScheduledSound[] = [];
  let t = 0;
  pattern.elements.forEach((el, i) => {
    const durationS = el.durationS ?? DURATION_S[el.sound];
    out.push({ sound: el.sound, atS: t, durationS });
    t += durationS;
    if (i < pattern.elements.length - 1) t += el.gapAfterS ?? DEFAULT_GAP_S;
  });
  return out;
}

/** Total length of one cycle, seconds. */
export function patternDurationS(pattern: SignalPattern): number {
  const t = timeline(pattern);
  if (t.length === 0) return 0;
  const last = t[t.length - 1];
  return last.atS + last.durationS;
}

const GLYPH: Record<Sound, string> = {
  short: '▪',
  prolonged: '▬',
  bell: '🔔',
  gong: '◉',
  bell_rapid: '🔔🔔🔔',
  gong_rapid: '◉◉◉',
};

/** A pattern as glyphs — "▬ ▪ ▪" — for the signal list and the quiz options. */
export function patternGlyphs(pattern: SignalPattern): string {
  return pattern.elements.map((e) => GLYPH[e.sound]).join(' ');
}

/**
 * A pattern's identity for quiz answering: two signals that sound the same
 * are the same answer however they are written.
 */
export function patternSignature(pattern: SignalPattern): string {
  return timeline(pattern)
    .map((s) => `${s.sound}@${s.durationS}`)
    .join('+');
}

/**
 * Annex III §1(a): whistle fundamental frequency by vessel length. The band
 * a hull's whistle sits in is what makes a big ship sound big; the mode
 * plays the middle of the band.
 */
export interface WhistleBand {
  /** inclusive lower bound of the length band, metres */
  minLengthM: number;
  /** Hz */
  lowHz: number;
  highHz: number;
}

export const WHISTLE_BANDS: WhistleBand[] = [
  { minLengthM: 200, lowHz: 70, highHz: 200 },
  { minLengthM: 75, lowHz: 130, highHz: 350 },
  { minLengthM: 20, lowHz: 250, highHz: 525 },
  { minLengthM: 0, lowHz: 250, highHz: 700 },
];

export function whistleBandFor(lengthM: number): WhistleBand {
  return (
    WHISTLE_BANDS.find((b) => lengthM >= b.minLengthM) ??
    WHISTLE_BANDS[WHISTLE_BANDS.length - 1]
  );
}

/** The pitch the synthesiser sounds for a hull of this length. */
export function whistleHz(lengthM: number): number {
  const band = whistleBandFor(lengthM);
  return Math.round(Math.sqrt(band.lowHz * band.highHz));
}

/**
 * A pattern as runs of the same sounding — "one prolonged, two short" — so
 * the UI can spell out what the glyphs mean for a reader who cannot hear it.
 */
export function patternRuns(pattern: SignalPattern): { sound: Sound; count: number }[] {
  const out: { sound: Sound; count: number }[] = [];
  for (const el of pattern.elements) {
    const last = out[out.length - 1];
    if (last && last.sound === el.sound) last.count += 1;
    else out.push({ sound: el.sound, count: 1 });
  }
  return out;
}
