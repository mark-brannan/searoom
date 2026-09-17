// Verbatim rule text for a cite, from the package corpora only — never
// translated app-side. Every paragraph carries its corpus's publisher, tier,
// language and edition (REQ-LANG-3). A paragraph the chosen corpus has not
// transcribed shows the reference text and says so; a run that mixes corpora
// is labelled mixed (REQ-LANG-7: fallback is the consumer's job, and silence
// is not an option). A path inherited from the base jurisdiction is not a
// fallback and is not labelled as one — that is ADR 0020's inheritance.

import { FormattedMessage, useIntl } from 'react-intl';
import { paragraphsForCite } from '../data/cites';
import { gapsFor, resolveParagraphs } from '../data/corpusText';
import type { Corpus, ParagraphView } from '../data/corpusText';
import { BASE_JURISDICTION } from '../data/jurisdictions';

export function CorpusBadge({ corpus }: { corpus: Corpus }) {
  const intl = useIntl();
  return (
    <span className="badge tier" title={corpus.source.title}>
      {corpus.source.publisher} ·{' '}
      {intl.formatMessage({ id: `corpus.tier.${corpus.tier}` })} ·{' '}
      {corpus.language}
    </span>
  );
}

export function ParagraphProvenance({ p }: { p: ParagraphView }) {
  const intl = useIntl();
  if (p.gap !== undefined) {
    return (
      <p className="corpus-line">
        <FormattedMessage
          id="rules.gap"
          values={{ path: p.path, reason: p.gap }}
        />
      </p>
    );
  }
  return (
    <p className={`corpus-line${p.fallback ? ' fallback' : ''}`}>
      {p.fallback && (
        <>
          <FormattedMessage
            id="corpus.fallback"
            values={{
              requested: p.requested.source.publisher,
              language: p.requested.language,
            }}
          />{' '}
        </>
      )}
      {p.ruleTitle} ·{' '}
      <a href={p.corpus.source.url} target="_blank" rel="noreferrer">
        {p.corpus.source.publisher}
      </a>{' '}
      ({intl.formatMessage({ id: `corpus.tier.${p.corpus.tier}` })},{' '}
      {p.corpus.language}, {p.corpus.edition})
    </p>
  );
}

export function MixedNotice({
  mixed,
  requested,
}: {
  mixed: boolean;
  requested: Corpus;
}) {
  if (!mixed) return null;
  return (
    <p className="corpus-line mixed">
      <FormattedMessage
        id="corpus.mixed"
        values={{
          requested: requested.source.publisher,
          language: requested.language,
        }}
      />
    </p>
  );
}

export function RuleParagraphs({
  cite,
  jurisdiction = BASE_JURISDICTION,
  corpusId,
}: {
  cite: string;
  jurisdiction?: string;
  corpusId?: string;
}) {
  const paths = paragraphsForCite(cite, jurisdiction);
  const { paragraphs, mixed } = resolveParagraphs(jurisdiction, paths, corpusId);
  const requested = paragraphs[0]?.requested;
  const gaps = gapsFor(jurisdiction, corpusId).filter(
    (g) => (g.path === cite || paths.includes(g.path)) && !paths.includes(g.path),
  );
  if (paths.length === 0 && gaps.length === 0) {
    return (
      <p className="corpus-line">
        <FormattedMessage
          id="rules.gap"
          values={{ path: cite, reason: 'not present in the skeleton' }}
        />
      </p>
    );
  }
  return (
    <div>
      {requested && <MixedNotice mixed={mixed} requested={requested} />}
      {paragraphs.map((p) => (
        <div key={p.path} lang={p.corpus.language}>
          {p.text !== undefined && (
            <div className={`rule-text${p.fallback ? ' fallback' : ''}`}>
              <strong>{p.path}</strong> — {p.text}
            </div>
          )}
          <ParagraphProvenance p={p} />
        </div>
      ))}
      {gaps.map((g) => (
        <p key={g.path} className="corpus-line">
          <FormattedMessage
            id="rules.gap"
            values={{ path: g.path, reason: g.reason }}
          />
        </p>
      ))}
    </div>
  );
}
