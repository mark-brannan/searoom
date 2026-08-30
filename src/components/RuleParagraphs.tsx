// Verbatim rule text for a cite, from the package corpus only — never
// translated app-side. Where a paragraph is missing from the corpus, say
// so explicitly (REQ-LANG-7: fallback is the consumer's job, and silence
// is not an option).

import { FormattedMessage } from 'react-intl';
import { paragraphsForCite } from '../data/cites';
import { corpus, rules } from '../data/colregs';

export function RuleParagraphs({ cite }: { cite: string }) {
  const paths = paragraphsForCite(cite);
  const gaps = rules.gaps.filter(
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
        const para = rules.paragraphs[p];
        return (
          <div key={p}>
            <div className="rule-text">
              <strong>{p}</strong> — {para.text}
            </div>
            <p className="corpus-line">
              {para.rule_title} · {corpus.source} ({corpus.tier},{' '}
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
