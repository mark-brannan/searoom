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
