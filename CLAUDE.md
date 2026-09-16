# Working conventions — searoom

This is a visual webapp. A diff without something to look at isn't a
finished turn.

- **Whenever you change anything rendered** (components, scenes, styles,
  the 3D model), leave a dev or preview server running and tell the user
  the URL and the worktree path it's serving from — see
  [README.md](README.md#running-this-project) for the commands. Don't just
  report the change; give them something to look at.
- This is enforced by a Stop hook, `.claude/hooks/preview-gate.sh`: when
  the branch touches rendered files and nothing is serving this worktree,
  it starts `npm run dev` on a free port and blocks the turn once with the
  URL, so you have to relay it. Pid, port and log sit in `.claude/preview/`
  (gitignored, one per worktree). `sh .claude/hooks/preview-gate.test.sh`
  runs its tests.

## Stage: pre-consumer

Private and unpublished. Zero users — not few, none. This is the freest repo in
the family and should be treated that way. Until Solace says otherwise that is a
fact, not an estimate, and not an agent's to re-evaluate. The family stanza in
colregs `AGENTS.md` is the long form; this is what it means here.

**Breaking changes need no ceremony.** Rip out a screen, change the data flow,
drop a feature, restructure the routes or the state, take a dependency bump that
forces a rewrite — no migration path, no feature flag, no fallback kept alive, no
paragraph weighing who might be hurt. Nobody is running this. `git revert` is the
migration path.

**Stub as the safe default.** A screen named in `docs/design.md` gets a route and
a placeholder the same day. An empty view that exists beats a finished view that
doesn't.

**Where the rigour goes instead.** That what the user is shown is *right* — the
advisory, the lights, the model. Everything around it is disposable.

**The store release is not today.** App-store obligations, privacy text, pricing,
liability wording and the rest of the open rulings are real but far off, and none
of them licenses caution in the code now. An agent that finds itself designing for
a launch that has not been scheduled is designing for nobody. No disclaimers, no
"may change", no option closed on risk grounds — those are Solace's calls; write
the card.
