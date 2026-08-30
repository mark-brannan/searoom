# Searoom — product design + roadmap

This is the living design document for **[searoom](https://github.com/mark-brannan/searoom)**,
the COLREGS navigation-lights educational app — the second named consumer of
the [colregs](https://github.com/mark-brannan/colregs) data package. Originally
written 2026-08-29 (dated log:
[2026-08-29-navlights-edu-app-design.md](https://github.com/mark-brannan/claude_prompts_scratch/blob/main/state/global/log/2026-08-29-navlights-edu-app-design.md),
private repo) under the working name "nav-lights edu app," before naming was
settled. Unlike the dated log this doc lives in, **this file is meant to be
kept current** — edit it in place as decisions land; the dated logs are
history and don't get rewritten.

## Naming — settled 2026-08-29

Branding workshop output (session `navlights-branding-workshop-0885d7`):

- **App: `searoom`** — this repo. "See the rules of the road."
- **Renderer (extracted from in-app code once proven): [`nav-wright`](https://github.com/mark-brannan/nav-wright)**
- **Evaluator (extracted from in-app code once proven): [`colregs-engine`](https://github.com/mark-brannan/colregs-engine)**

Both nav-wright and colregs-engine are built *inside* this repo first and
extracted later, once the interfaces have proven themselves against a real
consumer — not designed as standalone packages up front.

Still separate and **unsettled**: the SignalK *switching plugin*'s name and
repo siting (a different artifact — the runtime plugin, not this educational
app). Tracked on the global board, blocked on research into SignalK plugin
discoverability conventions.

## Decisions taken 2026-08-29 (Mark's calls)
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
already know. The signposts are only worth looking at if they carry the
scope colregs has *actually* established, so each one below names what that
repo has measured, what it hasn't, and what the blocker is by name.

**Jurisdiction picker** shows the taxonomy from REQ-SCOPE-2 and the work
queue from colregs ADR 0001. International is live; the rest are signposted
with their measured delta and their blocker.

- **International (`intl`) — live.** 40 applicability entries, 100 rule-text
  paragraphs, 10 light definitions, 53 fixture cases. Part C (Rules 20–31),
  night only. Five omissions are recorded *in the data*
  (`known_omissions`: 24(d), the 24(f)–(i) pushed/towed-group family, 27(c),
  27(g)'s under-12 m exemption, and Rule 31 seaplanes/WIG) — the app should
  surface those as first-class gaps, not silence, since colregs already
  states them.
- **US Inland (`us/inland`, 33 CFR 83–90) — delta measured, blocked on
  Q-11.** Diffed paragraph-by-paragraph against eCFR on 2026-08-30: of 90
  Part C paths, **15 are same-path-different-text** — the dangerous case,
  where the citation you'd copy across means something else (22(a)/(b)/(c),
  24(c)/(d)/(f)/(g)/(i), 25(d)(i)/(ii), 25(e), 26(d), 27(c), 30(e)). One
  structural path mismatch (`23(d)(i)` has no Inland counterpart path — the
  content sits at bare `83.23(d)`). One whole-rule clean absence: **Rule 28
  is "[Reserved]"** — constrained-by-draught is not an Inland concept at
  all. Two clean intl-only absences (`23(d)(ii)`/`(iii)`). Roughly 71 of 90
  paths are citation-compatible. Plus **one new light** — 83.21(g), the
  special flashing light (yellow, 50–70 flashes/min, forward, 180–225° arc)
  — which propagates into the 22(a)/(b)/(c) range table and 24(f). And six
  Inland-only insertion blocks: 23(e) Great Lakes substitution, 24(j)
  Western Rivers pushing/towing, 26(f) fishing-proximity signals lifted
  inline from Annex II, 27(d)(iv) dredge pipelines, and the large 30(g)–(l)
  anchorage block. *Blocker*: Q-11 — REQ-SCOPE-3's inherit-by-absence is
  verified unsafe (silence at Rule 28 would assert international law on
  inland waters), so no non-`intl` jurisdiction lands until an explicit
  suppression mechanism — tombstones — exists. It is decided in one
  "second-jurisdiction bundle" with the GATE-1 re-take and Q-10.
- **Canada (`ca/inland`, Collision Regulations C.R.C. c.1416) — ranked, not
  measured.** ADR 0001 rates the delta *moderate*; no paragraph-level diff
  has been run. *Blocker*: Q-3 — reproduction terms (Reproduction of Federal
  Law Order) are recalled, not verified, and REQ-PROV-2 blocks the
  jurisdiction until they're checked against the primary source. Plus Q-11,
  as for every delta.
- **EU CEVNI (`eu/cevni`, UNECE CEVNI / RPNR) — the interesting one, and the
  one most likely to fail.** ADR 0001 rates it the **largest delta of any**
  on the queue: genuinely different inland light configurations, and no
  prior art as structured data anywhere. *Blocker*: Q-3 names CEVNI's UN
  copyright as unclear and "the one most likely to fail" outright — this is
  the only candidate on the list where the licence check could end the
  jurisdiction rather than delay it. Signpost it honestly: highest value,
  highest risk of never existing.
- **Germany (`de/binnen`, SeeSchStrO / BinSchStrO) — ranked *large*, not
  measured.** *Blocker*: Q-3 — §5 UrhG *amtliche Werke* is the presumed
  basis and is unverified.
- **UK (`uk`, SI 1996/75) and Australia (`au`, Marine Order 30) — near-zero
  delta, cheap.** ADR 0001 keeps both on the queue precisely *because* the
  delta is near-zero: they cost almost nothing and let the coverage
  statement name six jurisdictions honestly. *Blocker*: Q-3 (OGL v3.0 and
  CC BY 4.0 respectively, both unverified) and Q-11. Worth showing in the
  picker — a near-zero delta is itself a teaching point about what
  harmonisation means.

Great Lakes, Western Rivers and special anchorage areas appear **under** US
Inland as geography facts, not jurisdictions (REQ-SCOPE-5) — and now with
the actual CFR paths behind them (83.23(e), 83.24(j), 83.30(g)–(l)).

**Day/night toggle.** Night live; day signposted — shapes use the same entry
model and differ only in the vocabulary they emit (REQ-PART-2), so this is
modelled-for and unwritten, not unresolved.

**Sound signals (Part D, Rules 32–37)** as a visible mode stub, signposted
with its actual open question: Q-1 — whether Part D fits the entry model at
all, or needs an event dimension, because signals are event-triggered rather
than state-derived. REQ-PART-3 requires an ADR before any Part D data is
written. Not "coming soon": *undecided, and here is the decision*.

**Steering and sailing rules (Part B)** are deliberately **out of scope and
may never be modelled** (REQ-PART-4) — they govern conduct between two
vessels, and colregs' fact record is single-vessel by construction. A dead
end that is a dead end on purpose is the most honest signpost in the app,
and it explains the shape of everything else.

A signposted dead end is not a greyed-out mystery. Selecting one shows a
panel: what this jurisdiction/part covers, its status, the measured delta
where colregs has one, the named blocker (Q-3 licence, Q-11 suppression,
Q-1 event model) and a link to the roadmap. The dead end *is* content — it
tells users and evaluators what the product is becoming, and it is honest
(REQ-SCOPE-6's spirit at the UI layer). Where colregs has genuinely not
scoped something, the panel says "not yet scoped" rather than inventing a
status.

### Languages — i18n-first

Mirrors colregs ADR 0003 exactly. Two string planes, never mixed:

- **Display catalogs** — UI chrome, light names, fact-value labels, modality
  labels. App-side message catalogs for now: `data/i18n/` **does not exist
  yet** (REQ-LANG-6 is unimplemented; catalog extraction is step 2 of ADR
  0003's sequencing). Static strings only — no interpolation, plurals or
  gender grammar in the package; message composition is ours (REQ-LANG-6).
- **Rule-text corpora** — legal text, rendered *only* from package data,
  never translated app-side. Each render shows its corpus's tier and source
  beside the modality badge.

**What exists today: exactly one corpus**, and the app should say so. The
shipped English is the **USCG amalgamated rendition — `national` tier,
`en-US`**, not the authentic treaty English ("maneuver" where the authentic
text reads "manoeuvre"). It also carries four known transcription defects
against its own declared source (21(a), 21(b), 23(b), 29(b) — colregs issue
[#6](https://github.com/mark-brannan/colregs/issues/6), open). Surfacing
both facts is itself the teaching point.

The locale picker joins the signposted-breadth pattern, and each entry
carries its **tier** (REQ-LANG-3) and its **named blocker**:

| Corpus | Tier | Status |
|---|---|---|
| `en-US` / USCG | `national` | **Live.** The only corpus. Four transcription defects open (#6). |
| `en` / UNTS original | `authentic` | Article IX verified 2026-08-30: English and French are equally authentic. Addable beside the USCG text; not yet scheduled. |
| `fr` / UNTS | `authentic` | Front of the queue with Finnish (ADR 0003 step 3). Blocked on Q-7 — the UNTS deposit's reproduction terms are unchecked. |
| `fi` / Finlex | `national` | ADR 0003's other front-runner, chosen for SignalK's heavily Finnish contributor base. Blocked on Q-7 (Finlex terms). |
| `es` / BOE-or-deposit | `official` | Deposited official translation, verified against Article IX. Source is the problem, not the text: IMO's consolidated editions are **sold publications and probably not reproducible**; a national gazette is the likely lawful route. Q-7. |
| `ru` | `official` | Same as `es`. An IMO Russian edition is catalogued (ISBN 9789280141078) — and catalogued means *for sale*. Q-7. |
| `zh` | `official` | Mechanism verified (IMO's six official languages); Chinese edition catalogued (ISBN 9789280160512). Q-7. |
| `ar` | `official` | Mechanism verified; the Arabic edition is **the one sub-claim colregs flags as not confirmed to the same standard** — its product page returned 403 to the verification pass. Q-7, and a verification gap besides. |
| `de` | `national` | Named in ADR 0003 as a state gazetting a binding translation; no source or terms identified. Not yet scoped. |
| Anything `community`-tier | `community` | No corpus exists and none is named. REQ-LANG-8: a named human producer and reviewer are mandatory; machine translation without named review is not accepted. |

Two things the picker should say out loud, because they are colregs' actual
decisions and they are more interesting than a progress bar:

- **Licence, not translation effort, is what sequences this** (Q-7). The
  work is not blocked on finding translators; it is blocked on establishing
  that a lawful, reproducible source exists for each text. And Q-7 is
  answerable **per language** — clearing one source unblocks that corpus
  alone, which is the cheap path if a demo needs a specific language early.
- **The first non-English corpus is a gate, not just a file** (GATE-2).
  Landing translation #1 forces colregs to re-take the
  instrument → edition → corpus layering decision, because a French text of
  `intl` is the second corpus of `intl`. So the locale picker's first new
  entry is a design event upstream, and the app can say that.

REQ-LANG-7 puts fallback on the consumer, so the app owns an explicit
fallback UX: "this paragraph isn't in the Finnish corpus yet — showing en-US
(USCG, `national`)" — the signpost pattern again, never silent substitution.
A mixed-corpus rendering is never a single authoritative edition, and the app
must say so wherever it assembles one.

**Amendment state is a signpost too.** REQ-LANG-10 is unimplemented — the
shipped ruleset declares no amendment state — but the history is now verified
(colregs, 2026-08-30): seven amendment resolutions since 1972, two of which
renumbered Part C. `23(c)` meant the small-vessel alternative until 2003,
when the WIG-craft paragraph took that path and displaced it to `23(d)`;
A.464(XII) relettered `24(g)`→`24(h)`. A rules browser that shows which
consolidation it is quoting — and that a citation's meaning has moved before
— is teaching the single most citation-relevant fact in the corpus.

The engine never notices locale: ids are language-neutral (REQ-LANG-2), so
switching language changes no quiz answer and no entry set.

**Credibility rule:** no unreviewed machine translation presented as
finished — this is REQ-LANG-8, not just our own taste. A draft Finnish
catalog may ship behind a visible "draft — awaiting native review" label so
the mechanism demos end-to-end; before any public showing a named native
reviewer signs off. Recruiting that reviewer from the SignalK community *is*
the goodwill move, not a chore ahead of it. A wrong nautical term would burn
exactly the credibility this buys.

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
  repo): `us/inland` — measured 2026-08-30 (15 same-path-different-text of
  90 Part C paths, Rule 28 "[Reserved]", the 83.21(g) special flashing
  light, six Inland-only insertion blocks), gated upstream on colregs Q-11's
  delta-suppression mechanism — then day shapes, and the first non-English
  rule-text corpora as
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

### Prompt A — naming/branding workshop (done, 2026-08-29)

**Ran.** Output: `searoom` (app, this repo), `nav-wright` (renderer),
`colregs-engine` (evaluator). Kept below for the record.

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

### Prompt B — sprint 1, the autonomous build (repo exists — ready to launch)

**Model: Fable 5 (Opus 5 acceptable) · high effort · difficulty: high — a
long autonomous run, heavy token spend; cloud session or dispatch chain both
fit. Sub-agents/workflows encouraged inside the run.** `<REPO>` = `searoom`.
Paste:

```text
Build the first full demo of searoom, the COLREGS navigation-lights
educational app. You have the whole sprint; I will not be reviewing
mid-flight. Treat me as the exec: I front-loaded my feedback into the
design doc, and I expect a finished, live, excellent demo at the end.

Read first, in order:
1. docs/design.md in this repo -- the product design; its decisions stand.
   Read "Breadth-first surface" and "Languages -- i18n-first" twice: they
   carry per-jurisdiction and per-corpus specifics (measured deltas, tiers,
   named blockers) that are the literal content of the signpost panels. Do
   not paraphrase them into a generic "coming soon" taxonomy.
2. The colregs package: README, docs/requirements.md, docs/adr/0001 and
   0003, docs/verification/2026-08-30-q6-q8.md, data/*.json,
   fixtures/applicability-fixtures.json (colregs@latest on npm;
   https://github.com/mark-brannan/colregs). It is data-only; you
   implement evaluation.

Scope -- all of it, this sprint:
- Engine: TypeScript evaluator (predicates -> entries -> relations ->
  lawful displays), with the colregs fixture file replayed verbatim in CI
  (all 53 cases). Alternatives stay unresolved: the engine returns every
  lawful display.
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
- Breadth shell -- this is a headline deliverable this sprint, not a
  placeholder. Build the signpost panel as a real content surface, driven
  by a small structured file in this repo (one record per signposted
  jurisdiction/part/corpus: status, measured delta, blocker id + one-line
  blocker text, link). Populate it verbatim from design.md's two sections:
    * Jurisdictions: International (live: 40 entries, 100 paragraphs, 10
      lights, 53 fixtures, Part C night-only, five recorded
      known_omissions); US Inland (delta measured 2026-08-30 -- 15 of 90
      paths same-spelling-different-text, one structural path mismatch at
      23(d)(i), Rule 28 "[Reserved]", two clean intl-only absences, ~71
      citation-compatible, one new light at 83.21(g) special flashing, six
      Inland-only insertion blocks; blocked on colregs Q-11 delta
      suppression); Canada (ranked moderate, unmeasured; blocked on Q-3
      licence); EU CEVNI (largest delta of any, no prior art as structured
      data; Q-3 flags it the likeliest licence failure outright); Germany
      (ranked large, unmeasured; Q-3, §5 UrhG); UK and Australia (near-zero
      delta, cheap, on the queue for that reason; Q-3).
    * Great Lakes / Western Rivers / special anchorage sit UNDER US Inland
      as geography facts, not jurisdictions (REQ-SCOPE-5), with their CFR
      paths (83.23(e), 83.24(j), 83.30(g)-(l)).
    * Day/night toggle: night live, day signposted (REQ-PART-2 -- modelled
      for, unwritten).
    * Part D sound signals: a mode stub signposted with colregs Q-1, the
      actual open question (event-triggered vs state-derived; REQ-PART-3
      needs an ADR first).
    * Part B steering and sailing: signposted as permanently out of scope
      (REQ-PART-4, single-vessel fact record). A deliberate dead end.
  Every panel names its blocker by id. Where colregs has not scoped
  something, the panel says "not yet scoped" -- that is a legitimate
  status, not a gap to fill.
- URL-encoded app state (shareable configurations), including which
  signpost panel is open.
- i18n-first: every UI string in a message catalog from the first commit
  (pick one boring, standard library -- react-intl or Lingui -- and stay
  with it). Locale switcher in the shell, built on the same signpost
  component, each entry carrying its colregs tier and blocker:
    * English live -- and label it honestly: the shipped corpus is the
      USCG amalgamated rendition, national tier, en-US, NOT the authentic
      treaty English. It also carries four known transcription defects
      (21(a), 21(b), 23(b), 29(b) -- colregs issue #6, open). Surface both.
    * Finnish present as a draft catalog behind a visible "draft --
      awaiting native review" label (use terminology from Finnish maritime
      sources where you can find them, and leave the reviewer a glossary
      note). Note it is a DISPLAY CATALOG only: the Finnish rule-text
      corpus (Finlex, national tier) is blocked on colregs Q-7.
    * Signposted corpora with tier and blocker: fr (authentic, UNTS --
      front of queue, Q-7); en/UNTS (authentic, addable beside the USCG
      text, unscheduled); es and ru (official, deposited -- IMO's
      consolidated editions are sold publications and probably not
      reproducible, so a national gazette is the likely lawful route);
      zh (official, mechanism verified); ar (official, and the one
      sub-claim colregs flags as unconfirmed -- its source page 403'd the
      verification pass); de (national, no source or terms identified --
      not yet scoped).
    * Do NOT list Swedish. colregs has never scoped it; an earlier draft
      of design.md named it in error.
    * Say the two upstream facts out loud somewhere in the picker: licence
      (not translation effort) is what sequences this work, and it is
      answerable per language; and the first non-English corpus is itself a
      design gate upstream (colregs GATE-2).
  Rule text renders only from package corpora, with tier + source shown
  beside the modality badge. When a paragraph is missing from the chosen
  corpus, say so explicitly and show the fallback -- REQ-LANG-7 makes
  fallback the consumer's job; never substitute silently, and never present
  a mixed-corpus view as a single authoritative edition.
  Note that colregs data/i18n/ does NOT exist yet (REQ-LANG-6 unimplemented)
  -- app-side catalogs are all there is; structure yours so package catalogs
  can supersede them without a rewrite.
- Amendment-state teaching point in the rules reference: colregs verified
  (2026-08-30) that two of seven IMO amendments renumbered Part C -- 23(c)
  meant the small-vessel alternative until 2003, when WIG took that path and
  displaced it to 23(d); A.464(XII) relettered 24(g)->24(h). Show which
  consolidation is being quoted, and that a citation's meaning has moved
  before. REQ-LANG-10 is unimplemented upstream, so this is app-side prose
  citing colregs' verification doc, not data.
- Data drawer: raw fired entries, ids, cites, package version.
- Deploy: GitHub Pages via Actions on merge to main; CI runs typecheck,
  tests, build. The demo URL must be live before you finish.

Hard boundaries:
- Never edit colregs data. A data gap or bug becomes a colregs issue with
  the failing fact record; the app renders only what the data says.
- No invented rule content for signposted jurisdictions. The US Inland
  panel may state the measured shape of the delta; it must not render
  Inland light configurations, because that data does not exist. Same for
  every other signpost.
- Do not restate or resolve colregs' open questions. Q-1, Q-3, Q-7, Q-11
  are surfaced as "open, blocks X" in UI copy, never argued or answered.
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
- Every signpost panel is specific: an evaluator clicking EU CEVNI learns
  it is the largest delta on the queue and that its licence may block it
  outright, not that it is "coming soon". No panel is content-free.
- colregs' five recorded known_omissions are visible somewhere as gaps,
  not silently absent.
- A stranger with an RYA/USCG study guide could check their answers
  against this app and find no contradiction.

Finish with: the live URL; a screenshots/ set (dark colorScheme, per my
Playwright rules) covering every mode and at least three signpost panels; a
self-review doc (what's weak, what you'd do in sprint 2, any colregs issues
filed); and a board update. Verify the deployed site itself before calling
it done -- load it, click through every mode, run the fixture spot-checks
against production.
```

### Phase 2+ prompts

Deliberately unwritten. They get shaped by Mark's hands-on review of the
sprint-1 demo; writing them now would front-run the feedback the demo
exists to collect. The sprint-1 self-review doc is their seed.
