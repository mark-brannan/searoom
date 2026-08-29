# Searoom

**See the rules of the road.** Configure any vessel's situation, see her
lights from any bearing, and read the exact rule paragraph that says so.

Searoom is an interactive study tool for the COLREGS — starting with
navigation lights (Part C), aiming at the whole rules of the road: day
shapes, sound signals, conduct rules, and eventually scenario ("ROR sim")
training. International rules first; US Inland, Canada, and EU CEVNI are
modelled for and land as the data does.

**Status: pre-build.** The product design is settled — see
[docs/design.md](docs/design.md) — and the first sprint (sandbox, identify,
quiz, rules reference, live demo) is next.

## The family

Searoom is the consumer face of a small stack, each piece its own package:

| package | role |
|---|---|
| [colregs](https://github.com/mark-brannan/colregs) | the rules as language-neutral data — paragraphs, lights, applicability, fixtures |
| [colregs-engine](https://github.com/mark-brannan/colregs-engine) | evaluation: predicates → entries → relations → lawful displays |
| [nav-wright](https://github.com/mark-brannan/nav-wright) | SVG rendering: vessels, lights, arcs, scenes |
| **searoom** | the app: study, quiz, identify, reference |

Engine and renderer are being built inside this repo first and extracted
once they earn a second consumer.

## Not for navigation

Searoom is a study tool. It is not navigation equipment and must not be
used to make collision-avoidance decisions at sea.
