// Annex I horizontal positioning, checked against the seats a mesh gives the
// lights. The Profile view draws a hull from its mesh unless the seats break
// a paragraph of Annex I 3(a) or 3(b) that the hand-drawn profile keeps; then
// the hand-drawn profile stands. A paragraph both break is no reason to drop
// the mesh: the fallback would draw the same fault.
//
// Why a check here rather than trusting the seats: nav-wright's anchorLights
// reads the mast band from the tallest structure, which on some meshes puts
// the forward masthead light abaft amidships (nav-wright#50). Until the seats
// come from Annex I geometry, the 2D view must not draw a wrong display.
//
// The figures are the International Annex I. They are written here rather
// than read from colregs' geometry.json because its AnxI.3(a) row carries
// smaller figures (a quarter length apart, a half length from the stem).
// The International figures are the stricter of the two sets, so a seat that
// passes here passes both.

import type { PlacedLight } from 'nav-wright';
import type { FactRecord } from 'colregs-engine';

/** Seat x is metres from amidships, bow positive (anchorLights' frame). */
type Seat = readonly [number, number, number];

/** One Annex I paragraph the seats break, with the cite. */
export interface SeatBreach {
  cite: 'AnxI.3(a)' | 'AnxI.3(b)';
  /** Which requirement of the paragraph: 3(a) carries two. */
  rule: 'stem' | 'separation' | 'sidelights';
  what: string;
}

/** Slack for mesh rounding, as a fraction of length. */
const EPS = 1e-3;

const isMasthead = (l: PlacedLight) => l.lightId === 'light:masthead';
const isSidelight = (l: PlacedLight) => l.lightId.startsWith('light:sidelight');

/**
 * Where the seats break Annex I 3(a) (two masthead lights: forward one within
 * a quarter length of the stem, the two at least half the length apart, which
 * need not exceed 100 m) or 3(b) (power-driven, 20 m or more: sidelights not
 * forward of the forward masthead light). Empty when the seats are lawful.
 * `seats[i]` belongs to `placed[i]`.
 */
export function annexISeatBreaches(
  placed: readonly PlacedLight[],
  seats: readonly Seat[],
  lengthM: number,
  facts: FactRecord,
): SeatBreach[] {
  const mast = placed.flatMap((l, i) =>
    isMasthead(l) && seats[i] ? [{ fx: l.fx, x: seats[i][0] }] : [],
  );
  if (mast.length === 0) return [];
  const out: SeatBreach[] = [];
  const eps = EPS * lengthM;
  const fmt = (m: number) => `${(m / lengthM).toFixed(2)} L`;

  // Forward and after masthead lights are told apart by the station the
  // hull's placement gave them, not by the seat: the seat is what is checked.
  const fwdFx = Math.max(...mast.map((m) => m.fx));
  const aftFx = Math.min(...mast.map((m) => m.fx));
  const fwdX = Math.max(...mast.filter((m) => m.fx === fwdFx).map((m) => m.x));

  if (fwdFx !== aftFx) {
    const aftX = Math.min(
      ...mast.filter((m) => m.fx === aftFx).map((m) => m.x),
    );
    const fromStem = lengthM / 2 - fwdX;
    if (fromStem > lengthM / 4 + eps)
      out.push({
        cite: 'AnxI.3(a)',
        rule: 'stem',
        what: `forward masthead light ${fmt(fromStem)} from the stem; at most 0.25 L`,
      });
    const need = Math.min(lengthM / 2, 100);
    if (fwdX - aftX < need - eps)
      out.push({
        cite: 'AnxI.3(a)',
        rule: 'separation',
        what: `masthead lights ${fmt(fwdX - aftX)} apart; at least ${fmt(need)}`,
      });
  }

  const power = facts['fact:propulsion'] === 'propulsion:power';
  if (power && lengthM >= 20) {
    const ahead = placed.some(
      (l, i) => isSidelight(l) && seats[i] && seats[i][0] > fwdX + eps,
    );
    if (ahead)
      out.push({
        cite: 'AnxI.3(b)',
        rule: 'sidelights',
        what: 'sidelights forward of the forward masthead light',
      });
  }
  return out;
}

/** The seats the hand-drawn profile gives the same lights: each light's
 * station along the hull (fx, in half-lengths) in metres. Only x is read. */
export function handDrawnSeats(
  placed: readonly PlacedLight[],
  lengthM: number,
): Seat[] {
  return placed.map((l) => [(l.fx * lengthM) / 2, 0, 0] as const);
}

/**
 * The breaches the mesh seats add over the hand-drawn profile: what falling
 * back would fix. Empty means the mesh profile may be drawn.
 */
export function meshOnlyBreaches(
  placed: readonly PlacedLight[],
  seats: readonly Seat[],
  lengthM: number,
  facts: FactRecord,
): SeatBreach[] {
  const drawn = new Set(
    annexISeatBreaches(placed, handDrawnSeats(placed, lengthM), lengthM, facts)
      .map((b) => b.rule),
  );
  return annexISeatBreaches(placed, seats, lengthM, facts).filter(
    (b) => !drawn.has(b.rule),
  );
}
