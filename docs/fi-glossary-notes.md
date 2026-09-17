# Finnish draft catalog — notes for the native reviewer

`src/i18n/fi.json` is a draft display catalog (UI chrome only — never rule
text, which renders solely from package corpora). It ships behind a visible
"luonnos — odottaa äidinkielisen tarkastusta" label per REQ-LANG-8, and
must not lose that label until a named native reviewer signs off here.

## Two catalogs, two owners

Since the colregs 0.3 split (searoom#88) the Finnish a reviewer sees comes
from two places, and only one of them is fixable here:

- **colregs `data/i18n/fi.json`** owns the closed vocabularies — light
  names and modality labels today, fact values when upstream ships them.
  A correction there is a colregs pull request, not a searoom one.
- **`src/i18n/fi.json`** owns everything composed: chrome, signpost bodies,
  mode intros, fallback prose. That is the bulk of the pack.

`src/i18n/index.ts` merges them, package over app, and `i18n.test.ts` fails
if a key is ever maintained in both. Where colregs has no Finnish yet, the
app catalog supplies it; where colregs has neither language covered, English
shows through — a visible gap, by design.

## The review pack

`npm run build && npm run preview`, then:

```
npm run review-pack -- http://localhost:4173/searoom/
```

writes `fi-review-pack/` (gitignored): one printable page per string with the
English source, the Finnish draft, which catalog owns it, and a screenshot of
the screen it renders on. `verdicts.tsv` is the same content for a reviewer
who would rather work in a spreadsheet. Print it or send the folder; the
review is meant to be an afternoon, not a project.

## Terminology choices to check

The draft leans on the vocabulary of the Finnish rendition of the 1972
Convention ("Meriteiden säännöt") as it circulates in Finnish boating
literature; the Finlex text itself was **not** consulted (its reproduction
terms are unverified — colregs Q-7 — and rule text is out of scope for a
display catalog anyway). Terms most worth a native check:

| en | draft fi | owner | note |
|---|---|---|---|
| masthead light | mastovalo | colregs | |
| sidelights | sivuvalot | searoom | colregs fi has no plural form yet |
| sternlight | perävalo | colregs | |
| towing light | hinausvalo | colregs | |
| all-round light | ympäri näköpiirin näkyvä valo | colregs | long; is "ympärinäkyvä valo" acceptable in UI? |
| flashing light | vilkkuvalo | searoom | |
| required / permitted | pakollinen / sallittu | colregs | modality badge; deliberately not the modal verb |
| not under command | ohjailukyvytön | searoom | |
| restricted in ability to manoeuvre | ohjailukyvyltään rajoitettu | searoom | check against Finlex phrasing |
| constrained by draught | syväyksensä rajoittama | searoom | |
| making way through the water | liikkuu veden halki | searoom | is "kulkee vauhtia veden halki" better? |
| underway | kulussa | searoom | |
| aground | karilla | searoom | |
| moored | kiinnitettynä | searoom | |
| port/starboard | paapuuri/tyyrpuuri | searoom | "vasen/oikea" rejected as landlubber usage — confirm |
| relative bearing | suhteellinen suuntima | searoom | |
| lawful display | laillinen valoyhdistelmä | searoom | coined for the UI; better ideas welcome |
| jurisdiction | sääntöalue | searoom | coined; "lainkäyttöalue" is the legal term but reads wrong for waters |
| corpus | korpus | searoom | kept as-is; the UI teaches the term |
| tier (authentic/official/national/community) | todistusvoimainen / virallinen / kansallinen / yhteisö | searoom | ADR 0003's ladder — the first is the load-bearing one |
| signposted | viitoitettu | searoom | coined for the breadth surface |
| fact record | tilannetietue | searoom | |
| entry | soveltamismerkintä | searoom | long; "merkintä" alone where context allows |

Mode names (Harjoittelu / Tunnista / Visa / Säännöt / Äänimerkit) are UI
labels, not rule vocabulary — free to improve.

## What changed for this round

The signpost bodies, blocker prose and mode intros were previously left
untranslated on purpose — better a visible English gap than fluent
wrongness. searoom#88 reverses that for the review round: they are drafted
now so the reviewer has something concrete to correct, and the draft label
carries the honesty instead. Read them as proposals, not as text that
someone already stood behind. Long dense passages — `sp.us-inland.p1`–`p4`,
`rules.amendment.p2`, `rules.corpusNote` — are where a machine draft is most
likely to read fluently and mean something slightly off; they are worth more
of the afternoon than the button labels are.
