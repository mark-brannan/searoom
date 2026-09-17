// The corpus switcher: every corpus the package ships for the current
// jurisdiction, with its tier, language, edition and how much of the
// jurisdiction's own text it carries. Switching changes the words and nothing else — entry ids,
// paragraph paths, lights and quiz answers are language-neutral
// (REQ-LANG-2).

import { FormattedMessage, useIntl } from 'react-intl';
import {
  corporaFor,
  corpusHandle,
  expectedTextCount,
  textCount,
} from '../data/corpusText';
import type { Corpus } from '../data/corpusText';

export function CorpusRow({
  corpus,
  current,
  onPick,
  total,
}: {
  corpus: Corpus;
  current: boolean;
  onPick: (id: string) => void;
  /** paragraphs this corpus is expected to carry — the jurisdiction's own */
  total: number;
}) {
  const intl = useIntl();
  return (
    <button
      className={`picker-row${current ? ' current' : ''}`}
      onClick={() => onPick(corpus.id)}
      aria-pressed={current}
      lang={corpus.language}
    >
      <span className="grow label">
        {corpusHandle(corpus)} · {corpus.source.publisher}
        <span className="corpus-line">
          {corpus.source.title}
        </span>
        <span className="corpus-line">
          <FormattedMessage
            id="corpus.paragraphCount"
            values={{ count: textCount(corpus), total }}
          />
          {' · '}
          {corpus.edition} (
          {intl.formatMessage({
            id: `corpus.editionStatus.${corpus.edition_status}`,
          })}
          )
        </span>
      </span>
      <span className="badge tier">
        {intl.formatMessage({ id: `corpus.tier.${corpus.tier}` })}
      </span>
      <span className="badge">{corpus.language}</span>
    </button>
  );
}

export function CorpusSwitcher({
  corpusId,
  onPick,
  jurisdiction,
}: {
  corpusId: string;
  onPick: (id: string) => void;
  jurisdiction: string;
}) {
  const total = expectedTextCount(jurisdiction);
  return (
    <div className="picker-list">
      {corporaFor(jurisdiction).map((c) => (
        <CorpusRow
          key={c.id}
          corpus={c}
          current={c.id === corpusId}
          onPick={onPick}
          total={total}
        />
      ))}
    </div>
  );
}
