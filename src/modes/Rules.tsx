// The rules reference: paragraph-keyed, deep-linkable (#/rules/27(a)(i)),
// quoted from the corpus the reader picked, with the USCG diagrams inline,
// the recorded known_omissions shown as first-class gaps, and the
// amendment state read from the declared edition (editions.json).

import { useEffect, useMemo, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { entriesForRule, factsForEntry, ruleOf } from '../data/cites';
import { applicability, images as imagesData, rules } from '../data/colregs';
import {
  corpusHandle,
  editionOf,
  instrumentOf,
  resolveParagraphs,
  ruleTitle,
} from '../data/corpora';
import { CorpusSwitcher } from '../components/CorpusSwitcher';
import { CorpusLine, MixedNote, Paragraph } from '../components/RuleParagraphs';
import { useCorpus } from '../state/corpusContext';
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
  const corpus = useCorpus();
  const edition = editionOf(corpus);
  const instrument = instrumentOf(corpus);

  const byRule = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const [path, para] of Object.entries(rules.paragraphs)) {
      const rule = para.rule ?? ruleOf(path);
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
    // the skeleton names figures per paragraph too
    for (const [path, para] of Object.entries(rules.paragraphs)) {
      const rule = para.rule ?? ruleOf(path);
      if (!m.has(rule)) m.set(rule, new Set());
      for (const img of para.images ?? []) m.get(rule)!.add(img);
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
          <FormattedMessage id="corpus.switcher.title" />
        </h3>
        <CorpusSwitcher
          corpusId={corpus.id}
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
        const entries = entriesForRule(rule);
        const title = ruleTitle(paths, corpus.id);
        const ruleImages = [...(imagesByRule.get(rule) ?? [])];
        const resolved = resolveParagraphs(paths, corpus.id);
        return (
          <div className="panel" key={rule} id={`rule-${rule}`}>
            <h3>
              Rule {rule}
              {title ? ` — ${title}` : ''}
            </h3>
            <MixedNote
              fallbackCount={resolved.fallbackCount}
              total={resolved.items.length}
              fallbackCorpus={resolved.fallbackCorpus}
            />
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
            {resolved.items.map((r) => {
              const p = r.path;
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
                      <a
                        href={serialize({
                          ...DEFAULT_STATE,
                          mode: 'rules',
                          rulePath: p,
                          corpus: corpus.id,
                        })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          patch({ rulePath: p });
                        }}
                        style={{ textDecoration: 'none' }}
                      >
                        <strong>{p}</strong>
                      </a>
                    }
                  />
                </div>
              );
            })}
            <p className="corpus-line">
              <CorpusLine corpus={corpus} link /> — {corpus.source.publisher}
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
