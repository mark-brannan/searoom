# Security Policy

## Supported versions

Searoom is an app, not a published package. Only `main` and the live demo it
deploys to are supported; there are no maintenance branches.

| What | Supported |
| ---- | --------- |
| `main` / <https://mark-brannan.github.io/searoom/> | yes |
| a fork or an older deploy | no — pull `main` first |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.** Report it
privately through GitHub:

1. Go to
   [Security → Report a vulnerability](https://github.com/mark-brannan/searoom/security/advisories/new).
2. Describe what you found, ideally with the app state (mode, situation, and
   any URL) that reproduces it.

You should get an acknowledgement within a week. This is a spare-time project
maintained by one person, so a fix may take longer than that — you will be told
where it stands rather than left waiting. If a report is valid and you want
credit, you will be named in the advisory.

If you get no response at all within two weeks, open a public issue saying only
that you are waiting on a private report — no details — and it will be picked
up.

## What is in scope

Searoom is a static, client-only app: everything runs in the visitor's
browser, and the only state is whatever they configure in the UI or carry in
the URL.

- **The client itself.** Anything in `src/` that lets app state — a situation
  the visitor configures, a quiz answer, a value round-tripped through the
  URL — reach `dangerouslySetInnerHTML`, an `eval`-like sink, or an attribute
  that executes rather than displays.
- **The 3D scene** (`src/render`, `public/models`). A crafted or oversized
  asset that hangs or crashes the Three.js renderer, or a scene-graph value
  that escapes the canvas into the page, is in scope.
- **The deployment pipeline** (`deploy.yml`) and the credentials it uses to
  publish to GitHub Pages.
- **Anything served from the deployed origin that shouldn't be** — a stray
  secret, an internal note, a build artifact that leaked in.

## What is out of scope

- **The underlying rules content.** A wrong light, display, or rule citation
  belongs to [colregs](https://github.com/mark-brannan/colregs/security) or
  [colregs-engine](https://github.com/mark-brannan/colregs-engine/security);
  a rendering bug in a scene belongs to
  [nav-wright](https://github.com/mark-brannan/nav-wright/security) once
  searoom consumes it.
- **Quiz or study-tool correctness.** A wrong "correct answer," a broken
  sandbox control, or a display bug is an ordinary bug: open a public issue
  with the situation that produced it.
- **Navigational use.** Searoom is a study tool, not navigation equipment,
  and must not be used to make collision-avoidance decisions at sea.

## Notes on how this app is built

- Client-only: there is no server, no account system, and no user data ever
  leaves the browser. `localStorage`, if used, is scoped to the visitor's own
  browser.
- Depends on `colregs` and `colregs-engine` for content and evaluation; it
  invents no rules data of its own.
- `npm test` runs against fixtures with the network unavailable; screenshot
  and end-to-end checks (`scripts/screenshots.mjs`, Playwright) run in CI
  against the built app, not the deployed origin.
