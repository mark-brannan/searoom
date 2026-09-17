// Verbatim rule text, from package corpora only — never translated
// app-side. Every paragraph carries its corpus's tier and source
// (REQ-LANG-3). A paragraph missing from the chosen corpus says so and
// shows the fallback (REQ-LANG-7); a set where some paragraphs fell back
// is labelled a mixed rendering, never passed off as one edition. A path a
// jurisdiction inherits from the base is read from the base corpus and
// labelled as the base's — that is inheritance (ADR 0020), not fallback.

import { FormattedMessage, useIntl } from 'react-intl';
import { paragraphsForCite } from '../data/cites';
import {
  corpusHandle,
  resolveParagraph,
  resolveParagraphs,
} from '../data/corpusText';
import type { Corpus, ResolvedParagraph } from '../data/corpusText';
import { BASE_JURISDICTION } from '../data/jurisdictions';
import { useCorpusId } from '../state/corpusContext';

/** "USCG · national · en-US · intl@2016 (verified)" */
export function CorpusLine({ corpus, link }: { corpus: Corpus; link?: boolean }) {
  const intl = useIntl();
  const handle = link ? (
    <a href={corpus.source.url} target="_blank" rel="noreferrer">
      {corpusHandle(corpus)}
    </a>
  ) : (
    corpusHandle(corpus)
  );
  return (
    <span className="corpus-id">
      {handle} · {intl.formatMessage({ id: `corpus.tier.${corpus.tier}` })} ·{' '}
      {corpus.language} · {corpus.edition} (
      {intl.formatMessage({ id: `corpus.editionStatus.${corpus.edition_status}` })})
    </span>
  );
}

export function FallbackNote({ r }: { r: ResolvedParagraph }) {
  const intl = useIntl();
  if (r.withheld) {
    return (
      <p className="corpus-line fallback">
        <FormattedMessage
          id="fallback.withheld"
          values={{ wanted: corpusHandle(r.wanted), reason: r.withheld.reason }}
        />
        {r.shown && (
          <>
            {' '}
            <FormattedMessage
              id="fallback.showing"
              values={{
                shown: corpusHandle(r.shown.corpus),
                tier: intl.formatMessage({
                  id: `corpus.tier.${r.shown.corpus.tier}`,
                }),
                language: r.shown.corpus.language,
              }}
            />
          </>
        )}
      </p>
    );
  }
  if (r.fallback && r.shown) {
    return (
      <p className="corpus-line fallback">
        <FormattedMessage
          id="fallback.missing"
          values={{
            wanted: corpusHandle(r.wanted),
            language: r.wanted.language,
            reason: r.reason,
          }}
        />{' '}
        <FormattedMessage
          id="fallback.showing"
          values={{
            shown: corpusHandle(r.shown.corpus),
            tier: intl.formatMessage({ id: `corpus.tier.${r.shown.corpus.tier}` }),
            language: r.shown.corpus.language,
          }}
        />
      </p>
    );
  }
  if (!r.shown) {
    return (
      <p className="corpus-line fallback">
        <FormattedMessage
          id="rules.gap"
          values={{ path: r.path, reason: r.reason }}
        />
      </p>
    );
  }
  return null;
}

export function MixedNote({
  fallbackCount,
  total,
  fallbackCorpus,
}: {
  fallbackCount: number;
  total: number;
  fallbackCorpus?: Corpus;
}) {
  if (fallbackCount === 0 || !fallbackCorpus) return null;
  // resolveParagraphs' `mixed` means some but not all fell back; every
  // paragraph falling back is a wholesale substitution, labelled as such
  const mixed = fallbackCount < total;
  return (
    <p className="corpus-line mixed">
      <FormattedMessage
        id={mixed ? 'fallback.mixed' : 'fallback.all'}
        values={{
          count: fallbackCount,
          total,
          shown: corpusHandle(fallbackCorpus),
        }}
      />
    </p>
  );
}

/** One paragraph: label, text, tier/source line, fallback note. */
export function Paragraph({
  r,
  label,
}: {
  r: ResolvedParagraph;
  label?: React.ReactNode;
}) {
  return (
    <div
      className={`rule-text${r.fallback ? ' fallback' : ''}`}
      lang={r.shown?.corpus.language}
    >
      <div>
        {label ?? <strong>{r.path}</strong>}
        {r.shown ? <> — {r.shown.para.text}</> : null}
      </div>
      {r.shown && (
        <p className="corpus-line">
          {r.shown.para.rule_title} · <CorpusLine corpus={r.shown.corpus} />
          {r.inherited && (
            <>
              {' · '}
              <FormattedMessage id="rules.inherited" />
            </>
          )}
        </p>
      )}
      <FallbackNote r={r} />
    </div>
  );
}

export function RuleParagraphs({
  cite,
  jurisdiction = BASE_JURISDICTION,
}: {
  cite: string;
  jurisdiction?: string;
}) {
  const corpusId = useCorpusId();
  const paths = paragraphsForCite(cite, jurisdiction);
  if (paths.length === 0) {
    const r = resolveParagraph(jurisdiction, cite, corpusId);
    return (
      <p className="corpus-line">
        <FormattedMessage
          id="rules.gap"
          values={{
            path: cite,
            reason: r.reason ?? 'not present in the skeleton',
          }}
        />
      </p>
    );
  }
  const { items, fallbackCount, fallbackCorpus } = resolveParagraphs(
    jurisdiction,
    paths,
    corpusId,
  );
  return (
    <div>
      <MixedNote
        fallbackCount={fallbackCount}
        total={items.length}
        fallbackCorpus={fallbackCorpus}
      />
      {items.map((r) => (
        <Paragraph key={r.path} r={r} />
      ))}
    </div>
  );
}
