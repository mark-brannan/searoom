# Nav-lights educational app — product design + roadmap (2026-08-29)

The second named consumer of the [colregs](https://github.com/mark-brannan/colregs)
data package takes shape. Follows
[2026-08-28-nav-lights-plugin-design.md](2026-08-28-nav-lights-plugin-design.md)
and [2026-08-28-nav-lights-data-schema.md](2026-08-28-nav-lights-data-schema.md).
This doc is the design feedback front-loaded: it seeds the new repo, and the
two prompts at the bottom are the handoff.

## Decisions taken this session (Mark's calls)

- **New repo, new distinctive name.** A naming/branding workshop session runs
  *before* the design goes further, so no placeholder name calcifies.
  Prompt A below.
- **Audience bar: recreational + exam prep**, aiming eventually at all four
  audiences (rec, exam candidates, professional watchkeepers, package
  evaluators). The reasoning: devs are impressed *by* a high pedagogical bar,
  and exam-grade rigor is only reachable if the rec+exam demo already aims at
  completeness of rules and jurisdictions — which also sets the quality bar
  for the data package underneath.
- **Stack: Vite + React + TypeScript.** Static export, GitHub Pages deploy on
  merge (the portolani/coast-wright pattern).
- **Delegation model: one ambitious autonomous sprint.** Feedback is
  front-loaded here and in the naming session; then Claude takes it all the
  way to a fully functional first demo with limited oversight. Mark reviews
  hands-on *after* the demo exists. His framing: "think of me like the
  senior manager, director, or exec of the startup."
- **i18n is first-class** (added later 2026-08-29, after
  [colregs#4](https://github.com/mark-brannan/colregs/pull/4)). Language is
  a dimension orthogonal to jurisdiction — REQ-LANG-1..8 and ADR 0003 own
  the data-model side. The app builds i18n-first from the first commit.
  Finnish is the first target: SignalK's contributor base is heavily
  Finnish, and the Nordic and Russian communities around Seattle/Alaska
  make those languages goodwill worth having. Which rule-text corpus lands
  first is sequenced by colregs licence checks (Q-6/Q-7), not by the app.
- **Standing, from 2026-08-28, not reopened:** the renderer is a **hybrid** —
  a small curated set of base vessel drawings selected by length/config, with
  the lights rendered dynamically on top. Not one parameterized silhouette,
  not per-rule static images. The bearing view (lights only, seen from angle
  θ) composes with it.

## Product shape

**One scene, many modes.** Everything the app does is a view over the same
three objects: a *fact record* (the vessel's situation), the *entries* that
fire for it, and the *lawful displays* those entries compose into. The modes
differ only in which of the three is hidden and which the user must supply.

| mode | user supplies | app shows |
|---|---|---|
| Sandbox | fact record | displays + rules |
| Identify | lights seen | candidate fact records |
| Quiz | answers | scored both directions |
| Flashcards | recall | one card at a time |
| Rules | a citation | text + linked scenes |

### The engine

colregs is data-only by design — the consumer implements evaluation. The app
carries a small TypeScript evaluator: predicates over the fact record →
applicable entries → relations resolved (`includes`, `conditional_includes`,
`in_lieu_of`, `excludes`, `exempts`) → the set of *complete lawful displays*.
The app never picks one display; where the rules permit a choice, all options
surface (REQ-MODEL-8 / REQ-CONS-3 carried through to the UI).

The engine's test suite replays `fixtures/applicability-fixtures.json`
verbatim. That is the package's cross-implementation contract exercised by a
real second implementation for the first time — a selling point for both
repos, and the app's CI catches colregs regressions before consumers do.

### The scene renderer

Three views over one display, SVG throughout, night-dark theme as the
default (this is a night-lights app; dark isn't a preference, it's the
subject):

- **Profile** — the boat from abeam: curated base drawing + lights placed on
  it, each light glowing its Rule 21 colour. `geometry.json` informs
  placement where it helps; idealized is fine.
- **Bearing** — the exam-critical view: black field, lights only, seen from a
  relative bearing the user drags around a dial. Sidelight cutoffs, masthead
  arc edges and aspect changes happen live as θ sweeps. Optionally a faint
  hull hint.
- **Plan** — top-down arcs: each light's `from_deg`/`to_deg` sector drawn
  around the hull, the view that explains *why* the bearing view changes.

Base drawing set, curated small: sail (small/large), power (small/large,
planing/displacement), ship, tug + tow, pusher, trawler/fishing boat,
open boat/tender. Selected by propulsion + activity family + length band.

### Mode: Sandbox — the v1 core

The interactive configurator Mark described. Left panel is the fact record,
rendered as controls:

- the three axes as segmented controls (`propulsion`, `activity`,
  `position`), `making_way` where it applies;
- `length_m` as a slider with tick marks at the COLREGS thresholds
  (7/12/20/50/100 m) — dragging across a threshold visibly changes the
  answer, which *is* the lesson;
- `tow_length_m`, `max_speed_kn`, and the education-only facts
  (`composite_unit`, `non_displacement`, `wig`+`wig_near_surface`,
  `near_channel`, `gear_extent_m`, `obstruction_side`…) grouped as
  "special cases";
- jurisdiction picker and day/night toggle (see breadth surface below).

Right side: the scene, plus the **rules panel** — every entry that fired,
with its modality badge (shall / may / shall-if-practicable / conditional),
the verbatim paragraph text on expansion, and the USCG diagram where
`images.json` links one.

**Alternatives are the elimination UX.** When the display set has more than
one lawful option (a 12 m sloop under sail: 25(a), the 25(b) tricolor, or
25(a) + 25(c) red-over-green), the app says "3 lawful displays" and renders
them as selectable chips. Flipping between them redraws the scene and
highlights *which* rule made each legal and what excludes what (`25(c)` ✕
tricolor). That's Mark's "process of elimination to settle on one image,"
grounded directly in the `in_lieu_of`/`excludes` relations.

### Mode: Identify — the reverse field guide

The `sightings.yaml` idea harvested from colregs-mcp, done properly. The
user builds what they *see* — picks lights on a dark field (or answers
"what's at the masthead? what colour over what?") — and the app runs the
reverse direction of the drift test: which fact records could explain these
lights, at which aspects. Narrows as lights are added, ending at either one
answer or an honest "these N situations are indistinguishable at night from
this bearing" — which is true of real COLREGS and worth teaching.

### Mode: Quiz

Both directions, exam-prep framing:

- **Forward**: here's a situation (prose or fact record) — what must she
  show? Multiple choice over rendered scenes.
- **Reverse**: here's a bearing-view scene — what is she, and what's her
  aspect? ("Red over green, sidelights, no sternlight visible: sailing
  vessel, seen from ahead…")

Distractors come from *near-miss entries*: neighbouring fact records across
a threshold, a different activity with overlapping lights, the same vessel
from a different bearing. The drift test's adjacency structure is literally
a distractor generator — no hand-written wrong answers.

### Mode: Flashcards (phase 2)

A deck over entries and light definitions; card front is a rendered scene or
a cite, back is the other. Spaced-repetition-lite (Leitner boxes in
localStorage). Deferred: it needs the same renderer and quiz content, so it
lands nearly free after both exist.

### Mode: Rules — the reference

The paragraph-keyed rule text, browsable and deep-linkable
(`#/rules/27(a)(i)`). Each paragraph links back to the entries citing it and
each entry to the sandbox pre-configured with a fact record that fires it.
The USCG diagrams from `images/` appear alongside their paragraphs.

### Breadth-first surface — signposted dead ends

Mark's explicit call: show the full aimed-at scope in the UI now, even where
the data isn't loaded yet. Dead ends beat a demo scoped to what sailors
already know.

- **Jurisdiction picker** shows the taxonomy from REQ-SCOPE-2:
  International · US Inland · Canada (inland) · EU CEVNI · Germany
  (Binnenschifffahrtsstraßen) — with International live and the rest
  present but *signposted*. Great Lakes / Western Rivers / special anchorage
  areas appear under US Inland as geography facts, not jurisdictions
  (REQ-SCOPE-5).
- **Day/night toggle**, night live, day signposted (shapes are modeled for,
  REQ-PART-2, not yet in data).
- **Sound signals (Part D)** as a visible mode stub.

A signposted dead end is not a greyed-out mystery. Selecting one shows a
panel: what this jurisdiction/part covers, its status ("modeled for, data
not yet landed"), what the delta looks like (US Inland: four deltas and one
new light, already measured), and a link to the roadmap. The dead end *is*
content — it tells users and evaluators what the product is becoming, and
it's honest (REQ-SCOPE-6's spirit at the UI layer).

### Languages — i18n-first

Mirrors colregs#4's split exactly. Two string planes, never mixed:

- **Display catalogs** — UI chrome, light names, fact-value labels,
  modality labels. App-side message catalogs plus the package's
  `data/i18n/` catalogs once those exist (REQ-LANG-6). Translatable by the
  community, reviewed for idiom.
- **Rule-text corpora** — legal text, rendered *only* from package data,
  never translated app-side. Each render shows its corpus's tier and
  source beside the modality badge — today's English is the *national*-tier
  USCG text, not the authentic treaty English, and surfacing that is itself
  a teaching point.

The locale picker joins the signposted-breadth pattern: English live,
Finnish first target, Swedish/French/Russian/German signposted with status.
REQ-LANG-7 puts fallback on the consumer, so the app owns an explicit
fallback UX: "this paragraph isn't in the Finnish corpus yet — showing
en-US (USCG)" — the signpost pattern again, never silent substitution.

The engine never notices locale: ids are language-neutral (REQ-LANG-2), so
switching language changes no quiz answer and no entry set.

**Credibility rule:** no unreviewed machine translation presented as
finished. A draft Finnish catalog may ship behind a visible "draft —
awaiting native review" label so the mechanism demos end-to-end; before any
public showing a named native reviewer signs off. Recruiting that reviewer
from the SignalK community *is* the goodwill move, not a chore ahead of it.
A wrong nautical term would burn exactly the credibility this buys.

### The data drawer

For the evaluator/dev audience: a collapsible drawer showing the raw entries
that fired — ids, cites, predicates, relations — plus the colregs package
version and a link. Every scene is traceable to data; the demo doubles as
the package's live documentation.

## Adjacent features and product ideas (captured, not scheduled)

- **URL-encoded state** — the whole fact record + view in the URL, so any
  configuration is shareable/bookmarkable. Cheap, high demo value: sprint 1.
- **My boat** — persist your own vessel's facts; quiz and reference filter
  to your boat. Natural bridge toward the switching plugin story.
- **Cheat-sheet export** — printable card: your boat → your required lights
  + the handful of situations you'll actually meet. Lamination bait.
- **Aspect trainer** — timed drill on the bearing view alone: aspect,
  crossing/overtaking geometry as seen by lights. The watchkeeper tier.
- **Day shapes / Part D sound signals** — same entry model (REQ-PART-2/3);
  sound quiz gets audio. Light up when colregs lands the data.
- **Annex II fishing signals** — already in the SignalK decode table
  (`shooting`, `hauling`, `purse_seine_hampered`); signpost until modeled.
- **SignalK live mode** — read `navigation.state` from a demo/live server
  and show what you *should* be showing. The educational face of the
  switching plugin; also demos the decode table and its lossy cases.
- **PWA + offline** — rules study happens on passage, offline is real. The
  signalk-noaa-space-weather#240 PWA-now/store-later freemium pattern
  applies if this earns an audience.
- **Embeds** — sailing schools and forums embedding a configured scene.
- **Presentation** — landing page whose hero *is* the sandbox; animated GIF
  of a threshold crossing; "powered by colregs" positioning that sells the
  data package to the dev audience in the same breath.

## Roadmap

- **Phase 0 — this design.** Done (this doc).
- **Phase 0.5 — naming/branding workshop.** Interactive, Mark in the loop.
  Output: name, repo created and seeded, one-line positioning, palette
  direction. Prompt A. *Blocks sprint 1.*
- **Sprint 1 — the autonomous build.** Engine + renderer + sandbox +
  identify + quiz v1 + rules reference + breadth shell + i18n scaffolding
  with locale switcher + URL state + data drawer + Pages deploy +
  fixture-replay CI. Ends with a live URL, screenshots, and self-review
  notes for Mark. Prompt B.
- **Phase 2 — hands-on review → iteration.** Mark plays with the demo;
  feedback becomes the sprint-2 backlog. Flashcards, polish, a11y depth,
  content quality passes, and the *reviewed* Finnish display catalog
  (named native reviewer, recruited via the SignalK community) land here.
  Prompts written then, shaped by the feedback.
- **Phase 3 — data expansion in colregs** (separate sessions, separate
  repo): `us/inland` (measured: 23(e), 24(f)+21(g) special flashing, 24(j),
  30(g)), then day shapes, and the first non-English rule-text corpora as
  Q-6/Q-7 licence checks clear — French (UNTS, authentic) and Finnish
  (Finlex, national) are the likely front of the queue per ADR 0003. The
  app lights up its dead ends by bumping a dependency — that's the payoff
  of jurisdiction-as-dimension, and language-as-dimension pays the same way.
- **Phase 4 — Europe + Part D scoping.** CEVNI/Canada licence verification
  first (Q-3 — CEVNI is the likeliest to fail; REQ-PROV-2 blocks data until
  checked), Part D's event-vs-state question (Q-1) as an ADR.
- **Phase 5 — launch polish.** PWA, share/embed, cheat-sheet export,
  landing page, positioning, maybe store listing.

## Sprint-1 boundaries (what the autonomous session must not do)

- **No edits to colregs data.** Gaps found while building become colregs
  issues, filed with the failing fact record. The app renders what the data
  says, nothing more.
- **No invented rules.** Dead-end jurisdictions get signposts, never
  approximated content. Nothing fabricated to make a demo screen richer.
- **No inference.** The user sets facts; the app never guesses state.
- **Not fit for navigation** disclaimer carried from the package, visibly.

## Handoff prompts

### Prompt A — naming/branding workshop (launch now)

**Model: Opus 5 · interactive session, Mark present · difficulty: low-medium,
one sitting.** Paste as-is:

```text
We're naming a new product: an educational web app for COLREGS navigation
lights, built on my colregs data package
(https://github.com/mark-brannan/colregs, colregs@0.1.1 on npm). Read the
product design first:
~/claude_prompts_scratch/state/global/log/2026-08-29-navlights-edu-app-design.md

Modes: an interactive sandbox (configure a vessel's situation, see the boat,
its lights from any bearing, and the exact rule paragraphs), an identify
mode (lights seen -> what is she), quizzes, flashcards, a rules reference.
Audience: recreational sailors and exam candidates first (USCG/RYA/ICC),
professional watchkeepers later. Scope ambition: all jurisdictions -- COLREGS
international, US Inland, Canada, EU CEVNI.

Task: workshop a distinctive product name with me, then execute the setup.

Constraints:
- Not a placeholder, not descriptive-generic ("navlights-quiz"), and not
  signalk-prefixed -- this is a consumer product, not a plugin.
- Sibling names for taste calibration: colregs, portolani, coast-wright,
  wire-wright, ampacity. I like short, evocative, a little salty; wright-
  and nautical-latin veins both live here. But this one faces sailors, not
  developers, so it can be warmer than the data packages.
- Verify availability before proposing: npm name free, github repo free,
  no obvious trademark collision with existing nav/boating apps (search).
  A matching .com/.app is nice, not required.
- The name must travel: i18n is first-class in this product and Finnish is
  the first target language, so no English-only puns or idioms. Sanity-check
  pronunciation and meaning in at least Finnish, Swedish, German, and
  French -- nothing awkward, nothing accidentally rude.

Process: bring 8-12 checked candidates in 2-3 themed groups, with your
single recommendation and why, first. Iterate with me until I pick.

Then, same session, after I confirm the name:
1. Create the public GitHub repo (gh repo create, MIT).
2. Seed it: copy the design doc above into docs/design.md, write a
   README stub with the one-line positioning we settle, add a card-sized
   visual identity note (palette direction: night-sea darks + the three
   light colours red/green/white as the accent system).
3. Update the global board: the naming card closes, the sprint-1 card
   unblocks with the repo URL filled in.

Do not start building the app; that's the next session's prompt.
```

### Prompt B — sprint 1, the autonomous build (launch once the repo exists)

**Model: Fable 5 (Opus 5 acceptable) · high effort · difficulty: high — a
long autonomous run, heavy token spend; cloud session or dispatch chain
both fit. Sub-agents/workflows encouraged inside the run.** Fill in
`<REPO>` from the naming session, then paste:

```text
Build the first full demo of <REPO>, the COLREGS navigation-lights
educational app. You have the whole sprint; I will not be reviewing
mid-flight. Treat me as the exec: I front-loaded my feedback into the
design doc, and I expect a finished, live, excellent demo at the end.

Read first, in order:
1. docs/design.md in this repo -- the product design; its decisions stand.
2. The colregs package: README, docs/requirements.md, data/*.json,
   fixtures/applicability-fixtures.json (colregs@latest on npm;
   https://github.com/mark-brannan/colregs). It is data-only; you
   implement evaluation.

Scope -- all of it, this sprint:
- Engine: TypeScript evaluator (predicates -> entries -> relations ->
  lawful displays), with the colregs fixture file replayed verbatim in CI.
  Alternatives stay unresolved: the engine returns every lawful display.
- Renderer: SVG. Profile, bearing (draggable theta, lights-only on black),
  and plan (arc sectors) views. Hybrid model per the design doc: a small
  curated set of base vessel drawings, lights rendered dynamically on top.
  Night-dark theme is the default and the identity.
- Modes: Sandbox (the core -- fact-record controls, threshold-marked length
  slider, rules panel with modality badges + verbatim paragraph text,
  lawful-display chips with the elimination UX), Identify (reverse field
  guide), Quiz v1 (forward + reverse, distractors from near-miss entries,
  never hand-written), Rules reference (paragraph-keyed, deep-linkable,
  USCG diagrams inline).
- Breadth shell: jurisdiction picker showing International (live), US
  Inland, Canada, EU CEVNI, Germany (signposted); day/night toggle (day
  signposted); Part D stub. A signpost is a content panel -- status, what
  the delta covers, roadmap -- never a bare disabled control.
- URL-encoded app state (shareable configurations).
- i18n-first: every UI string in a message catalog from the first commit
  (pick one boring, standard library -- react-intl or Lingui -- and stay
  with it). Locale switcher in the shell: English live; Finnish present as
  a draft catalog behind a visible "draft -- awaiting native review" label
  (use terminology from Finnish maritime sources where you can find them,
  and leave the reviewer a glossary note); Swedish/French/Russian/German
  signposted with status. Rule text renders only from package corpora,
  with tier + source shown beside the modality badge (today: national /
  USCG / en-US -- colregs PR #4 / ADR 0003 defines the tiers). When a
  paragraph is missing from the chosen corpus, say so explicitly and show
  the fallback -- REQ-LANG-7 makes fallback the consumer's job; never
  substitute silently.
- Data drawer: raw fired entries, ids, cites, package version.
- Deploy: GitHub Pages via Actions on merge to main; CI runs typecheck,
  tests, build. The demo URL must be live before you finish.

Hard boundaries:
- Never edit colregs data. A data gap or bug becomes a colregs issue with
  the failing fact record; the app renders only what the data says.
- No invented rule content for signposted jurisdictions. Honest dead ends.
- Legal rule text is never translated app-side, and no machine translation
  is ever presented as finished -- draft catalogs stay visibly labeled
  draft.
- No inference; the user sets every fact. Carry the "not fit for
  navigation" disclaimer visibly.
- Vite + React + TS. Accessibility floor: keyboard operable, sensible
  focus order, WCAG AA contrast (yes, on the night theme), reduced-motion
  respected. Usable on a phone.

Definition of excellent (acceptance bar):
- Every entry id in colregs applicability data is reachable through the
  sandbox, and at least one fixture's exact scenario is reproducible in
  the UI for each mode.
- The 12 m sloop shows exactly three lawful displays and the elimination
  UX explains why; crossing 50 m on the length slider visibly changes the
  masthead answer; a drifting trawler keeps identity lights and drops
  side/stern lights when making_way flips off.
- The bearing view is exam-faithful: sidelight cutoffs at 112.5deg, arcs
  match lights.json, aspect reads correctly through a full sweep.
- Quiz questions are correct by construction (generated from data) -- spot
  check 20 by hand against rule text before shipping.
- Switching locale changes no quiz answer, no entry set, no scene -- proof
  the engine is language-neutral (REQ-LANG-2) and only strings moved.
- A stranger with an RYA/USCG study guide could check their answers
  against this app and find no contradiction.

Finish with: the live URL; a screenshots/ set (dark colorScheme, per my
Playwright rules) covering every mode; a self-review doc (what's weak,
what you'd do in sprint 2, any colregs issues filed); and a board update.
Verify the deployed site itself before calling it done -- load it, click
through every mode, run the fixture spot-checks against production.
```

### Phase 2+ prompts

Deliberately unwritten. They get shaped by Mark's hands-on review of the
sprint-1 demo; writing them now would front-run the feedback the demo
exists to collect. The sprint-1 self-review doc is their seed.
