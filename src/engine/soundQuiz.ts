// Sound-signal quiz, both directions, generated from the signal table the
// mode renders — never hand-written, as the light quiz is generated from
// fixture fact records.
//
// Forward: "you are altering course to starboard in sight of another vessel
// — what do you sound?", options are patterns.
// Reverse: a pattern is played, options are situations.
//
// Distractors are drawn from the same rule first, then the same category,
// then anywhere: a near-miss in this data is a neighbouring paragraph, the
// way a near-miss in the lights data is a threshold crossed.

import { patternSignature } from '../audio/signalPattern';
import { signalsFor, type SoundSignal } from '../data/soundSignals';
import { mulberry32 } from './quiz';

export interface SoundQuestion {
  kind: 'sound-forward' | 'sound-reverse';
  /** the signal being asked about */
  signal: SoundSignal;
  options: SoundSignal[];
  answerIndex: number;
  cite: string;
}

const OPTIONS = 4;

/** Candidates for a distractor, nearest neighbours first. */
export function distractorPool(
  signal: SoundSignal,
  pool: SoundSignal[],
): SoundSignal[] {
  const rank = (s: SoundSignal) =>
    s.rule === signal.rule ? 0 : s.category === signal.category ? 1 : 2;
  return pool
    .filter((s) => s.id !== signal.id)
    .filter((s) => patternSignature(s.pattern) !== patternSignature(signal.pattern))
    .sort((a, b) => rank(a) - rank(b));
}

function build(
  kind: SoundQuestion['kind'],
  seed: number,
  jurisdiction: string,
): SoundQuestion {
  const pool = signalsFor(jurisdiction);
  if (pool.length < 2) {
    throw new Error(`no sound signals for jurisdiction ${jurisdiction}`);
  }
  const rng = mulberry32(seed ^ (kind === 'sound-reverse' ? 0x50ed : 0));
  const signal = pool[Math.floor(rng() * pool.length)];

  const candidates = distractorPool(signal, pool);
  // take the near neighbours, but shuffle within the tier so a run of
  // questions on the same paragraph does not always offer the same three
  const near = candidates.slice(0, Math.max(OPTIONS - 1, 6));
  for (let i = near.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [near[i], near[j]] = [near[j], near[i]];
  }
  const options = [signal, ...near.slice(0, OPTIONS - 1)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    kind,
    signal,
    options,
    answerIndex: options.findIndex((o) => o.id === signal.id),
    cite: `Rule ${signal.paragraph}`,
  };
}

export function makeSoundForward(
  seed: number,
  jurisdiction = 'intl',
): SoundQuestion {
  return build('sound-forward', seed, jurisdiction);
}

export function makeSoundReverse(
  seed: number,
  jurisdiction = 'intl',
): SoundQuestion {
  return build('sound-reverse', seed, jurisdiction);
}
