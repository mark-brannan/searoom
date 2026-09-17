// The corpus registry: which rule-text corpora colregs 0.3 ships, which of
// them this build bundles, and how much of a skeleton each one covers.
//
// This module is the catalogue only. The words come out of `corpusText.ts`,
// which owns the single resolver — a paragraph's text is a question about a
// jurisdiction *and* a corpus, and answering it in two places is how the two
// answers drift apart.

import corporaJson from 'colregs/data/corpora.json' with { type: 'json' };
import intlEnUs from 'colregs/data/text/intl/2016/en-US.uscg.json' with { type: 'json' };
import intlEs from 'colregs/data/text/intl/2016/es.boe.json' with { type: 'json' };
import intlFi from 'colregs/data/text/intl/2016/fi.finlex.json' with { type: 'json' };
import inlandEnUs from 'colregs/data/text/us/inland/2014/en-US.ecfr.json' with { type: 'json' };

import { editions } from './colregs';

export type Tier = 'authentic' | 'official' | 'national' | 'community';
export type EditionStatus = 'verified' | 'claimed';

/** One row of `corpora.json` — the registry, not the text. */
export interface CorpusIndexEntry {
  file: string;
  edition: string;
  edition_status: EditionStatus;
  language: string;
  source_id: string;
  tier: Tier;
  paragraphs: number;
}

export interface CorpusGap {
  path: string;
  reason: string;
}

export interface CorpusParagraph {
  rule_title: string;
  text: string;
}

/** One text file under `data/text/`. */
export interface Corpus {
  id: string;
  edition: string;
  edition_status: EditionStatus;
  language: string;
  source_id: string;
  tier: Tier;
  normalization?: string;
  source: {
    publisher: string;
    title: string;
    url: string;
    retrieved: string | null;
  };
  rights?: {
    source_text: string;
    redistribution_basis: string;
    attribution?: string;
    package_licence: string;
  };
  note?: string;
  gaps?: CorpusGap[];
  paragraphs: Record<string, CorpusParagraph>;
}

export const corpusIndex = (
  corporaJson as unknown as { corpora: Record<string, CorpusIndexEntry> }
).corpora;

/**
 * The corpora this build bundles, by id. A corpus is a static import so it
 * lands in the bundle; a registry row without one is signposted, not read.
 */
const BUNDLED: Corpus[] = [intlEnUs, intlEs, intlFi, inlandEnUs].map((c) => {
  const corpus = c as unknown as Corpus;
  // a stub corpus ships identity and rights with no `paragraphs` key at all
  return { ...corpus, paragraphs: corpus.paragraphs ?? {} };
});

const BY_ID: Record<string, Corpus> = Object.fromEntries(
  BUNDLED.map((c) => [c.id, c]),
);

/** The corpus every other one falls back to, paragraph by paragraph. */
export const REFERENCE_CORPUS_ID = 'intl@2016.en-US.uscg';

/** Jurisdiction id of an edition id ("us/inland@2014" -> "us/inland"). */
export function jurisdictionOf(edition: string): string {
  const at = edition.indexOf('@');
  return at === -1 ? edition : edition.slice(0, at);
}

export function isCorpusId(id: string): boolean {
  return id in corpusIndex && id in BY_ID;
}

/** A bundled corpus by id, falling back to the reference for an unknown id. */
export function corpusById(id: string): Corpus {
  return BY_ID[id] ?? BY_ID[REFERENCE_CORPUS_ID];
}

/** The bundled corpora of one jurisdiction, in registry order. */
export function corpusIdsFor(jurisdiction: string): string[] {
  return Object.keys(corpusIndex).filter(
    (id) =>
      jurisdictionOf(corpusIndex[id].edition) === jurisdiction && id in BY_ID,
  );
}

/**
 * The corpus a jurisdiction reads when the chosen one has nothing to say:
 * its own English text where it has one, the international reference
 * otherwise. Every other corpus of the jurisdiction falls back to this.
 */
export function referenceCorpusIdFor(jurisdiction: string): string {
  const ids = corpusIdsFor(jurisdiction);
  if (ids.length === 0) return REFERENCE_CORPUS_ID;
  return ids.find((id) => corpusIndex[id].language.startsWith('en')) ?? ids[0];
}

export interface EditionRef {
  id: string;
  jurisdiction: string;
  instrument: string;
  amendedThrough: string;
  inForce: string;
  note?: string;
}

/** The edition a corpus declares it reflects, from `editions.json`. */
export function editionFor(corpus: Corpus): EditionRef {
  const jurisdiction = jurisdictionOf(corpus.edition);
  const reg = editions.jurisdictions[jurisdiction];
  const row = reg?.editions?.[corpus.edition];
  return {
    id: corpus.edition,
    jurisdiction,
    instrument: reg?.instrument ?? jurisdiction,
    amendedThrough: row?.amended_through ?? '',
    inForce: row?.in_force ?? '',
    note: row?.note,
  };
}

/** How much of a skeleton a corpus covers, for the picker and the signposts. */
export function coverage(
  corpusId: string,
  skeletonPaths: string[],
): { have: number; total: number } {
  const c = corpusById(corpusId);
  return {
    have: skeletonPaths.filter((p) => p in c.paragraphs).length,
    total: skeletonPaths.length,
  };
}
