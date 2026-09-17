// The text layer, and the only resolver of it. colregs 0.3 split verbatim
// rule text out of the language-neutral skeleton into per-edition corpus
// files (ADR 0013), so a paragraph's path comes from `rules.json` and its
// words come from a corpus — chosen by the reader, keyed by id.
//
// Two axes meet here, and they are not the same thing:
//
// - **Jurisdiction.** A jurisdiction restates a path only where its text
//   differs from the base (ADR 0020 point 3), so an inherited path's words
//   are the base corpus's words — reading them from there is the
//   inheritance, not a fallback, and it is never labelled as one.
// - **Corpus.** Within a jurisdiction the reader picks which corpus to read
//   (URL `txt=`). A paragraph the chosen corpus has not transcribed resolves
//   to that jurisdiction's reference corpus and says so, and a run that
//   mixes the two is labelled mixed — REQ-LANG-7 puts fallback on the
//   consumer, and silence is not an option.

import {
  REFERENCE_CORPUS_ID,
  corpusById,
  corpusIdsFor,
  referenceCorpusIdFor,
} from './corpora';
import type { Corpus, CorpusGap } from './corpora';
import { BASE_JURISDICTION, restatedPathsFor } from './jurisdictions';

export type { Corpus, CorpusGap, CorpusParagraph } from './corpora';

/**
 * The corpus a jurisdiction actually reads: the chosen one when it belongs
 * to this jurisdiction, its reference corpus otherwise. A stale `txt=` from
 * another jurisdiction's picker never silently renders the wrong instrument.
 */
export function corpusFor(jurisdiction: string, corpusId?: string): Corpus {
  if (corpusId && corpusIdsFor(jurisdiction).includes(corpusId)) {
    return corpusById(corpusId);
  }
  return corpusById(referenceCorpusIdFor(jurisdiction));
}

export interface ResolvedText {
  path: string;
  text: string;
  ruleTitle: string;
  /** the corpus the words came from */
  corpus: Corpus;
  /** the corpus that was asked for, in the jurisdiction the words came from */
  requested: Corpus;
  /** true when this jurisdiction restates the path in its own words */
  own: boolean;
  /** true when the chosen corpus lacks the path and the reference supplied it */
  fallback: boolean;
}

/**
 * The words for one paragraph path, under one jurisdiction, in one corpus:
 * the chosen corpus, else the jurisdiction's reference corpus (labelled a
 * fallback), else the base jurisdiction's text (inherited, not a fallback),
 * and nothing where the path is restated but its corpus has not been filled.
 */
export function textFor(
  jurisdiction: string,
  path: string,
  corpusId?: string,
): ResolvedText | undefined {
  const requested = corpusFor(jurisdiction, corpusId);
  const mine = requested.paragraphs[path];
  if (mine) {
    return {
      path,
      text: mine.text,
      ruleTitle: mine.rule_title,
      corpus: requested,
      requested,
      own: true,
      fallback: false,
    };
  }
  // corpus fallback, inside the jurisdiction: the reader asked for Finnish,
  // this paragraph is not transcribed yet, so the reference text shows and
  // says whose it is
  const reference = corpusById(referenceCorpusIdFor(jurisdiction));
  if (reference.id !== requested.id) {
    const ref = reference.paragraphs[path];
    if (ref) {
      return {
        path,
        text: ref.text,
        ruleTitle: ref.rule_title,
        corpus: reference,
        requested,
        own: true,
        fallback: true,
      };
    }
  }
  if (jurisdiction === BASE_JURISDICTION) return undefined;
  // A restated path's words are this jurisdiction's, not the base's: falling
  // back would show International text under a national heading.
  if (restatedPathsFor(jurisdiction).includes(path)) return undefined;
  const inherited = textFor(BASE_JURISDICTION, path, corpusId);
  if (!inherited) return undefined;
  return { ...inherited, own: false };
}

/** The recorded reason a path has no words, from whichever corpus records it. */
export function gapFor(
  jurisdiction: string,
  path: string,
  corpusId?: string,
): string | undefined {
  const reason = (c: Corpus) => c.gaps?.find((g) => g.path === path)?.reason;
  return (
    reason(corpusFor(jurisdiction, corpusId)) ??
    reason(corpusById(referenceCorpusIdFor(jurisdiction))) ??
    reason(corpusById(REFERENCE_CORPUS_ID))
  );
}

/** What one paragraph renders as: its words and their provenance, or its gap. */
export interface ParagraphView {
  path: string;
  text?: string;
  ruleTitle?: string;
  /** the corpus the words came from, or the one asked for when there are none */
  corpus: Corpus;
  requested: Corpus;
  own: boolean;
  fallback: boolean;
  /** set only when no corpus has the path: the recorded reason */
  gap?: string;
}

export function viewParagraph(
  jurisdiction: string,
  path: string,
  corpusId?: string,
): ParagraphView {
  const resolved = textFor(jurisdiction, path, corpusId);
  if (resolved) return resolved;
  const requested = corpusFor(jurisdiction, corpusId);
  return {
    path,
    corpus: requested,
    requested,
    own: true,
    fallback: false,
    gap: gapFor(jurisdiction, path, corpusId) ?? 'not present in any corpus',
  };
}

/** Resolve a run of paragraphs, and say whether the run mixes corpora. */
export function resolveParagraphs(
  jurisdiction: string,
  paths: string[],
  corpusId?: string,
): { paragraphs: ParagraphView[]; mixed: boolean; fallbacks: number } {
  const paragraphs = paths.map((p) => viewParagraph(jurisdiction, p, corpusId));
  const withText = paragraphs.filter((p) => p.text !== undefined);
  const fallbacks = withText.filter((p) => p.fallback).length;
  return {
    paragraphs,
    fallbacks,
    mixed: fallbacks > 0 && fallbacks < withText.length,
  };
}

/** The rule title for a rule number, from whichever corpus states it. */
export function ruleTitleFor(
  jurisdiction: string,
  paths: string[],
  corpusId?: string,
): string | undefined {
  for (const p of paths) {
    const t = textFor(jurisdiction, p, corpusId);
    if (t) return t.ruleTitle;
  }
  return undefined;
}

/** The corpus's own recorded gaps, for the corpus in view. */
export function gapsFor(jurisdiction: string, corpusId?: string): CorpusGap[] {
  const chosen = corpusFor(jurisdiction, corpusId);
  const reference = corpusById(referenceCorpusIdFor(jurisdiction));
  const rows = new Map<string, CorpusGap>();
  for (const g of reference.gaps ?? []) rows.set(g.path, g);
  for (const g of chosen.gaps ?? []) rows.set(g.path, g);
  return [...rows.values()];
}
