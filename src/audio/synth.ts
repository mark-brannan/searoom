// Browser-synthesised sound signals: no audio assets, nothing to licence,
// and the whistle's pitch follows Annex III's length band rather than a
// recording of one particular ship.
//
// Whistle: a fundamental plus a handful of harmonics through a lowpass, with
// the slow attack and slight pitch droop a real air horn has. Bell and gong:
// struck inharmonic partials with exponential decay, the gong lower and
// longer. All of it is scheduled ahead of time off one AudioContext clock,
// so a five-element pattern keeps rule-accurate timing.

import {
  DURATION_S,
  RAPID_GAP_S,
  timeline,
  whistleHz,
  type SignalPattern,
  type Sound,
} from './signalPattern';

let ctx: AudioContext | null = null;

/** Lazily created on first play — browsers require a user gesture. */
export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function audioAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.AudioContext ??
      (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext,
  );
}

/** Relative amplitudes of the whistle's harmonics — 1f, 2f, 3f, 4f. */
const WHISTLE_HARMONICS = [1, 0.5, 0.28, 0.14];

function scheduleWhistle(
  ac: AudioContext,
  out: GainNode,
  at: number,
  durationS: number,
  hz: number,
) {
  const attack = 0.06;
  const release = 0.12;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, at);
  bus.gain.exponentialRampToValueAtTime(0.9, at + attack);
  bus.gain.setValueAtTime(0.9, at + Math.max(attack, durationS - release));
  bus.gain.exponentialRampToValueAtTime(0.0001, at + durationS);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.max(900, hz * 6);
  lp.Q.value = 0.7;
  bus.connect(lp).connect(out);

  WHISTLE_HARMONICS.forEach((amp, i) => {
    const osc = ac.createOscillator();
    osc.type = i === 0 ? 'sawtooth' : 'sine';
    const f = hz * (i + 1);
    osc.frequency.setValueAtTime(f * 0.985, at);
    // the pitch settles as the air pressure comes up, then droops a little
    osc.frequency.linearRampToValueAtTime(f, at + 0.18);
    osc.frequency.linearRampToValueAtTime(f * 0.995, at + durationS);
    const g = ac.createGain();
    g.gain.value = amp * 0.16;
    osc.connect(g).connect(bus);
    osc.start(at);
    osc.stop(at + durationS + 0.05);
  });
}

/** Struck metal: inharmonic partials, each decaying at its own rate. */
function scheduleStrike(
  ac: AudioContext,
  out: GainNode,
  at: number,
  f0: number,
  decayS: number,
  partials: number[],
) {
  partials.forEach((ratio, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f0 * ratio;
    const g = ac.createGain();
    const amp = 0.3 / (i + 1.4);
    const decay = decayS * (1 - i * 0.12);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(amp, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.08, decay));
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + decayS + 0.05);
  });
}

const BELL_PARTIALS = [1, 2.02, 2.41, 3.02, 4.16, 5.43];
const GONG_PARTIALS = [1, 1.52, 2.13, 2.71, 3.47, 4.83, 6.11];

function scheduleBell(ac: AudioContext, out: GainNode, at: number) {
  scheduleStrike(ac, out, at, 760, DURATION_S.bell, BELL_PARTIALS);
}

function scheduleGong(ac: AudioContext, out: GainNode, at: number) {
  scheduleStrike(ac, out, at, 190, DURATION_S.gong, GONG_PARTIALS);
}

/** Rule 35(g): rapid ringing for about five seconds. */
function scheduleRapid(
  at: number,
  durationS: number,
  strike: (t: number) => void,
) {
  const step = 0.22 + RAPID_GAP_S * 0.2;
  for (let t = 0; t < durationS; t += step) strike(at + t);
}

export interface PlayOptions {
  /** hull length, metres — sets the whistle band (Annex III §1(a)) */
  lengthM?: number;
  /** master gain, 0–1 */
  volume?: number;
}

export interface Playing {
  /** seconds the scheduled cycle runs for */
  durationS: number;
  stop(): void;
}

/**
 * Sound one cycle of `pattern`. Returns a handle whose `stop()` silences it
 * immediately — the caller owns the "playing" state, this owns the noise.
 */
export function playPattern(
  pattern: SignalPattern,
  opts: PlayOptions = {},
): Playing | null {
  const ac = audioContext();
  if (!ac) return null;
  if (ac.state === 'suspended') void ac.resume();

  const master = ac.createGain();
  master.gain.value = opts.volume ?? 0.6;
  master.connect(ac.destination);

  const hz = whistleHz(opts.lengthM ?? 30);
  const t0 = ac.currentTime + 0.05;
  const events = timeline(pattern);
  for (const ev of events) {
    const at = t0 + ev.atS;
    switch (ev.sound) {
      case 'short':
      case 'prolonged':
        scheduleWhistle(ac, master, at, ev.durationS, hz);
        break;
      case 'bell':
        scheduleBell(ac, master, at);
        break;
      case 'gong':
        scheduleGong(ac, master, at);
        break;
      case 'bell_rapid':
        scheduleRapid(at, ev.durationS, (t) => scheduleBell(ac, master, t));
        break;
      case 'gong_rapid':
        scheduleRapid(at, ev.durationS, (t) => scheduleGong(ac, master, t));
        break;
    }
  }
  const last = events[events.length - 1];
  const durationS = last ? last.atS + last.durationS : 0;

  return {
    durationS,
    stop() {
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      setTimeout(() => master.disconnect(), 120);
    },
  };
}

/** One sounding on its own — the vocabulary key in the mode's legend. */
export function playSound(sound: Sound, opts: PlayOptions = {}): Playing | null {
  return playPattern({ elements: [{ sound }] }, opts);
}
