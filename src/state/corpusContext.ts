// Which rule-text corpus the reader chose, for every component that quotes
// a paragraph. Lives in URL state (`cp`), scoped to the jurisdiction in
// view; this context saves threading it through the mode tree.

import { createContext, useContext } from 'react';
import { DEFAULT_CORPUS_ID, corpusById, referenceCorpus } from '../data/corpusText';
import type { Corpus } from '../data/corpusText';

export const CorpusContext = createContext<string>(DEFAULT_CORPUS_ID);

export function useCorpusId(): string {
  return useContext(CorpusContext);
}

export function useCorpus(): Corpus {
  return corpusById(useContext(CorpusContext)) ?? referenceCorpus;
}
