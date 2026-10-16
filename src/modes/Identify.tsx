// The reverse field guide: build what you see, and the app runs the
// reverse direction — which fact records could explain these lights,
// from which aspects. Honest about indistinguishability.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppState, usePatch } from '../state/store';
import { describeFacts } from '../components/factLabel';
import { identifyCandidates } from '../engine/identify';
import type { Arrangement, SeenLight } from '../engine/identify';
import { Glow, bearingLabel, lightFill } from 'nav-wright';
import { DEFAULT_STATE, serialize } from '../state/urlState';

const COLORS: SeenLight['color'][] = ['white', 'red', 'green', 'yellow'];

export function Identify() {
  const state = useAppState();
  const patch = usePatch();
  const intl = useIntl();
  const [seen, setSeen] = useState<SeenLight[]>([]);
  const [flashing, setFlashing] = useState(false);
  const [kind, setKind] = useState<SeenLight['kind']>(undefined);
  const [arrangement, setArrangement] = useState<Arrangement>('free');

  const candidates = useMemo(
    () => identifyCandidates(seen, state.jurisdiction, arrangement),
    [seen, state.jurisdiction, arrangement],
  );

  const aspectsOf = (thetas: number[]): string => {
    const labels = [...new Set(thetas.map(bearingLabel))];
    return labels
      .map((l) => intl.formatMessage({ id: `aspect.${l}` }))
      .join(' · ');
  };

  return (
    <div>
      <div className="panel">
        <h2>
          <FormattedMessage id="identify.title" />
        </h2>
        <p className="elim">
          <FormattedMessage id="identify.intro" />
        </p>
        <div className="seen-controls">
          <span className="fact-label" style={{ margin: 0 }}>
            <FormattedMessage id="identify.pick.color" />
          </span>
          {COLORS.map((c) => (
            <button
              key={c}
              className="color-btn"
              style={{ background: lightFill(c) }}
              aria-label={`${intl.formatMessage({ id: 'identify.pick.add' })}: ${intl.formatMessage({ id: `color.${c}` })}`}
              onClick={() => setSeen((s) => [...s, { color: c, flashing, kind }])}
            />
          ))}
          <label className="check-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={flashing}
              onChange={(e) => setFlashing(e.target.checked)}
            />
            <FormattedMessage id="light.flashing" />
          </label>
        </div>
        <div className="seen-controls">
          <label className="check-row" style={{ margin: 0 }}>
            <FormattedMessage id="identify.kind.label" />{' '}
            <select
              value={kind ?? ''}
              onChange={(e) =>
                setKind((e.target.value || undefined) as SeenLight['kind'])
              }
            >
              <option value="">
                {intl.formatMessage({ id: 'identify.kind.any' })}
              </option>
              <option value="masthead">
                {intl.formatMessage({ id: 'identify.kind.masthead' })}
              </option>
              <option value="all_round">
                {intl.formatMessage({ id: 'identify.kind.all_round' })}
              </option>
            </select>
          </label>
          <label className="check-row" style={{ margin: 0 }}>
            <FormattedMessage id="identify.arrangement.label" />{' '}
            <select
              value={arrangement}
              onChange={(e) => setArrangement(e.target.value as Arrangement)}
            >
              <option value="free">
                {intl.formatMessage({ id: 'identify.arrangement.free' })}
              </option>
              <option value="vertical">
                {intl.formatMessage({ id: 'identify.arrangement.vertical' })}
              </option>
            </select>
          </label>
        </div>

        <h3 style={{ marginTop: 14 }}>
          <FormattedMessage id="identify.picked.title" />
        </h3>
        {seen.length === 0 ? (
          <p className="elim">
            <FormattedMessage id="identify.picked.empty" />
          </p>
        ) : (
          <>
            <svg
              viewBox="0 0 440 120"
              className="scene-svg scene-svg-black"
              aria-hidden="true"
            >
              <rect width="440" height="120" fill="#000" />
              {seen.map((l, i) => (
                <Glow
                  key={i}
                  x={arrangement === 'vertical' ? 220 : 60 + i * 50}
                  y={arrangement === 'vertical' ? 20 + i * 22 : 60}
                  color={l.color}
                  flashing={l.flashing}
                  r={6}
                />
              ))}
            </svg>
            <div className="seen-list">
              {seen.map((l, i) => (
                <button
                  key={i}
                  className="seen-light"
                  onClick={() =>
                    setSeen((s) => s.filter((_, j) => j !== i))
                  }
                  aria-label={intl.formatMessage(
                    { id: 'identify.remove' },
                    {
                      light: intl.formatMessage({ id: `color.${l.color}` }),
                    },
                  )}
                >
                  <span
                    className="dot"
                    style={{ background: lightFill(l.color) }}
                  />
                  <FormattedMessage id={`color.${l.color}`} />
                  {l.kind && (
                    <>
                      {' '}
                      <FormattedMessage id={`identify.kind.${l.kind}`} />
                    </>
                  )}
                  {l.flashing && (
                    <>
                      {' '}
                      (<FormattedMessage id="light.flashing" />)
                    </>
                  )}
                  ✕
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {seen.length > 0 && (
        <div className="panel">
          <h2>
            <FormattedMessage
              id="identify.candidates.title"
              values={{ count: candidates.length }}
            />
          </h2>
          {candidates.length === 0 && (
            <p className="elim">
              <FormattedMessage id="identify.candidates.explainNone" />
            </p>
          )}
          {candidates.length === 1 && (
            <p className="elim">
              <FormattedMessage id="identify.exact" />
            </p>
          )}
          {candidates.length > 1 && (
            <p className="elim">
              <FormattedMessage id="identify.candidates.explainMany" />
              {arrangement === 'free' && seen.length > 1 && (
                <>
                  {' '}
                  <FormattedMessage id="identify.candidates.tryOrder" />
                </>
              )}
            </p>
          )}
          {candidates.map((c, i) => (
            <div className="candidate" key={i}>
              <FormattedMessage
                id="identify.candidate.aspect"
                values={{
                  facts: describeFacts(intl, c.facts),
                  aspect: aspectsOf(c.thetas),
                }}
              />{' '}
              <a
                href={serialize({
                  ...DEFAULT_STATE,
                  mode: 'sandbox',
                  facts: c.facts,
                  view: 'bearing',
                  theta: c.thetas[0],
                })}
                onClick={(ev) => {
                  ev.preventDefault();
                  patch({
                    mode: 'sandbox',
                    facts: c.facts,
                    view: 'bearing',
                    theta: c.thetas[0],
                    displayIndex: 0,
                    additionsOn: [],
                  });
                }}
              >
                <FormattedMessage id="identify.openSandbox" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
