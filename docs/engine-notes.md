# Engine notes — display composition semantics

colregs defines predicate semantics and the five relations, and leaves
final composition to the consumer (REQ-CONS-3). The evaluator in
`src/engine/evaluate.ts` implements the predicate layer exactly as the
colregs README states it, replaying all 53 fixture cases verbatim in CI.
Composing applied entries into *complete lawful displays* required a
handful of decisions the data does not make. They are recorded here so
they can be reviewed as decisions, not archaeology. Each is tested in
`src/engine/displays.test.ts`.

## Applied-entry layer (from the data, no decisions)

- An entry applies when every constraint in `when` is satisfied; an
  absent fact never satisfies a constraint.
- Numeric constraints are `{gte, gt, lte, lt}`; a list is membership;
  anything else is equality.
- `activity:ram_underwater` is a refinement of `activity:ram`
  (facts.json): predicates written for `ram` also read it.
- `modality: conditional` resolves through `modality_by` against the
  fact record (first matching branch).

## Composition decisions (this app's, documented as such)

1. **Exempts relieve, they don't forbid.** An applied entry exempted by
   a `rel:exempts` entry (30(e)) is removed from every display and
   reported as exempted. The UI shows it struck through, not silently
   absent.

2. **A required entry's `rel:overrides` displaces.** 26(b)(i) is
   `shall` and overrides 30(a)/30(b): the anchor lights are removed from
   composition and reported as overridden, with the overriding id named
   — that is Rule 26(a)'s "only the lights prescribed in this Rule".
   `rel:excludes` stays a co-occurrence constraint between alternatives
   (25(b) vs 25(c)), never a removal.

3. **Alternatives branch.** An applied entry whose `rel:in_lieu_of`
   references applied entries is a choice: in a display it replaces its
   references; out of it, they stand. Two chosen alternatives with
   overlapping replacement targets are alternatives to each other and
   never co-occur. This yields exactly the three displays for the 12 m
   sloop (25(a) | 25(b) | 25(a)+25(c)).

4. **`rel:includes` imports stand on their own.** An import's carrier
   gates only its own lights: Rule 28's three reds are `may`, but the
   Rule 23 lights it imports stay `shall` (the data's own note). 27(f)'s
   "as appropriate" branch between the Rule 23 running lights and the
   Rule 30 anchor lights is colregs' own `rel:conditional_includes` as
   of 0.2.0 — the import itself is gated by `fact:position` in the data,
   not by a composition decision here.

5. **`one_of` chooses exactly one** (30(d): anchor lights per 30(a) *or*
   30(b)) — or none, when the carrier is `may` (25(d)(ii): sailing
   lights, or failing that the carrier's own torch; choosing an option
   replaces the carrier's own lights). An option that is itself applied
   satisfies the group by its own dynamics. A non-applied option is
   available only if its scalar gates (30(b)'s "less than 50 metres")
   hold for this vessel; its situation axes are deliberately overridden
   by the carrier's redirect.

6. **Relation-free `may` entries are optional additions**, not display
   multipliers: the second masthead below 50 m, deck lights below
   100 m, the trawler's optional masthead, Rule 28's three reds. They
   are rendered as toggleable additions beside the display chips. A
   `may` entry that participates in relations (25(c)'s includes and
   excludes) is a display alternative and multiplies.

7. **Displays are deduplicated** by entry set + light fingerprint, and
   every display records which choices produced it — that is the data
   behind the elimination UX.

8. **Order is the engine's, not this app's.** `displays[]` arrives ranked
   most specific concession first, general rule last — a `may` entry with
   a scalar gate and `rel:in_lieu_of` outranks its base (colregs-engine
   #137, ruled in searoom #152). So display 0 for a 10 m boat at anchor is
   30(b), not 30(a), and the app simply opens on index 0. Asserted here in
   `src/engine/displayRanking.test.ts` so an engine regression fails in
   this repo too. Each chip leads with what that display shows — its
   lights, in the package catalog's words — and the entry's cite, modality
   and gate follow as the why; a lawful addition is named the same way
   (ruled on #158).

If any of these turn out to disagree with the data's intent, that is a
colregs conversation (an issue with the failing fact record), not a
quiet app-side patch.

## Sweep invariants

`src/engine/sweep.test.ts` (searoom #123) evaluates the engine over a grid of
fact records: every propulsion, activity and position value, making way, the
COLREGS length thresholds (7, 12, 20, 50, 100 m and a value either side), the
tow-length and max-speed bands, day and night, good and restricted visibility,
under `intl` and `us/inland`. About 21,000 records, roughly a second and a
half, so it runs on every push with the rest of `npm test`. Across the grid:

1. Where an entry that shows a light or a shape fires, a display exists, and
   no display sitting beside others is empty (it names entries and shows a
   light or a shape). A lone empty display is the engine's "nothing to show".
2. No display repeats a light (same spec, entry and import).
3. At most one sternlight per display.
4. Sidelights are paired (starboard and port counts equal), or come as the
   combined `light:sidelights`, never both.
5. Entries a `rel:excludes` relation separates are never in one display.
6. A standing `shall` entry (not exempted, overridden or replaced by a
   chosen alternative) is in every display.
7. `known_omissions` is present and every record carries cite, what and why
   (the Rules reference renders them).

A violation is a colregs issue carrying the failing record, not an app-side
patch. Classes already reported are listed in the test with their colregs
issue and the records they cover, and tolerated until colregs fixes them; the
same class on any other record fails, and a listed class that stops occurring
fails the test, so the line comes out with the fix.
