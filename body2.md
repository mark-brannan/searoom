Refs #113. Not closing: the new colregs data breaks tests (finding below).

## Findings
- `excluded` was already gone from src/evaluate.ts; only README still described it. README cleaned.
- `npm update colregs` moves the pin 28e28da -> 46d5c3f (colregs 0.3.4). 9 test files/cases fail. Root cause: colregs facts.json now declares `fact:seaplane` (Rule 31) and the engine's FACT_SPEC does not ("fact axis fact:seaplane is referenced by a predicate but not declared"). Failing: fixtures, situation-fixtures, operations-conformance (Rule 31 seaplane), text-withheld, enumerate-shards, enumerate-modifier-refinement, z3-encoding, displays (towing 300 m), docs prose-budget.
- Data not patched, budgets not raised. Needs engine-side support for `fact:seaplane` and a look at the towing and prose-budget failures; beyond "drop excluded". Needs human (label needs-human absent in repo).

Local: npm test red (9 failed, 1014 passed). Conformance sample not run (suite fails at load). No goldens moved.

Demo: gh pr checkout claude/A10-1016 && npm ci && npm test
Head: 7f2c67bc82e9b6fad5fff4f60363207f590a963e

## Pencil:
- Bumped pin via npm update colregs, committed lock. Undo: revert the commit.
- Left failures unfixed, flagged for a human. Undo: n/a, close PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
