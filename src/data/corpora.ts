// Rule-text corpora, read from the colregs index (data/corpora.json), the
// edition registry (data/editions.json) and the corpus files under
// data/text/. One corpus = one edition × one language × one source. The
// app quotes a corpus verbatim and never translates it (REQ-LANG-1); when
// the chosen corpus lacks a paragraph, fallback is our job and must be
// visible (REQ-LANG-7); the tier belongs to the source, not the language
// (REQ-LANG-3).

import corporaJson from 'colregs/data/corpora.json' with { type: 'json' };
import editionsJson from 'colregs/data/editions.json' with { type: 'json' };
import colregsPkg from 'colregs/package.json' with { type: 'json' };

export type Tier = 'authentic' | 'official' | 'national' | 'community';
export type EditionStatus = 'verified' | 'claimed' | 'unknown';

export interface CorpusParagraph {
  rule_title: string;
  text?: string;
  text_status?: 'verbatim' | 'withheld';
  withheld_reason?: string;
  /** intl path this provision restates (non-intl corpora) */
  mirrors?: string;
}

export interface Corpus {
  id: string;
  edition: string;
  edition_status: EditionStatus;
  language: string;
  source_id: string;
  tier: Tier;
  normalization: string;
  translation_of?: string;
  source: {
    publisher: string;
    title: string;
    edition?: string;
    url: string;
    retrieved: string | null;
  };
  rights: {
    source_text: string;
    redistribution_basis: string;
    attribution?: string;
    package_licence: string;
    contributors?: string[];
    reviewers?: string[];
  };
  note?: string;
  gaps?: { path: string; reason: string }[];
  paragraphs: Record<string, CorpusParagraph>;
}

export interface CorpusIndexEntry {
  file: string;
  edition: string;
  edition_status: EditionStatus;
  language: string;
  source_id: string;
  tier: Tier;
  paragraphs: number;
}

export interface Edition {
  amended_through: string;
  in_force: string;
  note?: string;
}

export interface JurisdictionEditions {
  instrument: string;
  skeleton: string | null;
  editions: Record<string, Edition>;
}

export const corpusIndex = (
  corporaJson as unknown as { corpora: Record<string, CorpusIndexEntry> }
).corpora;

export const editions = (
  editionsJson as unknown as {
    jurisdictions: Record<string, JurisdictionEditions>;
  }
).jurisdictions;

/** The language every other corpus falls back to (colregs package.json). */
export const referenceLanguage: string =
  (colregsPkg as { colregs?: { referenceLanguage?: string } }).colregs
    ?.referenceLanguage ?? 'en';

// Every corpus file the package ships, keyed by its path in the package.
// The index says which of these are corpora; a file the index does not
// name is not a corpus (REQ-LANG-5: the index is regenerated from the
// files upstream and CI fails on drift).
const files = import.meta.glob('/node_modules/colregs/data/text/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Corpus>;

function fileFor(entry: CorpusIndexEntry): Corpus | undefined {
  return files[`/node_modules/colregs/data/${entry.file}`];
}

/** Every corpus the index names and the package ships, in index order. */
export const corpora: Corpus[] = Object.entries(corpusIndex).flatMap(
  ([id, entry]) => {
    const c = fileFor(entry);
    return c ? [{ ...c, id }] : [];
  },
);

const byId = new Map(corpora.map((c) => [c.id, c]));

export function corpusById(id: string): Corpus | undefined {
  return byId.get(id);
}

/** "intl@2016" -> "intl"; "us/inland@2014" -> "us/inland". */
export function jurisdictionOfEdition(edition: string): string {
  return edition.slice(0, edition.indexOf('@'));
}

export function jurisdictionOf(c: Corpus): string {
  return jurisdictionOfEdition(c.edition);
}

export function editionOf(c: Corpus): Edition | undefined {
  return editions[jurisdictionOf(c)]?.editions[c.edition];
}

export function instrumentOf(c: Corpus): string | undefined {
  return editions[jurisdictionOf(c)]?.instrument;
}

/** Corpora of one jurisdiction, reference language first, then by language. */
export function corporaFor(jurisdiction: string): Corpus[] {
  return corpora
    .filter((c) => jurisdictionOf(c) === jurisdiction)
    .sort((a, b) => {
      const ar = isReferenceLanguage(a) ? 0 : 1;
      const br = isReferenceLanguage(b) ? 0 : 1;
      return ar - br || a.language.localeCompare(b.language);
    });
}

function isReferenceLanguage(c: Corpus): boolean {
  return c.language === referenceLanguage || c.language.startsWith(`${referenceLanguage}-`);
}

/**
 * The corpus a jurisdiction falls back to: the reference-language corpus of
 * the edition its skeleton consolidates, preferring a verified edition and
 * then the fullest text.
 */
export function referenceCorpusFor(jurisdiction: string): Corpus | undefined {
  const skeleton = editions[jurisdiction]?.skeleton;
  const candidates = corporaFor(jurisdiction)
    .filter(isReferenceLanguage)
    .filter((c) => !skeleton || c.edition === skeleton);
  return candidates.sort(
    (a, b) =>
      (a.edition_status === 'verified' ? 0 : 1) -
        (b.edition_status === 'verified' ? 0 : 1) ||
      Object.keys(b.paragraphs).length - Object.keys(a.paragraphs).length,
  )[0];
}

export const DEFAULT_JURISDICTION = 'intl';

export const referenceCorpus: Corpus =
  referenceCorpusFor(DEFAULT_JURISDICTION) ?? corpora[0];

export const DEFAULT_CORPUS_ID: string = referenceCorpus.id;

/** The corpus a paragraph is shown from when the wanted one cannot supply it. */
export function fallbackFor(c: Corpus): Corpus | undefined {
  const ref = referenceCorpusFor(jurisdictionOf(c));
  return ref && ref.id !== c.id ? ref : undefined;
}

export interface ResolvedParagraph {
  path: string;
  /** the corpus the reader asked for */
  wanted: Corpus;
  /** the paragraph actually shown, and where it came from; absent when no corpus supplies it */
  shown?: { corpus: Corpus; para: CorpusParagraph };
  /** true when `shown` is not from `wanted` */
  fallback: boolean;
  /** why `wanted` could not supply it (gap reason, withheld reason, or plain absence) */
  reason?: string;
  /** the wanted corpus models the paragraph but withholds its text (ADR 0010) */
  withheld?: { rule_title: string; reason: string };
}

function whyMissing(c: Corpus, path: string): string {
  const p = c.paragraphs[path];
  if (p?.text_status === 'withheld') return p.withheld_reason ?? 'withheld';
  const gap = (c.gaps ?? []).find((g) => g.path === path);
  if (gap) return gap.reason;
  return 'not transcribed in this corpus yet';
}

/** Resolve one paragraph path against a corpus, falling back visibly. */
export function resolveParagraph(
  path: string,
  corpusId: string,
): ResolvedParagraph {
  const wanted = corpusById(corpusId) ?? referenceCorpus;
  const own = wanted.paragraphs[path];
  if (own?.text) {
    return {
      path,
      wanted,
      shown: { corpus: wanted, para: own },
      fallback: false,
    };
  }
  const reason = whyMissing(wanted, path);
  const withheld =
    own?.text_status === 'withheld'
      ? { rule_title: own.rule_title, reason: own.withheld_reason ?? '' }
      : undefined;
  const fb = fallbackFor(wanted);
  const fbPara = fb?.paragraphs[path];
  if (fb && fbPara?.text) {
    return {
      path,
      wanted,
      shown: { corpus: fb, para: fbPara },
      fallback: true,
      reason,
      withheld,
    };
  }
  return {
    path,
    wanted,
    fallback: false,
    reason: fb ? `${reason}; ${whyMissing(fb, path)}` : reason,
    withheld,
  };
}

/** Resolve many paths at once and say whether the set is a mixed rendering. */
export function resolveParagraphs(paths: string[], corpusId: string) {
  const items = paths.map((p) => resolveParagraph(p, corpusId));
  const fellBack = items.filter((r) => r.fallback);
  return {
    items,
    mixed: fellBack.length > 0 && fellBack.length < items.length,
    fallbackCount: fellBack.length,
    fallbackCorpus: fellBack[0]?.shown?.corpus,
  };
}

/** The rule title a corpus gives a rule, from its first paragraph with text. */
export function ruleTitle(paths: string[], corpusId: string): string | undefined {
  for (const p of paths) {
    const r = resolveParagraph(p, corpusId);
    const title = r.shown?.para.rule_title ?? r.withheld?.rule_title;
    if (title) return title;
  }
  return undefined;
}

/** Short handle for a corpus in chrome: "USCG", "BOE", "FINLEX". */
export function corpusHandle(c: Corpus): string {
  return c.source_id.toUpperCase();
}

/** Paragraphs the corpus actually carries text for. */
export function textCount(c: Corpus): number {
  return Object.values(c.paragraphs).filter((p) => p.text).length;
}
