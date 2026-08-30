// The rules reference: paragraph-keyed, deep-linkable (#/rules/27(a)(i)),
// with the USCG diagrams inline, the five recorded known_omissions shown
// as first-class gaps, and the amendment-state teaching point.

import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { entriesForRule, factsForEntry, ruleOf } from '../data/cites';
import { applicability, corpus, images as imagesData, rules } from '../data/colregs';
import { serialize, DEFAULT_STATE } from '../state/urlState';
import type { AppState } from '../state/urlState';

function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}rule-images/${name}`;
}

function sandboxLink(entryId: string): string | undefined {
  const facts = factsForEntry(entryId);
  if (!facts) return undefined;
  return serialize({ ...DEFAULT_STATE, mode: 'sandbox', facts });
}

export function Rules({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);

  const byRule = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const path of Object.keys(rules.paragraphs)) {
      const rule = ruleOf(path);
      if (!groups.has(rule)) groups.set(rule, []);
      groups.get(rule)!.push(path);
    }
    return [...groups.entries()].sort(
      (a, b) => Number(a[0]) - Number(b[0]),
    );
  }, []);

  // paragraph -> images that illustrate it (via the entries citing it)
  const imagesByRule = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of applicability.entries) {
      const rule = ruleOf(e.cite);
      if (!m.has(rule)) m.set(rule, new Set());
      for (const img of e.images ?? []) m.get(rule)!.add(img);
    }
    return m;
  }, []);

  useEffect(() => {
    if (state.rulePath && containerRef.current) {
      const el = containerRef.current.querySelector(
        `[data-path="${CSS.escape(state.rulePath)}"]`,
      );
      el?.scrollIntoView({ block: 'center' });
    }
  }, [state.rulePath]);

  return (
    <div ref={containerRef}>
      <div className="panel">
        <h2>
          <FormattedMessage id="rules.title" />
        </h2>
        <p className="elim">
          <FormattedMessage id="rules.subtitle" />
        </p>
        <p className="corpus-line">
          <FormattedMessage id="rules.corpusNote" />
        </p>
      </div>

      <div className="panel">
        <h3>
          <FormattedMessage id="rules.amendment.title" />
        </h3>
        <p className="elim">
          <FormattedMessage
            id="rules.amendment.p1"
            values={{ retrieved: rules.retrieved }}
          />
        </p>
        <p className="elim">
          <FormattedMessage id="rules.amendment.p2" />
        </p>
        <p className="elim">
          <a
            href="https://github.com/mark-brannan/colregs/blob/main/docs/verification/2026-08-30-q6-q8.md"
            target="_blank"
            rel="noreferrer"
          >
            <FormattedMessage id="rules.amendment.link" />
          </a>
        </p>
      </div>

      <div className="panel">
        <h3>
          <FormattedMessage id="rules.knownOmissions.title" />
        </h3>
        <p className="elim">
          <FormattedMessage id="rules.knownOmissions.intro" />
        </p>
        {applicability.known_omissions.map((o) => (
          <div className="entry" key={o.cite}>
            <div className="entry-head">
              <strong>{o.cite}</strong>
              <span className="badge">gap</span>
            </div>
            <p className="elim">{o.what}</p>
            <p className="corpus-line">{o.why}</p>
          </div>
        ))}
      </div>

      {byRule.map(([rule, paths]) => {
        const entries = entriesForRule(rule);
        const ruleTitle = rules.paragraphs[paths[0]].rule_title;
        const ruleImages = [...(imagesByRule.get(rule) ?? [])];
        return (
          <div className="panel" key={rule} id={`rule-${rule}`}>
            <h3>
              Rule {rule} — {ruleTitle}
            </h3>
            {entries.length > 0 && (
              <div className="chips">
                {entries.map((e) => {
                  const link = sandboxLink(e.id);
                  return (
                    <a
                      key={e.id}
                      className="chip"
                      href={link}
                      onClick={(ev) => {
                        if (!link) return;
                        ev.preventDefault();
                        history.pushState(null, '', link);
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                      }}
                      title={intl.formatMessage({ id: 'rules.openInSandbox' })}
                    >
                      {e.id} → <FormattedMessage id="rules.openInSandbox" />
                    </a>
                  );
                })}
              </div>
            )}
            {paths.map((p) => {
              const para = rules.paragraphs[p];
              const selected = state.rulePath === p;
              return (
                <div
                  key={p}
                  data-path={p}
                  className="rule-text"
                  style={
                    selected
                      ? { borderLeftColor: 'var(--green)' }
                      : undefined
                  }
                >
                  <a
                    href={serialize({
                      ...DEFAULT_STATE,
                      mode: 'rules',
                      rulePath: p,
                    })}
                    onClick={(ev) => {
                      ev.preventDefault();
                      patch({ rulePath: p });
                    }}
                    style={{ textDecoration: 'none' }}
                  >
                    <strong>{p}</strong>
                  </a>{' '}
                  {para.text}
                </div>
              );
            })}
            {rules.gaps
              .filter((g) => ruleOf(g.path) === rule)
              .map((g) => (
                <p key={g.path} className="corpus-line">
                  <FormattedMessage
                    id="rules.gap"
                    values={{ path: g.path, reason: g.reason }}
                  />
                </p>
              ))}
            <p className="corpus-line">
              {corpus.source} ({corpus.tier}, {corpus.language}) —{' '}
              <a href={corpus.sourceUrl} target="_blank" rel="noreferrer">
                {new URL(corpus.sourceUrl).hostname}
              </a>
            </p>
            {ruleImages.length > 0 && (
              <details>
                <summary>USCG diagrams ({ruleImages.length})</summary>
                {ruleImages.map((img) => {
                  const meta = imagesData.images[img];
                  return (
                    <img
                      key={img}
                      className="rule-image"
                      src={imageUrl(img)}
                      alt={meta?.captions?.[0] ?? `USCG diagram ${img}`}
                      loading="lazy"
                    />
                  );
                })}
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
