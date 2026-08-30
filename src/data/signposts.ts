// The breadth surface: one record per signposted jurisdiction, rule part
// and rule-text corpus. Status, measured delta, named blocker, link —
// populated from docs/design.md's "Breadth-first surface" and "Languages —
// i18n-first" sections, which carry colregs' actually-measured scope.
// Body text lives in the message catalogs under `sp.<id>.*` keys.
// "not-scoped" is a legitimate status, not a gap to fill.

export type SignpostStatus =
  | 'live'
  | 'measured' // delta measured against the primary source, blocked
  | 'ranked' // ranked on the queue, not measured
  | 'modelled-for' // the data model accommodates it; nothing written
  | 'undecided' // an open question must resolve first
  | 'out-of-scope' // deliberately never
  | 'not-scoped'; // colregs has not scoped it at all

export interface Blocker {
  /** colregs' identifier: Q-1, Q-3, Q-7, Q-11, REQ-PART-4, GATE-2 … */
  id: string;
  /** one-line description key in the message catalog */
  textKey: string;
}

export interface Signpost {
  id: string;
  kind: 'jurisdiction' | 'part' | 'corpus';
  status: SignpostStatus;
  /** short label key + body paragraph keys in the catalog */
  labelKey: string;
  bodyKeys: string[];
  blockers: Blocker[];
  link: string;
  /** corpus rows only (ADR 0003 tiers) */
  tier?: 'authentic' | 'official' | 'national' | 'community';
  language?: string;
}

const COLREGS = 'https://github.com/mark-brannan/colregs';
const REQS = `${COLREGS}/blob/main/docs/requirements.md`;
const ADR1 = `${COLREGS}/blob/main/docs/adr/0001-name-and-jurisdiction-model.md`;
const ADR3 = `${COLREGS}/blob/main/docs/adr/0003-language-as-a-dimension.md`;
const VERIF = `${COLREGS}/blob/main/docs/verification/2026-08-30-q6-q8.md`;
const DESIGN = 'https://github.com/mark-brannan/searoom/blob/main/docs/design.md';

export const jurisdictions: Signpost[] = [
  {
    id: 'intl',
    kind: 'jurisdiction',
    status: 'live',
    labelKey: 'sp.intl.label',
    bodyKeys: ['sp.intl.p1', 'sp.intl.p2'],
    blockers: [],
    link: COLREGS,
  },
  {
    id: 'us-inland',
    kind: 'jurisdiction',
    status: 'measured',
    labelKey: 'sp.us-inland.label',
    bodyKeys: [
      'sp.us-inland.p1',
      'sp.us-inland.p2',
      'sp.us-inland.p3',
      'sp.us-inland.p4',
      'sp.us-inland.geo',
    ],
    blockers: [{ id: 'Q-11', textKey: 'blocker.q11' }],
    link: `${REQS}#11-open-questions`,
  },
  {
    id: 'ca-inland',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.ca-inland.label',
    bodyKeys: ['sp.ca-inland.p1'],
    blockers: [
      { id: 'Q-3', textKey: 'blocker.q3.ca' },
      { id: 'Q-11', textKey: 'blocker.q11' },
    ],
    link: ADR1,
  },
  {
    id: 'eu-cevni',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.eu-cevni.label',
    bodyKeys: ['sp.eu-cevni.p1', 'sp.eu-cevni.p2'],
    blockers: [{ id: 'Q-3', textKey: 'blocker.q3.cevni' }],
    link: ADR1,
  },
  {
    id: 'de-binnen',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.de-binnen.label',
    bodyKeys: ['sp.de-binnen.p1'],
    blockers: [{ id: 'Q-3', textKey: 'blocker.q3.de' }],
    link: ADR1,
  },
  {
    id: 'uk',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.uk.label',
    bodyKeys: ['sp.uk-au.p1'],
    blockers: [
      { id: 'Q-3', textKey: 'blocker.q3.uk' },
      { id: 'Q-11', textKey: 'blocker.q11' },
    ],
    link: ADR1,
  },
  {
    id: 'au',
    kind: 'jurisdiction',
    status: 'ranked',
    labelKey: 'sp.au.label',
    bodyKeys: ['sp.uk-au.p1'],
    blockers: [
      { id: 'Q-3', textKey: 'blocker.q3.au' },
      { id: 'Q-11', textKey: 'blocker.q11' },
    ],
    link: ADR1,
  },
];

export const parts: Signpost[] = [
  {
    id: 'day-shapes',
    kind: 'part',
    status: 'modelled-for',
    labelKey: 'sp.day-shapes.label',
    bodyKeys: ['sp.day-shapes.p1'],
    blockers: [{ id: 'REQ-PART-2', textKey: 'blocker.part2' }],
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
    status: 'out-of-scope',
    labelKey: 'sp.part-b.label',
    bodyKeys: ['sp.part-b.p1'],
    blockers: [{ id: 'REQ-PART-4', textKey: 'blocker.part4' }],
    link: `${REQS}#31-rule-parts`,
  },
];

export const corpora: Signpost[] = [
  {
    id: 'en-US-uscg',
    kind: 'corpus',
    status: 'live',
    tier: 'national',
    language: 'en-US',
    labelKey: 'sp.en-us.label',
    bodyKeys: ['sp.en-us.p1', 'sp.en-us.p2'],
    blockers: [{ id: '#6', textKey: 'blocker.issue6' }],
    link: `${COLREGS}/issues/6`,
  },
  {
    id: 'fi-finlex',
    kind: 'corpus',
    status: 'ranked',
    tier: 'national',
    language: 'fi',
    labelKey: 'sp.fi.label',
    bodyKeys: ['sp.fi.p1', 'sp.fi.p2'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: ADR3,
  },
  {
    id: 'fr-unts',
    kind: 'corpus',
    status: 'ranked',
    tier: 'authentic',
    language: 'fr',
    labelKey: 'sp.fr.label',
    bodyKeys: ['sp.fr.p1'],
    blockers: [
      { id: 'Q-7', textKey: 'blocker.q7' },
      { id: 'GATE-2', textKey: 'blocker.gate2' },
    ],
    link: VERIF,
  },
  {
    id: 'en-unts',
    kind: 'corpus',
    status: 'ranked',
    tier: 'authentic',
    language: 'en',
    labelKey: 'sp.en-unts.label',
    bodyKeys: ['sp.en-unts.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: VERIF,
  },
  {
    id: 'es',
    kind: 'corpus',
    status: 'ranked',
    tier: 'official',
    language: 'es',
    labelKey: 'sp.es.label',
    bodyKeys: ['sp.es-ru.p1'],
    blockers: [{ id: 'Q-7', textKey: 'blocker.q7' }],
    link: VERIF,
  },
  {
    id: 'ru',
    kind: 'corpus',
    status: 'ranked',
    tier: 'official',
    language: 'ru',
    labelKey: 'sp.ru.label',
    bodyKeys: ['sp.es-ru.p1'],
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
    tier: 'community',
    labelKey: 'sp.community.label',
    bodyKeys: ['sp.community.p1'],
    blockers: [{ id: 'REQ-LANG-8', textKey: 'blocker.lang8' }],
    link: `${REQS}#5-languages-and-localization`,
  },
];

export const allSignposts: Signpost[] = [
  ...jurisdictions,
  ...parts,
  ...corpora,
];

export function findSignpost(id: string): Signpost | undefined {
  return allSignposts.find((s) => s.id === id);
}

export const designDocLink = DESIGN;
