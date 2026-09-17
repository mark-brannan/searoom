// Pick which rule-text corpus to read, among the corpora of the
// jurisdiction in view. Switching changes the words and their provenance
// line only: ids are language-neutral (REQ-LANG-2), so no entry set and no
// quiz answer moves.

import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { corpusById, corpusIdsFor, coverage } from '../data/corpora';
import { corpusFor } from '../data/corpusText';
import { resolveSkeleton } from '../data/jurisdictions';

export function corpusLabel(id: string): string {
  const c = corpusById(id);
  return `${c.language} · ${c.source.publisher}`;
}

export function CorpusSwitcher({
  jurisdiction,
  corpusId,
  onCorpus,
}: {
  jurisdiction: string;
  corpusId: string;
  onCorpus: (id: string) => void;
}) {
  const intl = useIntl();
  const skeletonPaths = useMemo(
    () => Object.keys(resolveSkeleton(jurisdiction)),
    [jurisdiction],
  );
  const ids = corpusIdsFor(jurisdiction);
  // a `txt=` from another jurisdiction's picker reads as that jurisdiction's
  // reference corpus, so the select shows what is actually being read
  const selected = corpusFor(jurisdiction, corpusId).id;
  if (ids.length < 2) return null;
  return (
    <label className="corpus-switcher">
      <span>{intl.formatMessage({ id: 'corpus.switcher' })}</span>
      <select value={selected} onChange={(e) => onCorpus(e.target.value)}>
        {ids.map((id) => {
          const c = corpusById(id);
          const cov = coverage(id, skeletonPaths);
          return (
            <option key={id} value={id}>
              {corpusLabel(id)} ·{' '}
              {intl.formatMessage({ id: `corpus.tier.${c.tier}` })} · {cov.have}/
              {cov.total}
            </option>
          );
        })}
      </select>
    </label>
  );
}
