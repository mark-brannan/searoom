# USCG rules-of-the-road questions — source and terms

The source for the cross-check in
[#125](https://github.com/mark-brannan/searoom/issues/125): run the app's
engine against questions the US Coast Guard itself sets, and treat every
disagreement as a data or rendering finding. This page says what the
Coast Guard publishes, on what terms, and what we can and cannot use.

## What is public

There is no public question bank. The National Maritime Center (NMC)
publishes **sample examinations**, one set a year; the live bank stays
closed.

| What | Public? | Authority |
|---|---|---|
| The live bank, its answers, selection and miss rates | No | [46 U.S.C. 7510(a)](https://www.law.cornell.edu/uscode/text/46/7510) |
| Retired or chosen questions, with answers, for public exam prep | At the Coast Guard's discretion | [46 U.S.C. 7510(b)](https://www.law.cornell.edu/uscode/text/46/7510) |
| A sample examination and an outline of topics | Yes, every year | [46 U.S.C. 7116(a)](https://www.law.cornell.edu/uscode/text/46/7116) |

Exam-prep vendors report that the NMC stopped releasing its question
pool to mariners in 2014 and now posts new samples each year, usually
around October ([LAPWARE](https://www.lapware.org/site/tag/nmc/)). That is
second-hand; the statute above is the primary source.

## The rules-of-the-road samples

Posted on the NMC's examinations page,
<https://www.dco.uscg.mil/nmc/examinations/>, as PDFs with a marked
answer and the illustrations the questions cite:

| Module | Covers | URL |
|---|---|---|
| Q100 | Rules of the Road, International and Inland | <https://www.dco.uscg.mil/Portals/9/NMC/pdfs/examinations/q100_ror_inland-international.pdf> |
| Q300 | Rules of the Road, Inland | <https://www.dco.uscg.mil/Portals/9/NMC/pdfs/examinations/q300_rules_of_the_road-inland.pdf> |
| Q301 | Rules of the Road, Inland | <https://www.dco.uscg.mil/Portals/9/NMC/pdfs/examinations/q301_rules_of_the_road-inland.pdf> |
| Q450 | Navigation General and Rules of the Road | <https://www.dco.uscg.mil/Portals/9/NMC/pdfs/examinations/q450_nav_general_and_ror.pdf> |

Each module is one sample exam, not a bank: the number we can ever check
against is the number of questions in these PDFs, refreshed yearly.

## Terms

The samples are works of the US Government, so they carry no US
copyright ([17 U.S.C. 105](https://www.law.cornell.edu/uscode/text/17/105))
and the repo may store, quote and test against them. One limit: third-party
"Coast Guard question" sites (Quizlet decks, commercial banks) are not the
NMC's text and carry their own terms. They are not a source here.

## Coverage

Not counted yet. The four PDFs are not in the repo; a copy fetched in a
browser and committed unblocks step 2 of #125: mapping each
lights-and-shapes and steering-and-sailing question to a fact record or
situation record, and counting the rest.
