# Syllabi — sources and terms

Research for searoom#122, step 1: for each exam a study set will map, what
it names from the collision regulations and what its source document lets
us reproduce. A study set (step 2) carries paragraph ids and entry ids only;
nothing in this repo copies syllabus wording beyond the short quotes below,
which are cited so a reviewer can check the reading.

Checked 2026-11-17. "Read" means the document's text was seen; "secondary"
means only a third party's copy was seen; "not reached" means the fetch
failed and what is written rests on search results.

## What each syllabus names

| Exam | Rules named | Source seen | Read? |
|---|---|---|---|
| RYA Day Skipper (theory) | Steering and sailing rules 5, 7, 8, 9, 10 and 12–19; "General rules (all other rules)" | RYA syllabus wording as reproduced by Classic Sailing (syllabus section 5) | secondary |
| RYA Coastal Skipper / Yachtmaster Offshore (theory) | "A sound knowledge of the International Regulations for Preventing Collisions at Sea, except Annexes 1 and 3" | Syllabus as reproduced by a training centre (PDF dated 2024-04-16, section 13) | secondary |
| ICC (UNECE Resolution 40) | Coastal waters: "the Regulations for Preventing Collisions at Sea, including aids to navigation"; inland: CEVNI. No rule numbers. | ECE/TRANS/SC.3/147/Rev.4, Annex I, para 3.1 | read |
| ICC, as the RYA examines it | Oral questions, no rule numbers: see the next table | RYA TG10-14, *Guidance Notes for ICC Test Centres*, rev. May 2021, Appendix 1 | read |
| USCG OUPV near-coastal and Master ≤100 GRT | Module Q100 "Rules of the Road: International and Inland". NMC publishes no paragraph-level list. | NMC exam pages for ONC06/ONC07; the question bank is the de facto syllabus | not reached (dco.uscg.mil returns 403 to the fetcher) |

### ICC: the RYA's sample questions, mapped to rules

The rule column is this research's reading, not the RYA's.

| Sample question (paraphrased) | Rules |
|---|---|
| Keep a lookout at all times | 5 |
| Speed in fog or through a fleet | 6 |
| A steady compass bearing means risk of collision | 7 |
| Give-way and stand-on, including when the stand-on vessel acts | 12–17 (16, 17 named) |
| Small craft in a narrow channel; crossing one | 9 |
| One short and five short blasts | 34 |
| Signalling distress with no radio; orange smoke | 37, Annex IV |
| *Coastal and all waters:* crossing a traffic separation scheme | 10 |
| *Coastal and all waters:* your own lights; identifying four or more vessels by lights and aspect | 20–31 (the RYA's figure picks the vessels; it did not survive text extraction) |
| *Coastal and all waters:* your own fog signal; one long and two short | 35 |

## Reproduction terms

| Source | Terms | What a study set may take |
|---|---|---|
| RYA syllabi (Day Skipper, Coastal / Yachtmaster), published in the RYA's syllabus and logbook | © Royal Yachting Association; the RYA's own copy was not located online | Rule and paragraph numbers only |
| RYA TG10-14 ICC guidance | "© Royal Yachting Association" on every page. CEVNI answer papers are withheld "for obvious reason" | Rule numbers from our own reading; no question text |
| UNECE Resolution 40 | A UN document. Its reproduction terms were not checked; it names no rules, so nothing is taken from it | Nothing needed |
| USCG NMC question bank and samples | U.S. federal works, which 17 U.S.C. §105 leaves outside copyright (general law; the NMC page itself was not reached) | Ids freely. The question text is reproducible too, which no RYA source allows |

## What this means for step 2

- **USCG is the cleanest first set.** Q100 examines the whole of the
  Rules, International and Inland. The USCG corpus is live. The Inland
  corpus (`us/inland`) is live and has no paragraphs yet, so an
  Inland-only paragraph has nothing to point at until it does.
- **RYA has two levels, not one.** Day Skipper names a subset of
  Part B; Coastal / Yachtmaster names everything but Annexes 1 and 3.
  That is two study sets, or one set with a level.
- **The ICC set is thin and coastal.** The resolution names no rules.
  The RYA's sample questions are the only rule-level evidence, and they
  are examples, not a list.
- **Still open:** the RYA's own copy of both syllabi (to move "secondary"
  to "read"), and the NMC Q100 page (to read whether Annexes are examined).

## Sources

- Classic Sailing, "RYA Day Skipper Theory Syllabus":
  https://classic-sailing.co.uk/article/rya-day-skipper-theory-syllabus
- RYA Coastal Skipper / Yachtmaster Offshore theory syllabus (copy, 2024-04-16):
  https://www.pelagic.co.uk/pdfs/2024_04_16_RYACoastSkip_YMOffshore_Theory_Syllabus.pdf
- RYA TG10-14, Guidance Notes for ICC Test Centres (rev. May 2021):
  https://www.rya.org.uk/media/vtonfddu/tg10-14_icc_test_centres_guidance_revised_may2021.pdf
- UNECE Resolution No. 40, ECE/TRANS/SC.3/147/Rev.4 (copy published by the Czech State Navigation Administration):
  https://sps.gov.cz/downloads/doklady-osob/Rezoluce_40_en_new2.pdf
- NMC exam ONC07 module list: https://www.dco.uscg.mil/nmc/exams/ONC07-Q100-Q172/
- NMC Q100 sample exam: https://www.dco.uscg.mil/Portals/9/NMC/pdfs/examinations/q100_ror_inland-international.pdf
