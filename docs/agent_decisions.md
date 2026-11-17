# Agent decisions

Append-only. Each entry is a call an agent made in pencil: a default it took
under the one-way-door test, with its undo. Written by `agent-decision`; the
heading is the UTC stamp, so `agent_decisions.md#<stamp>` links one entry.

### 20261016t023329z
- nav-wright B7 PR97: loft rows as short table (file, drawing); undo = revert table in MODELS.md (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t023627z
- colregs#218: subjectless_classes [traffic] lands now; undo: revert subjectless_classes and SUBJECTLESS branches (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t035215z
- C2a searoom: lock hand-edited to nav-wright 0.1.5 only, avoiding libc churn; undo: npm update nav-wright (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t040136z
- C3 searoom#116: component tests via react-dom/server, no new dev deps; undo: add testing-library+jsdom (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t040139z
- C3 searoom#116: e2e job not in ci-gate needs; undo: add e2e to needs (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t042139z
- searoom C17 PR190: random pick also on same-axes size-class change; undo: drop hull-id compare in setFacts (no PR, branch main)

### 20261016t042142z
- searoom C17 PR190: default mesh is one random outcome, no ms param; undo: exclude index 0 in pickMesh (no PR, branch main)

### 20261016t042144z
- searoom C17 PR190: 14 stale screenshots not regenerated; undo: rerun scripts/screenshots.mjs (no PR, branch main)

### 20261016t044105z
- Light-seating reference is spec stations, not Annex I (nav-wright#50 open) Undo: switch compareToSpec to Annex I seats when nav-wright#50 lands ([#192](https://github.com/mark-brannan/searoom/pull/192))

### 20261016t044108z
- Misfits listed in output, not failing the seating test Undo: assert misfit list against a committed set ([#192](https://github.com/mark-brannan/searoom/pull/192))

### 20261016t053545z
- C11: Leitner intervals 1,2,4,8,16 days; undo: edit INTERVAL_DAYS in src/state/leitner.ts (no PR, branch claude/C11-1016)

### 20261016t053548z
- C11: filters are rule and vessel family only; undo: add filter in Flashcards.tsx (no PR, branch claude/C11-1016)

### 20261016t053551z
- C11: cards are scene/cite pairs from quiz fixtures; undo: extend buildDeck (no PR, branch claude/C11-1016)

### 20261016t070218z
- C15a: tolerate two reported colregs violation classes in sweep allowlist; undo by deleting REPORTED entries (no PR, branch claude/searoom-nav-wright-colregs-scope-e02a5b)

### 20261016t073132z
- searoom#210: Intro on Sandbox only; undo: move FirstRunIntro in App.tsx (no PR, branch main)

### 20261016t073135z
- searoom#210: Escape and click-outside dismiss; undo: drop handlers in FirstRunIntro.tsx (no PR, branch main)

### 20261016t073137z
- searoom#210: Finnish draft strings for parity; undo: edit intro.* in fi.json (no PR, branch main)

### 20261016t102449z
- searoom#187: lockfile edit limited to resolved lines; undo npm update colregs colregs-engine (no PR, branch pr187-work)

### 20261016t112658z
- searoom#174: the bearing view alongside is the 2D lights-only bearing view, not a second 3D canvas Undo: swap BearingAside's body for nav-wright's BearingView (no PR, branch claude/feat174view-1016n)

### 20261016t112702z
- searoom#174: bearing view sits in the right column over the arcs, so it is beside the scene at 1280 px Undo: move {bearing} back into the scene panel in Sandbox LayoutA (no PR, branch claude/feat174view-1016n)

### 20261016t112706z
- searoom#174: bearing view hidden under 520 px rather than stacked in the pinned scene Undo: delete the .bearing-panel display:none rule in the 520px block (no PR, branch claude/feat174view-1016n)

### 20261016t112709z
- searoom#174: range fades the Profile hull hint too, so the range control is live on Profile Undo: pass no range to ProfileStage (no PR, branch claude/feat174view-1016n)

### 20261016t112712z
- searoom#174: bearing view also shows beside the Arcs tab Undo: add a view !== 'plan' condition in Sandbox (no PR, branch claude/feat174view-1016n)

### 20261022t055500z
- searoom canvas check: 'seen' = off the sea by >2/255 either way, black sky excluded; floor 0.3% -> 0.8% on the new metric; new ceiling 'bright' (>4/255 over the sea) <= 0.3% Undo: revert scripts/canvas-light.mjs and the two constants in lit-canvas.mjs and e2e.mjs ([#218](https://github.com/mark-brannan/searoom/issues/218)) (no PR, branch claude/searoom-218-postmortem-6c2019)

### 20261117t095235z
- The quiz difficulty readout says "Easy (asked at Extreme)" when a question is asked at another level than the one chosen; the Finnish string is unreviewed. Undo: change quiz.difficulty.askedAt in src/i18n/en.json and fi.json ([#252](https://github.com/mark-brannan/searoom/pull/252))

### 20261117t095239z
- Two wrong forward quiz options that draw alike on the shared hull are left as they are; the PR body states the measured counts. Undo: de-duplicate forward options on the lights as drawn on the asked hull, in forwardAt in src/engine/quiz.ts ([#252](https://github.com/mark-brannan/searoom/pull/252#discussion_r4597802477)) ([#252](https://github.com/mark-brannan/searoom/pull/252))

### 20261117t104912z
- Main was merged into the quiz difficulty branch without a conflict, so its goldens check ran against the re-taken sandbox goldens; the queue does not take a pull request whose last run is red. Undo: none needed; the queue makes the same merge ([#252](https://github.com/mark-brannan/searoom/pull/252))

### 20261117t211147z
- The USCG question source is recorded in a new docs/uscg-question-bank.md, not a section of design.md. Undo: move the file ([#288](https://github.com/mark-brannan/searoom/pull/288))

### 20261117t211155z
- Third-party Coast Guard question banks are named as not a source for the #125 cross-check. Undo: drop the bullet ([#288](https://github.com/mark-brannan/searoom/pull/288))

### 20261117t212554z
- searoom#212: one judged 'What is she?' question in five shows an unlawful display (one change: drop, add an all-round, recolour an all-round), the same in Practice, Drill and Exam; the forward direction is unchanged Undo: change UNLAWFUL_SHARE or revert ([#289](https://github.com/mark-brannan/searoom/pull/289))

### 20261117t213138z
- searoom#212: 'why' is picked from the four kinds of change #212 names (missing, extra, wrong colour, wrong place); any kind that mends the scene into some lawful view counts as right; tapping the offending light is not built Undo: require mends.length === 1 in unlawfulVariant ([#289](https://github.com/mark-brannan/searoom/pull/289))

### 20261117t213151z
- searoom#212: wrong place is built as two lights of an all-round stack trading places, checked on each vertical line's order; moving other lights (fore and aft, sidelights) waits on nav-wright drawing them moved Undo: revert ([#289](https://github.com/mark-brannan/searoom/pull/289))

### 20261117t213201z
- searoom#212: Practice and Drill stop at a wrong lawful/unlawful judgement and reveal; Exam always asks the second step so it keeps its verdict back Undo: revert judge in Quiz.tsx ([#289](https://github.com/mark-brannan/searoom/pull/289))

### 20261117t213220z
- Aspect trainer glimpse uses the 2D lights-only bearing card, not the 3D view; reads the 2026-10-17 default-view line as the Sandbox's default Undo: swap the mini bearing card for the 3D view in Aspect.tsx ([#290](https://github.com/mark-brannan/searoom/pull/290))

### 20261117t213231z
- Aspect trainer timing 2.5 s glimpse, 3 s answer, 22.5 deg tolerance; dial with you at the bottom, 0 = heading away Undo: change the constants in src/engine/aspect.ts ([#290](https://github.com/mark-brannan/searoom/pull/290))

### 20261117t215316z
- Aspect trainer seed stays out of the URL in this PR Undo: add an aspect seed slice to urlState ([#290](https://github.com/mark-brannan/searoom/pull/290))

### 20261117t215952z
- docs/syllabi.md quotes short cited syllabus lines; #122's no-copy rule read as binding the study-set files Undo: replace the quotes with paraphrase ([#291](https://github.com/mark-brannan/searoom/pull/291))

### 20261117t220004z
- ICC rule numbers in docs/syllabi.md are this research's reading of the RYA TG10-14 sample questions, labelled as such Undo: drop the ICC mapping table ([#291](https://github.com/mark-brannan/searoom/pull/291))
