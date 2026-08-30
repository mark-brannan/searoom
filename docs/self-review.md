# Sprint 1 self-review — 2026-08-30

The autonomous build the design doc's Prompt B asked for. Live at
<https://mark-brannan.github.io/searoom/>. This file is the seed for the
phase-2 backlog; it leads with what's weak, because that's what a
hands-on review should poke at first.

## What shipped

Engine (predicates → entries → relations → lawful displays, all 53
colregs fixtures replayed verbatim in CI), SVG renderer (profile /
bearing / plan over one placement model, night-dark identity), Sandbox
with the elimination UX, Identify, Quiz v1 (forward + reverse, generated
distractors), Rules reference (deep-linkable, USCG diagrams, the five
known_omissions surfaced, amendment-state teaching point), the breadth
shell (7 jurisdictions, 3 rule parts, 10 corpora — every panel carries
its measured delta and named blocker), react-intl with an en catalog and
a visibly-draft fi catalog, URL-encoded state including the open
signpost, data drawer, CI + Pages deploy. 172 tests; a Playwright
click-through (scripts/verify-live.mjs) runs the acceptance spot-checks
against any deployment.

## Decisions I made that Mark should review

1. **Depend on colregs via git SHA, not npm.** npm 0.1.1 predates the
   identifier audit; main is the vocabulary all the docs describe. Filed
   [colregs#13](https://github.com/mark-brannan/colregs/issues/13)
   asking for a 0.2.0 publish; swap the dependency when it lands.
2. **Display-composition semantics.** The data defines predicates and
   relations; composing *complete lawful displays* needed consumer-side
   decisions (exempts relieve, required-excludes suppress, imports stand
   on their own, one_of availability, relation-free `may` entries as
   "lawful additions" rather than display multipliers). All recorded in
   [engine-notes.md](engine-notes.md) with tests. The riskiest one — an
   import whose source names a contradicting `fact:position` is skipped
   — is really a data gap and is filed as
   [colregs#14](https://github.com/mark-brannan/colregs/issues/14) with
   the failing fact record (mine clearance at anchor).
3. **"Lawful additions" UX.** A `may` entry with no alternative
   relations (second masthead < 50 m, deck lights, Rule 28's three
   reds, the trawler's 26(b)(ii) masthead) renders as a toggle chip
   rather than doubling the display count. This keeps the 12 m sloop at
   exactly three displays and makes the 50 m threshold lesson legible
   (the chip disappears into the mandatory set). It is a presentation
   choice, not data.
4. **Merged this PR myself** — the brief requires a live URL before
   finishing, and Pages deploys from main.

## What's weak

- **Identify matches a colour multiset only.** No vertical arrangement,
  no masthead-vs-all-round distinction, and the candidate pool is the
  fixture fact records plus a small grid — honest about ambiguity, but
  an examiner would want "white over red" to mean the *order*. The
  signature machinery (quiz.ts) already tracks stack order; identify
  just doesn't ask for it yet.
- **Hull art is serviceable, not lovely.** Nine curated silhouettes,
  consistent night-wireframe style, but the sail rig reads sparse and
  the tricolor renders as a tight cluster of three dots rather than a
  single lantern. The bearing and plan views carry the exam value; the
  profile view carries the charm, and it has the least of it.
- **Idealized light placement.** geometry.json's Annex I heights inform
  nothing yet; placement is per-hull anchors. Fine for teaching arcs,
  not for teaching Annex I.
- **Quiz state is ephemeral** — no score persistence, no seed in the
  URL (a specific question isn't shareable), no spaced repetition
  (flashcards are phase 2 by design).
- **The fi catalog covers the interactive chrome only.** Long signpost
  bodies deliberately fall back to English rather than machine-drafting
  them (REQ-LANG-8's spirit); the reviewer glossary is
  [fi-glossary-notes.md](fi-glossary-notes.md).
- **Plan-view pointer drag has no keyboard equivalent in that tab** —
  θ is keyboard-adjustable via the bearing tab's slider, which meets
  the floor, but arrow keys on the plan dial would be better.
- **Display-level expectations live only in this repo's tests.** The
  colregs fixture contract pins entry sets; the lawful-display sets the
  elimination UX shows are pinned only by searoom's own suite. Upstream
  display fixtures would make a third implementation agree with both.

## Sprint 2 candidates, in the order I'd take them

1. Swap to colregs@0.2.0 when #13 lands; drop the SHA pin.
2. Arrangement-aware Identify (stack order, masthead vs all-round),
   plus a "what's at the masthead?" question flow.
3. Flashcards over the existing quiz generator (Leitner boxes in
   localStorage) — lands nearly free now.
4. Profile-art polish pass; single-lantern tricolor; anchor-ball etc.
   when day shapes arrive upstream.
5. Quiz seed in URL; score persistence; per-entry coverage tracking so
   drills bias toward what the learner gets wrong.
6. Upstream display-level fixtures to colregs (after #14 settles the
   includes semantics).
7. "My boat" (persist a fact record) — the bridge to the SignalK story.

## colregs issues filed this sprint

- [#13](https://github.com/mark-brannan/colregs/issues/13) — publish
  0.2.0 so consumers can leave the git SHA.
- [#14](https://github.com/mark-brannan/colregs/issues/14) — 27(f)/28's
  unconditional Rule-23 includes misfires for a vessel not underway;
  failing fact record included.

## Verification trail

- `npm test`: 172 tests — fixture replay (53/53), display composition,
  arc math (cutoffs at 112.5°, wrap through the bow, no dark sector),
  quiz correct-by-construction across 50 seeds, URL round-trips, entry
  reachability (40/40 via fixture fact records).
- 20 quiz questions hand-checked against rule text before shipping
  (12 forward, 8 reverse) — session log; the weak-distractor finding it
  produced (hull-size near-duplicates) was fixed by making display
  signatures hull-independent.
- `scripts/verify-live.mjs` against the production URL after deploy:
  the sloop's three displays, the 50 m masthead flip, the drifting
  trawler, the tricolor's single-light aspect, locale-switch
  invariance (REQ-LANG-2), the 30(e) exemption, signpost content, quiz
  feedback, deep links.
