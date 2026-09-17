// The text layer. colregs 0.3 split verbatim rule text out of the
// language-neutral skeleton into per-edition corpus files (ADR 0013): a
// paragraph's path comes from `rules.json`, its words from a corpus the
// reader picked — one corpus = one edition × one language × one source,
// indexed by data/corpora.json, its edition registered in data/editions.json.
//
// Three things this module keeps apart:
// - the app quotes a corpus verbatim and never translates it; display
//   language and corpus are independent choices (REQ-LANG-1), so the corpus
//   is chosen explicitly, never derived from the UI locale;
// - a jurisdiction restates a path only where its text differs from the
//   base (ADR 0020 point 3), so an inherited path's words are the base
//   corpus's words — reading them from there is inheritance, not fallback;
// - when the chosen corpus lacks a paragraph, fallback is our job and must
//   be visible (REQ-LANG-7); the tier belongs to the source, not the
//   language (REQ-LANG-3).

import corporaJson from 'colregs/data/corpora.json' with { type: 'json' };
import colregsPkg from 'colregs/package.json' with { type: 'json' };

import { editions, rules } from './colregs';
import type { EditionRow } from './colregs';
import { BASE_JURISDICTION, restatedPathsFor } from './jurisdictions';

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

export interface CorpusGap {
  path: string;
  reason: string;
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
  gaps?: CorpusGap[];
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

export const corpusIndex = (
  corporaJson as unknown as { corpora: Record<string, CorpusIndexEntry> }
).corpora;

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

export function editionOf(c: Corpus): EditionRow | undefined {
  return editions.jurisdictions[jurisdictionOf(c)]?.editions[c.edition];
}

export function instrumentOf(c: Corpus): string | undefined {
  return editions.jurisdictions[jurisdictionOf(c)]?.instrument;
}

function isReferenceLanguage(c: Corpus): boolean {
  return (
    c.language === referenceLanguage ||
    c.language.startsWith(`${referenceLanguage}-`)
  );
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

/**
 * The corpus a jurisdiction falls back to: the reference-language corpus of
 * the edition its skeleton consolidates, preferring a verified edition and
 * then the fullest text.
 */
export function referenceCorpusFor(jurisdiction: string): Corpus | undefined {
  const skeleton = editions.jurisdictions[jurisdiction]?.skeleton;
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

/** The base's reference corpus — where every unresolved path ends up. */
export const referenceCorpus: Corpus =
  referenceCorpusFor(BASE_JURISDICTION) ?? corpora[0];

export const DEFAULT_CORPUS_ID: string = referenceCorpus.id;

/**
 * The corpus a jurisdiction actually reads for a chosen id: the id when it
 * belongs to that jurisdiction, else the jurisdiction's own reference. A
 * corpus id carried across a jurisdiction switch (or hand-edited into the
 * URL) never quotes one instrument's words under another's heading.
 */
export function corpusIn(jurisdiction: string, corpusId: string): Corpus {
  const c = corpusById(corpusId);
  if (c && jurisdictionOf(c) === jurisdiction) return c;
  return referenceCorpusFor(jurisdiction) ?? referenceCorpus;
}

/** The corpus a paragraph is shown from when the wanted one cannot supply it. */
export function fallbackFor(c: Corpus): Corpus | undefined {
  const ref = referenceCorpusFor(jurisdictionOf(c));
  return ref && ref.id !== c.id ? ref : undefined;
}

/**
 * The base corpus an inherited path reads, in the wanted corpus's language:
 * a jurisdiction restates a path only where it differs (ADR 0020 point 3),
 * so for every other path the base's words are the jurisdiction's words.
 * Undefined for the base itself and for a restated path — a restated path
 * whose corpus has not been filled must not show base text under a
 * national heading.
 */
function inheritedSourceFor(
  jurisdiction: string,
  path: string,
  wanted: Corpus,
): Corpus | undefined {
  if (jurisdiction === BASE_JURISDICTION) return undefined;
  if (restatedPathsFor(jurisdiction).includes(path)) return undefined;
  return (
    corporaFor(BASE_JURISDICTION).find((c) => c.language === wanted.language) ??
    referenceCorpus
  );
}

export interface ResolvedParagraph {
  path: string;
  /** the corpus the reader asked for */
  wanted: Corpus;
  /** the paragraph actually shown, and where it came from; absent when no corpus supplies it */
  shown?: { corpus: Corpus; para: CorpusParagraph };
  /** true when `shown` is a substitution for words `wanted` should have carried */
  fallback: boolean;
  /** true when `shown` is the base's corpus because the jurisdiction inherits the path */
  inherited: boolean;
  /** why the corpus that should have carried it could not (gap reason, withheld reason, or plain absence) */
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

/** Resolve one paragraph path under a jurisdiction against a corpus, falling back visibly. */
export function resolveParagraph(
  jurisdiction: string,
  path: string,
  corpusId: string,
): ResolvedParagraph {
  const wanted = corpusIn(jurisdiction, corpusId);
  const own = wanted.paragraphs[path];
  if (own?.text) {
    return {
      path,
      wanted,
      shown: { corpus: wanted, para: own },
      fallback: false,
      inherited: false,
    };
  }
  const withheld =
    own?.text_status === 'withheld'
      ? { rule_title: own.rule_title, reason: own.withheld_reason ?? '' }
      : undefined;
  const base = inheritedSourceFor(jurisdiction, path, wanted);
  const inheritedPara = base?.paragraphs[path];
  if (base && inheritedPara?.text) {
    return {
      path,
      wanted,
      shown: { corpus: base, para: inheritedPara },
      fallback: false,
      inherited: true,
      withheld,
    };
  }
  // the corpus that should have carried the words, and the one to try next
  const lacking = base ?? wanted;
  const reason = whyMissing(lacking, path);
  const fb = fallbackFor(lacking);
  const fbPara = fb?.paragraphs[path];
  if (fb && fbPara?.text) {
    return {
      path,
      wanted,
      shown: { corpus: fb, para: fbPara },
      fallback: true,
      inherited: false,
      reason,
      withheld,
    };
  }
  return {
    path,
    wanted,
    fallback: false,
    inherited: false,
    reason: fb ? `${reason}; ${whyMissing(fb, path)}` : reason,
    withheld,
  };
}

/** Resolve many paths at once and say whether the set is a mixed rendering. */
export function resolveParagraphs(
  jurisdiction: string,
  paths: string[],
  corpusId: string,
) {
  const items = paths.map((p) => resolveParagraph(jurisdiction, p, corpusId));
  const fellBack = items.filter((r) => r.fallback);
  return {
    items,
    mixed: fellBack.length > 0 && fellBack.length < items.length,
    fallbackCount: fellBack.length,
    fallbackCorpus: fellBack[0]?.shown?.corpus,
  };
}

/** The rule title for a rule, from the first of its paragraphs any corpus states. */
export function ruleTitleFor(
  jurisdiction: string,
  paths: string[],
  corpusId: string,
): string | undefined {
  for (const p of paths) {
    const r = resolveParagraph(jurisdiction, p, corpusId);
    const title = r.shown?.para.rule_title ?? r.withheld?.rule_title;
    if (title) return title;
  }
  return undefined;
}

/** A corpus's own recorded gaps. */
export function gapsFor(c: Corpus): CorpusGap[] {
  return c.gaps ?? [];
}

/** Short handle for a corpus in chrome: "USCG", "BOE", "FINLEX". */
export function corpusHandle(c: Corpus): string {
  return c.source_id.toUpperCase();
}

/** Paragraphs the corpus actually carries text for. */
export function textCount(c: Corpus): number {
  return Object.values(c.paragraphs).filter((p) => p.text).length;
}

/**
 * How many paragraphs a jurisdiction's corpus is expected to carry: the
 * whole skeleton for the base, only the restated paths for a delta
 * jurisdiction — its inherited paths are read from the base corpus.
 */
export function expectedTextCount(jurisdiction: string): number {
  return jurisdiction === BASE_JURISDICTION
    ? Object.keys(rules.paragraphs).length
    : restatedPathsFor(jurisdiction).length;
}
