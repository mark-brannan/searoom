# Release process

Releases are automated by release-please (`.github/workflows/release-please.yml`,
`release-please-config.json`, `.release-please-manifest.json`), the same
setup as [nav-wright](https://github.com/mark-brannan/nav-wright) and
[colregs-mcp](https://github.com/mark-brannan/colregs-mcp). A merge to `main`
updates a standing release pull request; merging that pull request is the
release — it bumps `package.json`, updates `CHANGELOG.md`, and on merge tags
`main` and creates a GitHub Release.

Versioning is pinned to `always-bump-patch`: every release is a patch bump of
the current `0.1.x` line, regardless of commit type, until searoom is judged
closer to feature completeness. Don't relax this to reach a particular
version number — see nav-wright's `docs/decisions.md`, 2026-09-09.

searoom is `private: true` and not published to npm; nothing dispatches a
publish job.

## Build-number offset rule (store builds)

Once the Capacitor shell lands ([#30](https://github.com/mark-brannan/searoom/issues/30)),
store builds carry two numbers that mean different things:

- **Version** (`versionName` on Android, `MARKETING_VERSION` on iOS) follows
  `package.json`'s `version`, annotated `x-release-please-version` so
  release-please bumps it on release.
- **Build number** (`versionCode` on Android, `CURRENT_PROJECT_VERSION` on
  iOS) is derived at CI time from `GITHUB_RUN_NUMBER + OFFSET` and is never
  committed. `OFFSET` is a workflow constant, raised only if a run number
  ever has to go backwards (e.g. a new repo, a re-numbered Actions history).

This keeps the store-visible version string traceable to a tagged GitHub
release while letting the build number monotonically increase independent of
how often `main` is tagged.
