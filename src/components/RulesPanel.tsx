import { FormattedMessage, useIntl } from 'react-intl';
import { RuleParagraphs } from './RuleParagraphs';
import { entryById } from './entryById';
import { paragraphsForCite } from '../data/cites';
import { corpusHandle, resolveParagraphs } from '../data/corpusText';
import { useCorpusId } from '../state/corpusContext';
import type { DisplayEvaluation, Entry } from '../engine/types';

function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}rule-images/${name}`;
}

function EntryRow({
  entry,
  evaln,
  jurisdiction,
}: {
  entry: Entry;
  evaln: DisplayEvaluation;
  jurisdiction: string;
}) {
  const intl = useIntl();
  // closed vocabularies are prefixed identifiers (colregs ADR 0017); the
  // catalog and the badge class both key off the suffix, as every other
  // vocabulary in the app does
  const modality = (evaln.modalities[entry.id] ?? entry.modality).replace(
    /^modality:/,
    '',
  );
  // the badge names the corpus that actually supplies this entry's text —
  // inherited or fallen back — not merely the one the reader picked, which
  // may carry none of it yet (REQ-LANG-3, REQ-LANG-7)
  const corpusId = useCorpusId();
  const { items } = resolveParagraphs(
    jurisdiction,
    paragraphsForCite(entry.cite, jurisdiction),
    corpusId,
  );
  const sources = new Map(
    items.flatMap((r) =>
      r.shown ? [[r.shown.corpus.id, r.shown.corpus]] : [],
    ),
  );
  return (
    <div className="entry">
      <div className="entry-head">
        <span className="entry-id">{entry.id}</span>
        <strong>{entry.cite}</strong>
        <span className={`badge ${modality}`}>
          {intl.formatMessage({ id: `modality.${modality}` })}
        </span>
        {[...sources.values()].map((corpus) => (
          <span className="badge tier" key={corpus.id}>
            {corpusHandle(corpus)} ·{' '}
            {intl.formatMessage({ id: `corpus.tier.${corpus.tier}` })} ·{' '}
            {corpus.language}
          </span>
        ))}
      </div>
      <details>
        <summary>
          <FormattedMessage id="sandbox.rules.showText" />
        </summary>
        <RuleParagraphs cite={entry.cite} jurisdiction={jurisdiction} />
        {(entry.images ?? []).map((img) => (
          <img
            key={img}
            className="rule-image"
            src={imageUrl(img)}
            alt={`USCG diagram for ${entry.cite}`}
            loading="lazy"
          />
        ))}
      </details>
    </div>
  );
}

/** The entries that applied, each with its modality badge and its text:
 * any evaluation result, any mode. */
export function RulesPanel({
  evaln,
  jurisdiction,
}: {
  evaln: DisplayEvaluation;
  jurisdiction: string;
}) {
  return (
    <div className="panel">
      <h2>
        <FormattedMessage id="sandbox.rules.title" />
      </h2>
      <p className="elim">
        <FormattedMessage id="sandbox.rules.explain" />
      </p>
      {evaln.applied
        .map((id) => entryById.get(id)!)
        .map((e) => (
          <EntryRow
            key={e.id}
            entry={e}
            evaln={evaln}
            jurisdiction={jurisdiction}
          />
        ))}
    </div>
  );
}
