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
