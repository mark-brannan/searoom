// The rules reference: paragraph-keyed, deep-linkable (#/rules/27(a)(i)),
// with the USCG diagrams inline, the recorded known_omissions shown as
// first-class gaps, and the amendment-state teaching point.
//
// Everything below is keyed off the jurisdiction in view: the skeleton is
// that jurisdiction's resolved one, so an Inland-only path appears and a path
// Inland does not spell does not. A restated path is marked as reading
// differently here, and a path the source voids carries colregs' own reason
// for the absence rather than going silently missing (colregs ADR 0020).

import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { entriesForRule, factsForEntry, jurisdictionForEntry, ruleOf } from '../data/cites';
import { applicability, images as imagesData } from '../data/colregs';
import { corpusFor, gapsFor, ruleTitleFor, textFor } from '../data/corpusText';
import {
  BASE_JURISDICTION,
  entrySuppressionsFor,
  isJurisdictionOnly,
  jurisdictionMeta,
  pathSuppressionsFor,
  resolveEntries,
  resolveSkeleton,
  restatedPathsFor,
} from '../data/jurisdictions';
import { jurisdictionExplainers } from '../data/signposts';
import { serialize, DEFAULT_STATE } from '../state/urlState';
import type { AppState } from '../state/urlState';

function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}rule-images/${name}`;
}

function sandboxLink(entryId: string, jurisdiction: string): string | undefined {
  const facts = factsForEntry(entryId);
  if (!facts) return undefined;
  return serialize({
    ...DEFAULT_STATE,
    mode: 'sandbox',
    jurisdiction: jurisdictionForEntry(entryId) ?? jurisdiction,
    facts,
  });
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
  const { jurisdiction, locale } = state;
  const meta = jurisdictionMeta(jurisdiction);
  const corpus = corpusFor(jurisdiction, locale);

  const sourcesOf = (paths: string[]) => {
    const byId = new Map<string, ReturnType<typeof corpusFor>>();
    for (const p of paths) {
      const t = textFor(jurisdiction, p, locale);
      if (t) byId.set(t.corpus.id, t.corpus);
    }
    return [...byId.values()];
  };

  const skeleton = useMemo(() => resolveSkeleton(jurisdiction), [jurisdiction]);
  const restated = useMemo(
    () => new Set(restatedPathsFor(jurisdiction)),
    [jurisdiction],
  );
  // A path the source spells but voids reaches the reader two ways: the
  // skeleton delta drops paths the source does not spell at all, and an entry
  // tombstone names a paragraph whose norm the source deliberately withholds
  // — Rule 28's "[Reserved]" is the second kind.
  const voided = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of pathSuppressionsFor(jurisdiction)) m.set(s.path, s.why);
    for (const s of entrySuppressionsFor(jurisdiction)) {
      if (!m.has(s.cite)) m.set(s.cite, s.why);
    }
    return m;
  }, [jurisdiction]);

  const byRule = useMemo(() => {
    const groups = new Map<string, string[]>();
    // every rule the jurisdiction spells, plus the rules whose only trace
    // here is an absence, so a voided path is never silently missing
    const paths = [...Object.keys(skeleton), ...voided.keys()];
    for (const path of paths) {
      const rule = ruleOf(path);
      if (!groups.has(rule)) groups.set(rule, []);
      const list = groups.get(rule)!;
      if (!list.includes(path)) list.push(path);
    }
    return [...groups.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [skeleton, voided]);

  // rule -> images that illustrate it, via the entries actually in force
  // here: a tombstoned entry's figure would illustrate a norm this
  // jurisdiction does not carry
  const imagesByRule = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of resolveEntries(jurisdiction)) {
      const rule = ruleOf(e.cite);
      if (!m.has(rule)) m.set(rule, new Set());
      for (const img of e.images ?? []) m.get(rule)!.add(img);
    }
    return m;
  }, [jurisdiction]);

  useEffect(() => {
    if (state.rulePath && containerRef.current) {
      const el = containerRef.current.querySelector(
        `[data-path="${CSS.escape(state.rulePath)}"]`,
      );
      el?.scrollIntoView({ block: 'center' });
    }
  }, [state.rulePath, jurisdiction]);

  return (
    <div ref={containerRef}>
      <div className="panel">
        <h2>
          <FormattedMessage id="rules.title" />
        </h2>
        <p className="elim">
          <FormattedMessage id="rules.subtitle" />
        </p>
        {jurisdiction === BASE_JURISDICTION && (
          <p className="corpus-line">
            <FormattedMessage id="rules.corpusNote" />
          </p>
        )}
        <p className="corpus-line">
          <FormattedMessage
            id="rules.instrument"
            values={{
              instrument: meta?.instrument ?? jurisdiction,
              edition: meta?.skeleton ?? '',
              amendedThrough: meta?.amendedThrough ?? '',
            }}
          />
        </p>
      </div>

      {jurisdiction !== BASE_JURISDICTION && (
        <div className="panel">
          <h3>
            <FormattedMessage
              id="rules.differs.title"
              values={{ jurisdiction }}
            />
          </h3>
          <p className="elim">
            <FormattedMessage
              id="rules.differs.p1"
              values={{
                restated: restated.size,
                voided: voided.size,
                instrument: meta?.instrument ?? jurisdiction,
              }}
            />
          </p>
          {(jurisdictionExplainers[jurisdiction] ?? []).map((key) => (
            <p className="elim" key={key}>
              <FormattedMessage id={key} />
            </p>
          ))}
          <div className="chips">
            {[...restated]
              .sort()
              .map((p) => (
                <a
                  key={p}
                  className="chip"
                  href={serialize({ ...state, mode: 'rules', rulePath: p })}
                  onClick={(ev) => {
                    ev.preventDefault();
                    patch({ rulePath: p });
                  }}
                >
                  {p}
                  {isJurisdictionOnly(jurisdiction, p) ? ' +' : ''}
                </a>
              ))}
          </div>
          <p className="elim">
            <a
              href="https://github.com/mark-brannan/colregs/blob/main/docs/adr/0020-skeleton-is-a-delta.md"
              target="_blank"
              rel="noreferrer"
            >
              <FormattedMessage id="rules.differs.link" />
            </a>
          </p>
        </div>
      )}

      {jurisdiction === BASE_JURISDICTION && (
      <div className="panel">
        <h3>
          <FormattedMessage id="rules.amendment.title" />
        </h3>
        <p className="elim">
          <FormattedMessage
            id="rules.amendment.p1"
            values={{ retrieved: corpus.source.retrieved ?? '—' }}
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
      )}

      <div className="panel">
        <h3>
          <FormattedMessage id="rules.knownOmissions.title" />
        </h3>
        <p className="elim">
          <FormattedMessage id="rules.knownOmissions.intro" />
        </p>
        {(applicability.known_omissions ?? []).map((o) => (
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
        const entries = entriesForRule(rule, jurisdiction);
        const ruleTitle = ruleTitleFor(jurisdiction, paths, locale);
        const ruleImages = [...(imagesByRule.get(rule) ?? [])];
        return (
          <div className="panel" key={rule} id={`rule-${rule}`}>
            <h3>
              Rule {rule}
              {ruleTitle ? ` — ${ruleTitle}` : ''}
            </h3>
            {entries.length > 0 && (
              <div className="chips">
                {entries.map((e) => {
                  const link = sandboxLink(e.id, jurisdiction);
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
              const why = voided.get(p);
              if (why && !skeleton[p]) {
                return (
                  <div key={p} data-path={p} className="rule-text">
                    <strong>{p}</strong>{' '}
                    <span className="badge">
                      <FormattedMessage id="rules.voided" />
                    </span>
                    <p className="corpus-line">{why}</p>
                  </div>
                );
              }
              const resolved = textFor(jurisdiction, p, locale);
              const selected = state.rulePath === p;
              return (
                <div
                  key={p}
                  data-path={p}
                  className="rule-text"
                  style={
                    selected ? { borderLeftColor: 'var(--green)' } : undefined
                  }
                >
                  <a
                    href={serialize({ ...state, mode: 'rules', rulePath: p })}
                    onClick={(ev) => {
                      ev.preventDefault();
                      patch({ rulePath: p });
                    }}
                    style={{ textDecoration: 'none' }}
                  >
                    <strong>{p}</strong>
                  </a>{' '}
                  {restated.has(p) && (
                    <span className="badge">
                      <FormattedMessage
                        id={
                          isJurisdictionOnly(jurisdiction, p)
                            ? 'rules.only'
                            : 'rules.restated'
                        }
                        values={{ jurisdiction }}
                      />
                    </span>
                  )}{' '}
                  {resolved ? (
                    resolved.text
                  ) : (
                    <FormattedMessage
                      id="rules.gap"
                      values={{
                        path: p,
                        reason: 'not present in the corpus',
                      }}
                    />
                  )}
                  {why && <p className="corpus-line">{why}</p>}
                </div>
              );
            })}
            {gapsFor(jurisdiction, locale)
              .filter((g) => ruleOf(g.path) === rule)
              .map((g) => (
                <p key={g.path} className="corpus-line">
                  <FormattedMessage
                    id="rules.gap"
                    values={{ path: g.path, reason: g.reason }}
                  />
                </p>
              ))}
            {sourcesOf(paths).map((c) => (
              <p className="corpus-line" key={c.id}>
                {c.source.publisher} ({c.tier}, {c.language}) —{' '}
                <a href={c.source.url} target="_blank" rel="noreferrer">
                  {new URL(c.source.url).hostname}
                </a>
              </p>
            ))}
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
