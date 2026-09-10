# Searoom

**See the rules of the road.** Configure any vessel's situation, see her
lights from any bearing, and read the exact rule paragraph that says so.

Searoom is an interactive study tool for the COLREGS — starting with
navigation lights (Part C), aiming at the whole rules of the road: day
shapes, sound signals, conduct rules, and eventually scenario ("ROR sim")
training. International rules first; US Inland, Canada, and EU CEVNI are
modelled for and land as the data does.

**Live demo: <https://mark-brannan.github.io/searoom/>** — sandbox,
identify, quiz, rules reference, and the signposted breadth surface, from
sprint 1. The product design is [docs/design.md](docs/design.md); the
sprint's own notes are [docs/self-review.md](docs/self-review.md).

## The family

Searoom is the consumer face of a small stack, each piece its own package:

| package | role |
|---|---|
| [colregs](https://github.com/mark-brannan/colregs) | the rules as language-neutral data — paragraphs, lights, applicability, fixtures |
| [colregs-engine](https://github.com/mark-brannan/colregs-engine) | evaluation: predicates → entries → relations → lawful displays |
| [nav-wright](https://github.com/mark-brannan/nav-wright) | SVG rendering: vessels, lights, arcs, scenes |
| **searoom** | the app: study, quiz, identify, reference |

Engine and renderer are being built inside this repo first and extracted
once they earn a second consumer. Decisions for the whole family are ADRs in
colregs `docs/adr/`, one sequence; a bare `ADR NNNN` here means colregs, and
this repo keeps no ADRs of its own.

## Running this project

`npm run dev` starts Vite's dev server; `npm run build && npm run preview`
serves a production build. Either prints the URL it's listening on — pass
`--port` if the default is taken, which it usually is when more than one
worktree is running at once:

```
npx vite preview --port 4181
```

Working in a git worktree (`.claude/worktrees/<name>`)? Run the command from
inside it — Vite serves whatever worktree it's launched from, not `main`.

## Not for navigation

Searoom is a study tool. It is not navigation equipment and must not be
used to make collision-avoidance decisions at sea.

## License

AGPL-3.0. The layered licensing is deliberate: the data
([colregs](https://github.com/mark-brannan/colregs), MIT) and the evaluator
stay permissive so the ecosystem can build on them; the app and renderer are
AGPL so derivatives stay open. The rules of the road themselves are public
law and carry no copyright claim here.
