// The reverse field guide: build what you see, and the app runs the
// reverse direction — which fact records could explain these lights,
// from which aspects. Honest about indistinguishability.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { describeFacts } from '../components/factLabel';
import { identifyCandidates } from '../engine/identify';
import type { SeenLight } from '../engine/identify';
import { bearingLabel } from '../render/BearingView';
import { Glow, lightFill } from '../render/svg';
import { DEFAULT_STATE, serialize } from '../state/urlState';
import type { AppState } from '../state/urlState';

const COLORS: SeenLight['color'][] = ['white', 'red', 'green', 'yellow'];

export function Identify({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const intl = useIntl();
  const [seen, setSeen] = useState<SeenLight[]>([]);
  const [flashing, setFlashing] = useState(false);
  void state;

  const candidates = useMemo(() => identifyCandidates(seen), [seen]);

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
              onClick={() => setSeen((s) => [...s, { color: c, flashing }])}
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
                  x={60 + i * 50}
                  y={60}
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
