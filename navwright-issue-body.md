`package.json` still ships `nav-wright/style.css` (`src/style.css`) as a default rendering, alongside the seven class names and eight `--hull-fill`/`--sea-night`-style custom properties consumers can already supply on their own. That's the ruling in [docs/decisions.md](https://github.com/mark-brannan/nav-wright/blob/main/docs/decisions.md), made 2026-09-09: ship the default, don't wait for a second consumer to justify it.

The ruling was explicitly cheap to change for as long as the package stays untagged — dropping the file, or reshaping which classes/properties it covers, costs nothing before anyone has pinned a version against it. That stops being true the moment nav-wright is tagged v0.1.0: from then on, renaming a class or a custom property, or removing the stylesheet, is a breaking change for every consumer.

Revisit before that tag goes out. Recommendation: keep shipping the stylesheet as-is unless a second real consumer of the renderer (searoom's own extraction doesn't count) has surfaced needing a different contract shape — same posture as [colregs-engine#48](https://github.com/mark-brannan/colregs-engine/issues/48)'s versioning-strategy revisit.

Until then, change the stylesheet freely — this issue is the trigger to stop doing that, not a standing prohibition.
