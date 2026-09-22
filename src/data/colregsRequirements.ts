// Mechanical index of colregs' own open-questions log and requirement
// registry, read from the package's own docs at build time (Vite `?raw`)
// rather than copied by hand. Two things this makes possible:
// - a blocker id a signpost cites (`Q-11`, `REQ-PART-4`, `GATE-2`) can be
//   checked to still exist in colregs, catching a typo or an id colregs
//   renumbered;
// - `docs/requirements.md`'s own stated convention — "If a requirement is
//   dropped it is struck through and kept, not deleted" (`docs/requirements.md`
//   §0) — lets a struck-through `REQ-*` id be detected mechanically, so a
//   signpost that still cites a superseded requirement as an active blocker
//   fails a test instead of going stale silently.
//
// `Q-*` ids (`## 11. Open questions`) carry no equivalent machine convention
// — resolution is prose, not a marker — so this module exposes their raw
// bullet text and existence only. signposts.test.ts pins the bullets an
// active blocker depends on, and fails when colregs' text moves out from
// under it.

import requirementsMd from 'colregs/docs/requirements.md?raw';
import gatesJson from 'colregs/docs/gates.json' with { type: 'json' };

interface Bullet {
  id: string;
  text: string;
  struckThrough: boolean;
}

// A top-level bullet: `- **<ID>**`, ID id, at the start of a line. Its body
// runs to the next such bullet or heading — an indented continuation line
// (colregs' own wrapping style) never starts a new one.
const BULLET_START = /^- \*\*([A-Za-z][\w-]*)\*\*/gm;

function parseBullets(markdown: string): Map<string, Bullet> {
  const starts: { index: number; id: string }[] = [];
  for (const m of markdown.matchAll(BULLET_START)) {
    starts.push({ index: m.index, id: m[1] });
  }
  const bullets = new Map<string, Bullet>();
  for (let i = 0; i < starts.length; i++) {
    const { index, id } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : markdown.length;
    const text = markdown.slice(index, end).trim();
    // colregs' convention: a dropped requirement is struck through starting
    // right after the id (`- **REQ-PART-4** — ~~...~~`).
    const struckThrough = /^- \*\*[\w-]+\*\* — ~~/.test(text);
    // A bullet id can repeat if colregs sections its doc by id family
    // (e.g. a `### From ADR 0005` recap); the first (canonical) one wins.
    if (!bullets.has(id)) bullets.set(id, { id, text, struckThrough });
  }
  return bullets;
}

const bullets = parseBullets(requirementsMd);

interface Gate {
  id: string;
  status: 'open' | 're-taken' | 'adopted' | 'declined-permanently';
}

const gates = new Map(
  (gatesJson as { gates: Gate[] }).gates.map((g) => [g.id, g]),
);

/** Whether colregs itself still declares this id — Q-N, REQ-*, or GATE-N. */
export function knownColregsId(id: string): boolean {
  return bullets.has(id) || gates.has(id);
}

/** The bullet's own text, for pinning against future drift. */
export function bulletTextFor(id: string): string | undefined {
  return bullets.get(id)?.text;
}

/**
 * True when colregs' own convention marks this id settled: a struck-through
 * `REQ-*` bullet, or a `GATE-*` whose status is no longer `open`. `Q-*` ids
 * have no such marker (see module comment) and always read false here —
 * their staleness is caught by pinning `bulletTextFor`, not by this check.
 */
export function isSettledInColregs(id: string): boolean {
  const gate = gates.get(id);
  if (gate) return gate.status !== 'open';
  return bullets.get(id)?.struckThrough ?? false;
}
