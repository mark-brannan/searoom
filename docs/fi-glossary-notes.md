# Finnish draft catalog — notes for the native reviewer

`src/i18n/fi.json` is a draft display catalog (UI chrome only — never rule
text, which renders solely from package corpora). It ships behind a visible
"luonnos — odottaa äidinkielisen tarkastusta" label per REQ-LANG-8, and
must not lose that label until a named native reviewer signs off here.

## Terminology choices to check

The draft leans on the vocabulary of the Finnish rendition of the 1972
Convention ("Meriteiden säännöt") as it circulates in Finnish boating
literature; the Finlex text itself was **not** consulted (its reproduction
terms are unverified — colregs Q-7 — and rule text is out of scope for a
display catalog anyway). Terms most worth a native check:

| en | draft fi | note |
|---|---|---|
| masthead light | mastovalo | |
| sidelights | sivuvalot | |
| sternlight | perävalo | |
| towing light | hinausvalo | |
| all-round light | ympäri näköpiirin näkyvä valo | long; is "ympärinäkyvä valo" acceptable in UI? |
| flashing light | vilkkuvalo | |
| not under command | ohjailukyvytön | |
| restricted in ability to manoeuvre | ohjailukyvyltään rajoitettu | check against Finlex phrasing |
| constrained by draught | syväyksensä rajoittama | |
| making way through the water | liikkuu veden halki | is "kulkee vauhtia veden halki" better? |
| underway | kulussa | |
| aground | karilla | |
| moored | kiinnitettynä | |
| port/starboard | paapuuri/tyyrpuuri | "vasen/oikea" rejected as landlubber usage — confirm |
| relative bearing | suhteellinen suuntima | |
| lawful display | laillinen valoyhdistelmä | coined for the UI; better ideas welcome |

Mode names (Harjoittelu / Tunnista / Visa / Säännöt / Äänimerkit) are UI
labels, not rule vocabulary — free to improve.

Untranslated keys fall back to English by design; the long signpost-panel
bodies were deliberately left for the reviewer rather than machine-drafted
(REQ-LANG-8's spirit: better a visible gap than fluent wrongness).
