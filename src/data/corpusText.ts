// The text layer. colregs 0.3 split verbatim rule text out of the
// language-neutral skeleton into per-edition corpus files (ADR 0013), so a
// paragraph's path comes from `rules.json` and its words come from a corpus
// chosen by (jurisdiction, language).
//
// A jurisdiction restates a path only where its text differs from the base
// (ADR 0020 point 3), so an inherited path's words are the base corpus's
// words — reading them from there is the inheritance, not a fallback.

import intlEnJson from 'colregs/data/text/intl/2016/en-US.uscg.json' with { type: 'json' };
import inlandEnJson from 'colregs/data/text/us/inland/2014/en-US.ecfr.json' with { type: 'json' };
import corporaJson from 'colregs/data/corpora.json' with { type: 'json' };

import { BASE_JURISDICTION, restatedPathsFor } from './jurisdictions';

export interface CorpusParagraph {
  rule_title: string;
  text: string;
}

export interface CorpusGap {
  path: string;
  reason: string;
}

export interface Corpus {
  id: string;
  edition: string;
  edition_status: string;
  language: string;
  source_id: string;
  tier: string;
  source: {
    publisher: string;
    title: string;
    url: string;
    retrieved: string | null;
  };
  gaps?: CorpusGap[];
  paragraphs: Record<string, CorpusParagraph>;
}

const intlEn = intlEnJson as unknown as Corpus;
const inlandEn = inlandEnJson as unknown as Corpus;

export const corpora = corporaJson as unknown as {
  corpora: Record<
    string,
    { file: string; edition: string; edition_status: string; paragraphs: number }
  >;
};

/** Every corpus this build carries, by jurisdiction then language. */
const BY_JURISDICTION: Record<string, Record<string, Corpus>> = {
  intl: { 'en-US': intlEn },
  'us/inland': { 'en-US': inlandEn },
};

/** The corpus a (jurisdiction, locale) pair reads. */
export function corpusFor(jurisdiction: string, locale = 'en'): Corpus {
  const byLanguage = BY_JURISDICTION[jurisdiction] ?? BY_JURISDICTION.intl;
  const exact = Object.keys(byLanguage).find((l) => l.startsWith(locale));
  return byLanguage[exact ?? 'en-US'] ?? intlEn;
}

export interface ResolvedText {
  path: string;
  text: string;
  ruleTitle: string;
  /** the corpus the words came from — the base's, for an inherited path */
  corpus: Corpus;
  /** true when this jurisdiction restates the path in its own words */
  own: boolean;
}

/**
 * The words for one paragraph path under one jurisdiction: the
 * jurisdiction's own corpus where it restates the path, the base corpus
 * where it inherits it, and nothing where the path is restated but its
 * corpus has not been filled.
 */
export function textFor(
  jurisdiction: string,
  path: string,
  locale = 'en',
): ResolvedText | undefined {
  const own = corpusFor(jurisdiction, locale);
  const mine = own.paragraphs[path];
  if (mine) {
    return { path, text: mine.text, ruleTitle: mine.rule_title, corpus: own, own: true };
  }
  if (jurisdiction === BASE_JURISDICTION) return undefined;
  // A restated path's words are this jurisdiction's, not the base's: falling
  // back would show International text under a national heading.
  if (restatedPathsFor(jurisdiction).includes(path)) return undefined;
  const base = corpusFor(BASE_JURISDICTION, locale);
  const inherited = base.paragraphs[path];
  if (!inherited) return undefined;
  return {
    path,
    text: inherited.text,
    ruleTitle: inherited.rule_title,
    corpus: base,
    own: false,
  };
}

/** The rule title for a rule number, from whichever corpus states it. */
export function ruleTitleFor(
  jurisdiction: string,
  paths: string[],
  locale = 'en',
): string | undefined {
  for (const p of paths) {
    const t = textFor(jurisdiction, p, locale);
    if (t) return t.ruleTitle;
  }
  return undefined;
}

/** The corpus's own recorded gaps, for the jurisdiction in view. */
export function gapsFor(jurisdiction: string, locale = 'en'): CorpusGap[] {
  return corpusFor(jurisdiction, locale).gaps ?? [];
}
