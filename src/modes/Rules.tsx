// The rules reference: paragraph-keyed, deep-linkable (#/rules/27(a)(i)),
// quoted from the corpus the reader picked, with the USCG diagrams inline,
// the recorded known_omissions shown as first-class gaps, and the
// amendment state read from the declared edition (editions.json).
//
// Everything below is keyed off the jurisdiction in view: the skeleton is
// that jurisdiction's resolved one, so an Inland-only path appears and a path
// Inland does not spell does not. A restated path is marked as reading
// differently here, and a path the source voids carries colregs' own reason
// for the absence rather than going silently missing (colregs ADR 0020).
// The corpus is one of that jurisdiction's; an inherited path reads from the
// base corpus and says so, a missing one falls back visibly (REQ-LANG-7).

import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { CorpusSwitcher } from '../components/CorpusSwitcher';
import { CorpusLine, MixedNote, Paragraph } from '../components/RuleParagraphs';
import { entriesForRule, factsForEntry, jurisdictionForEntry, ruleOf } from '../data/cites';
import { applicability, images as imagesData } from '../data/colregs';
import {
  corpusHandle,
  editionOf,
  gapsFor,
  instrumentOf,
  resolveParagraphs,
  ruleTitleFor,
} from '../data/corpusText';
import type { Corpus } from '../data/corpusText';
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
import { useCorpus } from '../state/corpusContext';
import { serialize, DEFAULT_STATE, defaultCorpusFor } from '../state/urlState';
import type { AppState } from '../state/urlState';

function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}rule-images/${name}`;
}

function sandboxLink(entryId: string, jurisdiction: string): string | undefined {
  const facts = factsForEntry(entryId);
  if (!facts) return undefined;
  const j = jurisdictionForEntry(entryId) ?? jurisdiction;
  return serialize({
    ...DEFAULT_STATE,
    mode: 'sandbox',
    jurisdiction: j,
    corpus: defaultCorpusFor(j),
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
  const { jurisdiction } = state;
  const meta = jurisdictionMeta(jurisdiction);
  const corpus = useCorpus();
  const edition = editionOf(corpus);
  const instrument = instrumentOf(corpus);

  // identifiers never render raw in learner-facing copy (REQ-LANG-2): the
  // jurisdiction reaches prose as its catalog label, not as `us/inland`
  const jurisdictionName = intl.formatMessage({
    id: `jurisdiction.${jurisdiction}`,
    defaultMessage: meta?.instrument ?? jurisdiction,
  });

  // the short form is what fits a badge beside a paragraph path
  const jurisdictionShort = intl.formatMessage({
    id: `jurisdiction.short.${jurisdiction}`,
    defaultMessage: jurisdictionName,
  });

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

  // a corpus's recorded gaps for paths the skeleton does not carry; a gap
  // on a skeleton path is already reported inline, beside the paragraph
  const looseGaps = useMemo(
    () => gapsFor(corpus).filter((g) => !skeleton[g.path]),
    [corpus, skeleton],
  );

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
        <p className="corpus-line">
          <FormattedMessage id="rules.corpusNote" />
        </p>
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

      <div className="panel">
        <h3>
          <FormattedMessage id="corpus.switcher.title" />
        </h3>
        <CorpusSwitcher
          corpusId={corpus.id}
          jurisdiction={jurisdiction}
          onPick={(id) => patch({ corpus: id })}
        />
        <p className="picker-note">
          <FormattedMessage id="corpus.switcher.note" />
        </p>
        <p className="corpus-line">
          <CorpusLine corpus={corpus} link /> ·{' '}
          <FormattedMessage
            id="corpus.retrieved"
            values={{ retrieved: corpus.source.retrieved ?? '—' }}
          />
        </p>
        <p className="corpus-line">
          <FormattedMessage
            id="corpus.rights"
            values={{
              text: corpus.rights.source_text,
              basis: corpus.rights.redistribution_basis,
            }}
          />
        </p>
        {corpus.rights.attribution && (
          <p className="corpus-line">{corpus.rights.attribution}</p>
        )}
        {corpus.note && <p className="corpus-line">{corpus.note}</p>}
      </div>

      {jurisdiction !== BASE_JURISDICTION && (
        <div className="panel">
          <h3>
            <FormattedMessage
              id="rules.differs.title"
              values={{ jurisdiction: jurisdictionName }}
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

      <div className="panel">
        <h3>
          <FormattedMessage id="rules.amendment.title" />
        </h3>
        <p className="elim">
          <FormattedMessage
            id="rules.amendment.p1"
            values={{
              instrument: instrument ?? corpus.edition,
              edition: corpus.edition,
              amended: edition?.amended_through ?? '—',
              inForce: edition?.in_force ?? '—',
              corpus: corpusHandle(corpus),
              status: intl.formatMessage({
                id: `corpus.editionStatus.${corpus.edition_status}`,
              }),
            }}
          />
        </p>
        {edition?.note && <p className="corpus-line">{edition.note}</p>}
        {jurisdiction === BASE_JURISDICTION && (
          <>
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
          </>
        )}
      </div>

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
        const spelled = paths.filter((p) => skeleton[p]);
        const resolved = resolveParagraphs(jurisdiction, spelled, corpus.id);
        const byPath = new Map(resolved.items.map((r) => [r.path, r]));
        const ruleTitle = ruleTitleFor(jurisdiction, spelled, corpus.id);
        const ruleImages = [...(imagesByRule.get(rule) ?? [])];
        // every corpus a paragraph of this rule was read from, in order
        const sources = new Map<string, Corpus>();
        for (const r of resolved.items) {
          if (r.shown) sources.set(r.shown.corpus.id, r.shown.corpus);
        }
        return (
          <div className="panel" key={rule} id={`rule-${rule}`}>
            <h3>
              Rule {rule}
              {ruleTitle ? ` — ${ruleTitle}` : ''}
            </h3>
            <MixedNote
              fallbackCount={resolved.fallbackCount}
              total={resolved.items.length}
              fallbackCorpus={resolved.fallbackCorpus}
            />
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
              const r = byPath.get(p);
              if (!r) {
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
              const selected = state.rulePath === p;
              return (
                <div
                  key={p}
                  data-path={p}
                  style={
                    selected
                      ? { borderLeft: '2px solid var(--green)', paddingLeft: 6 }
                      : undefined
                  }
                >
                  <Paragraph
                    r={r}
                    label={
                      <>
                        <a
                          href={serialize({ ...state, mode: 'rules', rulePath: p })}
                          onClick={(ev) => {
                            ev.preventDefault();
                            patch({ rulePath: p });
                          }}
                          style={{ textDecoration: 'none' }}
                        >
                          <strong>{p}</strong>
                        </a>
                        {restated.has(p) && (
                          <>
                            {' '}
                            <span className="badge">
                              <FormattedMessage
                                id={
                                  isJurisdictionOnly(jurisdiction, p)
                                    ? 'rules.only'
                                    : 'rules.restated'
                                }
                                values={{ jurisdiction: jurisdictionShort }}
                              />
                            </span>
                          </>
                        )}
                      </>
                    }
                  />
                  {why && <p className="corpus-line">{why}</p>}
                </div>
              );
            })}
            {looseGaps
              .filter((g) => ruleOf(g.path) === rule)
              .map((g) => (
                <p key={g.path} className="corpus-line">
                  <FormattedMessage
                    id="rules.gap"
                    values={{ path: g.path, reason: g.reason }}
                  />
                </p>
              ))}
            {[...sources.values()].map((c) => (
              <p className="corpus-line" key={c.id}>
                <CorpusLine corpus={c} link /> — {c.source.publisher}
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
