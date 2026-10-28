// Leitner boxes. Five boxes; a right answer promotes a card and pushes its
// next review out, a wrong one drops it to box 1. Kept in localStorage, and
// every access is guarded: with storage blocked the boxes live for the
// session and the mode still works.

export const BOXES = 5;
/** days until a card in box n (index n-1) is due again after a right answer */
export const INTERVAL_DAYS = [1, 2, 4, 8, 16];

export interface CardRecord {
  box: number;
  /** day number (days since epoch) the card is next due */
  due: number;
}
export type Boxes = Record<string, CardRecord>;

const KEY = 'searoom.flashcards.v1';

export function today(now: number = Date.now()): number {
  const d = new Date(now);
  // local calendar day, so "daily" matches the learner's day
  return Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000,
  );
}

export function loadBoxes(storage?: Pick<Storage, 'getItem'>): Boxes {
  try {
    const s = storage ?? window.localStorage;
    const raw = s.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Boxes = {};
    for (const [id, v] of Object.entries(parsed)) {
      const r = v as Partial<CardRecord>;
      if (
        Number.isInteger(r?.box) &&
        r.box! >= 1 &&
        r.box! <= BOXES &&
        Number.isFinite(r.due)
      )
        out[id] = { box: r.box!, due: r.due! };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveBoxes(boxes: Boxes, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? window.localStorage).setItem(KEY, JSON.stringify(boxes));
  } catch {
    // storage blocked or full: keep going in memory
  }
}

/** A card never seen sits in box 1 and is due now. */
export function recordFor(boxes: Boxes, id: string, day: number): CardRecord {
  return boxes[id] ?? { box: 1, due: day };
}

export function isDue(boxes: Boxes, id: string, day: number): boolean {
  return recordFor(boxes, id, day).due <= day;
}

export function grade(
  boxes: Boxes,
  id: string,
  right: boolean,
  day: number,
): Boxes {
  const cur = recordFor(boxes, id, day);
  const box = right ? Math.min(BOXES, cur.box + 1) : 1;
  // a card that lands in box n waits INTERVAL_DAYS[n-1]; a miss comes back tomorrow
  return { ...boxes, [id]: { box, due: day + INTERVAL_DAYS[box - 1] } };
}

/** Due cards, lowest box first, then by id so the order is stable. */
export function dueQueue<T extends { id: string }>(
  cards: T[],
  boxes: Boxes,
  day: number,
): T[] {
  return cards
    .filter((c) => isDue(boxes, c.id, day))
    .sort(
      (a, b) =>
        recordFor(boxes, a.id, day).box - recordFor(boxes, b.id, day).box ||
        a.id.localeCompare(b.id),
    );
}

export function boxCounts(cards: { id: string }[], boxes: Boxes): number[] {
  const counts = new Array<number>(BOXES).fill(0);
  for (const c of cards) counts[(boxes[c.id]?.box ?? 1) - 1]++;
  return counts;
}
