// Verbatim rule text for a cite, from the package corpus only — never
// translated app-side. Where a paragraph is missing from the corpus, say
// so explicitly (REQ-LANG-7: fallback is the consumer's job, and silence
// is not an option).

import { FormattedMessage } from 'react-intl';
import { paragraphsForCite } from '../data/cites';
import { gapsFor, textFor } from '../data/corpusText';
import { BASE_JURISDICTION } from '../data/jurisdictions';

export function RuleParagraphs({
  cite,
  jurisdiction = BASE_JURISDICTION,
  locale = 'en',
}: {
  cite: string;
  jurisdiction?: string;
  locale?: string;
}) {
  const paths = paragraphsForCite(cite, jurisdiction);
  const gaps = gapsFor(jurisdiction, locale).filter(
    (g) => g.path === cite || paths.includes(g.path),
  );
  if (paths.length === 0 && gaps.length === 0) {
    return (
      <p className="corpus-line">
        <FormattedMessage
          id="rules.gap"
          values={{ path: cite, reason: 'not present in the corpus' }}
        />
      </p>
    );
  }
  return (
    <div>
      {paths.map((p) => {
        const resolved = textFor(jurisdiction, p, locale);
        if (!resolved) {
          return (
            <p className="corpus-line" key={p}>
              <FormattedMessage
                id="rules.gap"
                values={{ path: p, reason: 'not present in the corpus' }}
              />
            </p>
          );
        }
        const { corpus } = resolved;
        return (
          <div key={p}>
            <div className="rule-text">
              <strong>{p}</strong> — {resolved.text}
            </div>
            <p className="corpus-line">
              {resolved.ruleTitle} · {corpus.source.publisher} ({corpus.tier},{' '}
              {corpus.language})
            </p>
          </div>
        );
      })}
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
