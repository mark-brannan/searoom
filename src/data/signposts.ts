// The breadth surface: one record per signposted jurisdiction, rule part
// and rule-text corpus.
//
// What colregs already declares — which jurisdictions and corpora it ships,
// their tier, edition and licence status — is generated from colregs' own
// data (`data/corpora.json`, `data/editions.json`, `data/applicability.json`
// via `./jurisdictions` and `./corpusText`, both already-generated modules)
// so that a colregs version bump that adds a corpus or a jurisdiction shows
// up here with no edit to this file. Only status, tier, edition and corpus
// coverage are generated this way; narrative prose (why CEVNI is risky, what
// harmonisation buys) stays app-side, keyed to a colregs id so
// `signposts.test.ts` can check it against the package's own declarations.
//
// A candidate — a jurisdiction or corpus colregs has not shipped yet — has
// no generated row to draw from, so it stays hand-authored here: status,
// blockers and prose all app-side, with the blocker id checked against
// colregs' own `Q-*`/`REQ-*`/`GATE-*` registry (`./colregsRequirements`) so
// a resolved or renumbered blocker fails a test instead of lingering as
// stale prose. The moment colregs actually ships one, it starts appearing
// in the generated set and is filtered out of the candidate list below —
// "generated" always wins over "candidate" for the same id.
//
// "not-scoped" is a legitimate status, not a gap to fill.

import { applicability } from './colregs';
import {
  corpora as shippedCorpora,
  editionOf,
  jurisdictionOf,
  type Corpus,
} from './corpusText';
import {
  BASE_JURISDICTION,
  JURISDICTION_IDS,
  jurisdictionMeta,
} from './jurisdictions';

export type SignpostStatus =
  | 'live'
  | 'measured' // delta measured against the primary source, blocked
  | 'ranked' // ranked on the queue, not measured
  | 'modelled-for' // the data model accommodates it; nothing written
  | 'undecided' // an open question must resolve first
  | 'out-of-scope' // deliberately never
  | 'not-scoped'; // colregs has not scoped it at all

export interface Blocker {
  /** colregs' identifier: Q-1, Q-3, Q-7, REQ-PART-4, GATE-2 … or a colregs issue, `#98` */
  id: string;
  /** one-line description key in the message catalog */
  textKey: string;
}

export interface Signpost {
  id: string;
  kind: 'jurisdiction' | 'part' | 'corpus';
  status: SignpostStatus;
  /** label key in the message catalog — set for a hand-authored or narrated row */
  labelKey?: string;
  /** a resolved literal label — set for a generated row with no app narrative yet */
  label?: string;
  /** body paragraph keys in the catalog */
  bodyKeys: string[];
  blockers: Blocker[];
  link: string;
  /** corpus rows only (ADR 0003 tiers) */
  tier?: 'authentic' | 'official' | 'national' | 'community';
  language?: string;
  /** a live corpus: its id in colregs data/corpora.json */
  corpusId?: string;
}

const COLREGS = 'https://github.com/mark-brannan/colregs';
const REQS = `${COLREGS}/blob/main/docs/requirements.md`;
const ADR1 = `${COLREGS}/blob/main/docs/adr/0001-name-and-jurisdiction-model.md`;
const ADR3 = `${COLREGS}/blob/main/docs/adr/0003-language-as-a-dimension.md`;
const VERIF = `${COLREGS}/blob/main/docs/verification/2026-08-30-q6-q8.md`;
const TEXT = `${COLREGS}/blob/main/data/text`;
const DESIGN = 'https://github.com/mark-brannan/searoom/blob/main/docs/design.md';

// ------------------------------------------------------------ jurisdictions

/** Narrative kept app-side for a jurisdiction colregs already ships. */
const JURISDICTION_NARRATIVE: Record<
  string,
  { labelKey: string; bodyKeys: string[] }
> = {
  intl: {
    labelKey: 'sp.intl.label',
    bodyKeys: ['sp.intl.p1', 'sp.intl.p2'],
  },
  // Live: bodyKeys stay empty. Its measured-delta paragraphs
  // (sp.us-inland.p1-p4) moved to `jurisdictionExplainers` below, beside its
  // rule text in the Rules reference, once it stopped being a panel about
  // work not yet done.
  'us/inland': {
    labelKey: 'sp.us-inland.label',
    bodyKeys: [],
  },
};

/** Every jurisdiction colregs' own data carries (`./jurisdictions`, generated). */
const generatedJurisdictions: Signpost[] = JURISDICTION_IDS.map((id) => {
  const narrative = JURISDICTION_NARRATIVE[id];
  const meta = jurisdictionMeta(id);
  return {
    id: id.replace('/', '-'),
    kind: 'jurisdiction',
    status: 'live',
    labelKey: narrative?.labelKey,
    label: narrative ? undefined : (meta?.instrument ?? id),
    bodyKeys: narrative?.bodyKeys ?? [],
    blockers: [],
    link: id === BASE_JURISDICTION ? COLREGS : ADR1,
  };
});

const generatedJurisdictionIds = new Set(JURISDICTION_IDS);

/**
 * Jurisdictions on colregs' queue (ADR 0001) that colregs has not shipped
 * data for yet — hand-authored until it does. Q-3 (jurisdiction licence
 * terms) was **verified 2026-09-05** for every one of these except CEVNI
 * (`docs/requirements.md` Q-3); none of them is blocked on licence today,
 * only on a delta not yet being measured, so none carries a blocker.
 */
const candidateJurisdictionsRaw: Signpost[] = [
  {
    id: 'ca-inland',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.ca-inland.label',
    bodyKeys: ['sp.ca-inland.p1'],
    blockers: [],
    link: ADR1,
  },
  {
    id: 'eu-cevni',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.eu-cevni.label',
    bodyKeys: ['sp.eu-cevni.p1', 'sp.eu-cevni.p2'],
    // Q-3 stays open for CEVNI specifically — its *text* licence, not the
    // jurisdiction delta, which ADR 0010 says may be modelled with the text
    // withheld. See sp.eu-cevni.p2.
    blockers: [{ id: 'Q-3', textKey: 'blocker.q3.cevni' }],
    link: ADR1,
  },
  {
    id: 'de-binnen',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.de-binnen.label',
    bodyKeys: ['sp.de-binnen.p1'],
    blockers: [],
    link: ADR1,
  },
  {
    id: 'uk',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.uk.label',
    bodyKeys: ['sp.uk-au.p1'],
    blockers: [],
    link: ADR1,
  },
  {
    id: 'au',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.au.label',
    bodyKeys: ['sp.uk-au.p1'],
    blockers: [],
    link: ADR1,
  },
];
const candidateJurisdictions: Signpost[] = candidateJurisdictionsRaw.filter(
  (c) => !generatedJurisdictionIds.has(c.id.replace('-', '/')),
);

export const jurisdictions: Signpost[] = [
  ...generatedJurisdictions,
  ...candidateJurisdictions,
];

// ---------------------------------------------------------------- corpora

/** Narrative + stable id kept app-side for a corpus colregs already ships. */
const CORPUS_NARRATIVE: Record<
  string,
  { id: string; labelKey: string; bodyKeys: string[] }
> = {
  'intl@2016.en-US.uscg': {
    id: 'en-US-uscg',
    labelKey: 'sp.en-us.label',
    bodyKeys: ['sp.en-us.p1', 'sp.en-us.p2'],
  },
  'intl@2016.es.boe': {
    id: 'es',
    labelKey: 'sp.es.label',
    bodyKeys: ['sp.es.p1', 'sp.es.p2'],
  },
  'intl@1977.fi.finlex': {
    id: 'fi-finlex',
    labelKey: 'sp.fi.label',
    bodyKeys: ['sp.fi.p1', 'sp.fi.p2'],
  },
};

/** Every corpus colregs ships (`./corpusText`, generated from `data/corpora.json`). */
const generatedCorpora: Signpost[] = shippedCorpora.map((c: Corpus) => {
  const narrative = CORPUS_NARRATIVE[c.id];
  const edition = editionOf(c);
  return {
    id: narrative?.id ?? `${c.language}-${c.source_id}`,
    kind: 'corpus',
    status: 'live',
    tier: c.tier,
    language: c.language,
    corpusId: c.id,
    labelKey: narrative?.labelKey,
    // No narrative yet: a plain label built from the corpus's own metadata,
    // same as the source/rights lines SignpostPanel already renders
    // straight from live corpus data — untranslated is correct here
    // (REQ-LANG-1: display language and rule-text corpus are independent).
    label: narrative
      ? undefined
      : `${c.language} — ${c.source_id.toUpperCase()} (${jurisdictionOf(c)}@${edition ? c.edition.split('@')[1] : '?'})`,
    bodyKeys: narrative?.bodyKeys ?? [],
    blockers: [],
    link: `${TEXT}/${c.edition.replace('@', '/')}/${c.language}.${c.source_id}.json`,
  };
});

const generatedCorpusIds = new Set(shippedCorpora.map((c) => c.id));

/**
 * Corpora on colregs' language queue (Q-7) that colregs has not shipped a
 * text file for yet. `fr-unts`/`en-unts` are confirmed blocked (Q-7: the
 * UNTS deposit's reproduction terms are the same restrictive default that
 * blocks CEVNI's text); `ru`/`zh`/`ar` are unmeasured; `de` and `community`
 * are not yet named at all.
 */
const candidateCorporaRaw: Signpost[] = [
  {
    id: 'fr-unts',
    kind: 'corpus',
    status: 'measured',
    tier: 'authentic',
    language: 'fr',
    labelKey: 'sp.fr.label',
    bodyKeys: ['sp.fr.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7.unts' }],
    link: `${COLREGS}/issues/81`,
  },
  {
    id: 'en-unts',
    kind: 'corpus',
    status: 'measured',
    tier: 'authentic',
    language: 'en',
    labelKey: 'sp.en-unts.label',
    bodyKeys: ['sp.en-unts.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7.unts' }],
    link: `${COLREGS}/issues/81`,
  },
  {
    id: 'ru',
    kind: 'corpus',
    status: 'ranked',
    tier: 'official',
    language: 'ru',
    labelKey: 'sp.ru.label',
    bodyKeys: ['sp.ru.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: VERIF,
  },
  {
    id: 'zh',
    kind: 'corpus',
    status: 'ranked',
    tier: 'official',
    language: 'zh',
    labelKey: 'sp.zh.label',
    bodyKeys: ['sp.zh.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: VERIF,
  },
  {
    id: 'ar',
    kind: 'corpus',
    status: 'ranked',
    tier: 'official',
    language: 'ar',
    labelKey: 'sp.ar.label',
    bodyKeys: ['sp.ar.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: VERIF,
  },
  {
    id: 'de',
    kind: 'corpus',
    status: 'not-scoped',
    tier: 'national',
    language: 'de',
    labelKey: 'sp.de.label',
    bodyKeys: ['sp.de.p1'],
    blockers: [],
    link: ADR3,
  },
  {
    id: 'community',
    kind: 'corpus',
    status: 'not-scoped',
    labelKey: 'sp.community.label',
    bodyKeys: ['sp.community.p1'],
    blockers: [{ id: 'REQ-LANG-8', textKey: 'blocker.lang8' }],
    link: `${REQS}#5-languages-and-localization`,
  },
];
const candidateCorpora: Signpost[] = candidateCorporaRaw.filter(
  (c) => !c.corpusId || !generatedCorpusIds.has(c.corpusId),
);

export const corpora: Signpost[] = [...generatedCorpora, ...candidateCorpora];

// ------------------------------------------------------------------ parts

// A path's `shapes` entries are Part C day shapes (REQ-PART-2); a
// `category`-tagged entry is Part B data under ADR 0005 (REQ-PART-4 was
// superseded by it 2026-09-04 — Part B stays out of v1 but is no longer
// "may never be modelled"). Read straight from applicability data so this
// stays true as colregs adds entries, rather than freezing today's count.
const hasDayShapeEntries = applicability.entries.some(
  (e) => (e.shapes?.length ?? 0) > 0,
);
const hasPartBEntries = applicability.entries.some((e) => e.category);

export const parts: Signpost[] = [
  {
    id: 'day-shapes',
    kind: 'part',
    status: hasDayShapeEntries ? 'live' : 'modelled-for',
    labelKey: 'sp.day-shapes.label',
    bodyKeys: ['sp.day-shapes.p1'],
    blockers: [],
    link: `${REQS}#31-rule-parts`,
  },
  {
    id: 'part-d',
    kind: 'part',
    status: 'undecided',
    labelKey: 'sp.part-d.label',
    bodyKeys: ['sp.part-d.p1', 'sp.part-d.p2'],
    blockers: [{ id: 'Q-1', textKey: 'blocker.q1' }],
    link: `${REQS}#11-open-questions`,
  },
  {
    id: 'part-b',
    kind: 'part',
    status: hasPartBEntries ? 'ranked' : 'out-of-scope',
    labelKey: 'sp.part-b.label',
    bodyKeys: ['sp.part-b.p1'],
    blockers: [],
    link: `${REQS}#41-rule-categories-and-the-situation-record`,
  },
];

/**
 * The "how this jurisdiction differs" explainer, by jurisdiction id. These
 * were the US Inland signpost's measured-delta paragraphs while Inland was
 * blocked; now that it is live they belong beside its rule text, in the Rules
 * reference, rather than in a panel about work not yet done.
 */
export const jurisdictionExplainers: Record<string, string[]> = {
  'us/inland': [
    'sp.us-inland.p1',
    'sp.us-inland.p2',
    'sp.us-inland.p3',
    'sp.us-inland.p4',
    'sp.us-inland.geo',
  ],
};

export const allSignposts: Signpost[] = [
  ...jurisdictions,
  ...parts,
  ...corpora,
];

export function findSignpost(id: string): Signpost | undefined {
  return allSignposts.find((s) => s.id === id);
}

export const designDocLink = DESIGN;
