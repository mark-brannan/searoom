// The reverse field guide: build what you see, and the app runs the
// reverse direction — which fact records could explain these lights,
// from which aspects. Honest about indistinguishability.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { IntlShape } from 'react-intl';
import type { FactRecord } from '../engine/types';
import { usePatch, useJurisdiction } from '../state/store';
import { describeFacts, enumLabel } from '../components/factLabel';
import {
  ambiguities,
  answered,
  identifyByAnswers,
  identifyCandidates,
} from '../engine/identify';
import type { Answers, Arrangement, SeenLight } from '../engine/identify';
import { bearingLabel, lightFill } from 'nav-wright';
import { Scene } from '../components/Scene';
import { serialize, stateWith } from '../state/urlState';

const COLORS: SeenLight['color'][] = ['white', 'red', 'green', 'yellow'];

type Flow = 'build' | 'ask';

const FEW = 6;

/** What she is doing, or how she is driven and where, when she is doing nothing. */
function shortName(intl: IntlShape, facts: FactRecord): string {
  const label = (v: unknown) => enumLabel(intl, v) ?? '';
  const a = facts['fact:activity'];
  if (typeof a === 'string' && a !== 'activity:none') return label(a);
  const p = facts['fact:propulsion'];
  const pos = facts['fact:position'];
  return [p, pos]
    .filter((v) => typeof v === 'string')
    .map((v, i) => (i === 0 ? label(v) : label(v).toLowerCase()))
    .join(' ');
}

const NO_ANSWERS: Answers = { masthead: [], sidelights: 'none', others: [] };

const SIDELIGHTS: Answers['sidelights'][] = ['none', 'red', 'green', 'both'];

/** The colour buttons: each adds one light, with the flags set beside them. */
function ColorPicker({
  flashing,
  onAdd,
}: {
  flashing: boolean;
  onAdd: (l: SeenLight) => void;
}) {
  const intl = useIntl();
  return (
    <>
      {COLORS.map((c) => (
        <button
          key={c}
          className="color-btn"
          style={{ background: lightFill(c) }}
          aria-label={`${intl.formatMessage({ id: 'identify.pick.add' })}: ${intl.formatMessage({ id: `color.${c}` })}`}
          onClick={() => onAdd({ color: c, flashing })}
        />
      ))}
    </>
  );
}

/** The lights picked so far, each a button that removes it. */
function SeenList({
  seen,
  onRemove,
}: {
  seen: SeenLight[];
  onRemove: (i: number) => void;
}) {
  const intl = useIntl();
  return (
    <div className="seen-list">
      {seen.map((l, i) => (
        <button
          key={i}
          className="seen-light"
          onClick={() => onRemove(i)}
          aria-label={intl.formatMessage(
            { id: 'identify.remove' },
            { light: intl.formatMessage({ id: `color.${l.color}` }) },
          )}
        >
          <span className="dot" style={{ background: lightFill(l.color) }} />
          <FormattedMessage id={`color.${l.color}`} />
          {l.kind && (
            <>
              {' '}
              <FormattedMessage id={`identify.kind.${l.kind}`} />
            </>
          )}
          {l.seat && (
            <>
              {' '}
              <FormattedMessage id={`identify.seat.${l.seat}`} />
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
  );
}

const FlashingBox = ({
  flashing,
  setFlashing,
}: {
  flashing: boolean;
  setFlashing: (b: boolean) => void;
}) => (
  <label className="check-row" style={{ margin: 0 }}>
    <input
      type="checkbox"
      checked={flashing}
      onChange={(e) => setFlashing(e.target.checked)}
    />
    <FormattedMessage id="light.flashing" />
  </label>
);

const without = <T,>(xs: T[], i: number) => xs.filter((_, j) => j !== i);

export function Identify() {
  const jurisdiction = useJurisdiction();
  const patch = usePatch();
  const intl = useIntl();
  const [flow, setFlow] = useState<Flow>('build');
  const [seen, setSeen] = useState<SeenLight[]>([]);
  const [answers, setAnswers] = useState<Answers>(NO_ANSWERS);
  const [flashing, setFlashing] = useState(false);
  const [kind, setKind] = useState<SeenLight['kind']>(undefined);
  const [seat, setSeat] = useState<SeenLight['seat']>(undefined);
  const [arrangement, setArrangement] = useState<Arrangement>('free');

  const candidates = useMemo(
    () =>
      flow === 'build'
        ? identifyCandidates(seen, jurisdiction, arrangement)
        : identifyByAnswers(answers, jurisdiction),
    [flow, seen, answers, jurisdiction, arrangement],
  );
  const groups = useMemo(() => ambiguities(candidates), [candidates]);
  const started = flow === 'build' ? seen.length > 0 : answered(answers);

  const aspectsOf = (thetas: number[]): string => {
    const labels = [...new Set(thetas.map(bearingLabel))];
    return labels
      .map((l) => intl.formatMessage({ id: `aspect.${l}` }))
      .join(' · ');
  };
  // one line per ambiguity: each situation named once, the long tail counted
  const few = (xs: string[]): string[] => {
    const names = [...new Set(xs)];
    if (names.length <= FEW) return names;
    return [
      ...names.slice(0, FEW),
      intl.formatMessage(
        { id: 'identify.ambiguity.more' },
        { count: names.length - FEW },
      ),
    ];
  };
  const list = (xs: string[]) =>
    new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(xs);

  return (
    <div>
      <div className="panel">
        <h2>
          <FormattedMessage id="identify.title" />
        </h2>
        <p className="elim">
          <FormattedMessage id="identify.intro" />
        </p>
        <div className="seen-controls" role="radiogroup">
          {(['build', 'ask'] as const).map((f) => (
            <label key={f} className="check-row" style={{ margin: 0 }}>
              <input
                type="radio"
                name="identify-flow"
                checked={flow === f}
                onChange={() => setFlow(f)}
              />
              <FormattedMessage id={`identify.flow.${f}`} />
            </label>
          ))}
        </div>

        {flow === 'build' ? (
          <>
            <div className="seen-controls">
              <span className="fact-label" style={{ margin: 0 }}>
                <FormattedMessage id="identify.pick.color" />
              </span>
              <ColorPicker
                flashing={flashing}
                onAdd={(l) => setSeen((s) => [...s, { ...l, kind, seat }])}
              />
              <FlashingBox flashing={flashing} setFlashing={setFlashing} />
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
                <FormattedMessage id="identify.seat.label" />{' '}
                <select
                  value={seat ?? ''}
                  onChange={(e) =>
                    setSeat((e.target.value || undefined) as SeenLight['seat'])
                  }
                >
                  <option value="">
                    {intl.formatMessage({ id: 'identify.kind.any' })}
                  </option>
                  <option value="forward">
                    {intl.formatMessage({ id: 'identify.seat.forward' })}
                  </option>
                  <option value="aft">
                    {intl.formatMessage({ id: 'identify.seat.aft' })}
                  </option>
                </select>
              </label>
              <label className="check-row" style={{ margin: 0 }}>
                <FormattedMessage id="identify.arrangement.label" />{' '}
                <select
                  value={arrangement}
                  onChange={(e) =>
                    setArrangement(e.target.value as Arrangement)
                  }
                >
                  {(['free', 'vertical', 'horizontal'] as const).map((a) => (
                    <option key={a} value={a}>
                      {intl.formatMessage({ id: `identify.arrangement.${a}` })}
                    </option>
                  ))}
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
                <Scene
                  presentation="seen"
                  seen={seen}
                  arrangement={arrangement}
                />
                <SeenList
                  seen={seen}
                  onRemove={(i) => setSeen((s) => without(s, i))}
                />
              </>
            )}
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 14 }}>
              <FormattedMessage id="identify.ask.masthead" />
            </h3>
            <div className="seen-controls">
              <ColorPicker
                flashing={flashing}
                onAdd={(l) =>
                  setAnswers((a) => ({ ...a, masthead: [...a.masthead, l] }))
                }
              />
              <FlashingBox flashing={flashing} setFlashing={setFlashing} />
            </div>
            {answers.masthead.length > 0 && (
              <>
                <Scene
                  presentation="seen"
                  seen={answers.masthead}
                  arrangement="vertical"
                />
                <SeenList
                  seen={answers.masthead}
                  onRemove={(i) =>
                    setAnswers((a) => ({
                      ...a,
                      masthead: without(a.masthead, i),
                    }))
                  }
                />
              </>
            )}
            <h3 style={{ marginTop: 14 }}>
              <FormattedMessage id="identify.ask.sidelights" />
            </h3>
            <div className="seen-controls" role="radiogroup">
              {SIDELIGHTS.map((s) => (
                <label key={s} className="check-row" style={{ margin: 0 }}>
                  <input
                    type="radio"
                    name="identify-sidelights"
                    checked={answers.sidelights === s}
                    onChange={() =>
                      setAnswers((a) => ({ ...a, sidelights: s }))
                    }
                  />
                  <FormattedMessage id={`identify.ask.sidelights.${s}`} />
                </label>
              ))}
            </div>
            <h3 style={{ marginTop: 14 }}>
              <FormattedMessage id="identify.ask.others" />
            </h3>
            <div className="seen-controls">
              <ColorPicker
                flashing={flashing}
                onAdd={(l) =>
                  setAnswers((a) => ({ ...a, others: [...a.others, l] }))
                }
              />
              <FlashingBox flashing={flashing} setFlashing={setFlashing} />
            </div>
            <SeenList
              seen={answers.others}
              onRemove={(i) =>
                setAnswers((a) => ({ ...a, others: without(a.others, i) }))
              }
            />
          </>
        )}
      </div>

      {started && (
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
              {flow === 'build' &&
                arrangement === 'free' &&
                seen.length > 1 && (
                  <>
                    {' '}
                    <FormattedMessage id="identify.candidates.tryOrder" />
                  </>
                )}
            </p>
          )}
          {groups.map((gr) => (
            <p className="elim ambiguity" key={gr.aspects.join()}>
              <FormattedMessage
                id="identify.ambiguity"
                values={{
                  aspect: list(
                    gr.aspects.map((a) =>
                      intl.formatMessage({ id: `aspect.${a}` }),
                    ),
                  ),
                  members: list(
                    few(gr.members.map((m) => shortName(intl, m.facts))),
                  ),
                  differ: list(
                    gr.differ.map((d) =>
                      intl.formatMessage({ id: `identify.axis.${d}` }),
                    ),
                  ),
                }}
              />
              {gr.partedFrom.length > 0 && (
                <>
                  {' '}
                  <FormattedMessage
                    id="identify.ambiguity.parted"
                    values={{
                      aspects: list(
                        gr.partedFrom.map((a) =>
                          intl.formatMessage({ id: `aspect.${a}` }),
                        ),
                      ),
                    }}
                  />
                </>
              )}
            </p>
          ))}
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
                href={serialize(
                  stateWith({
                    mode: 'sandbox',
                    facts: c.facts,
                    sandbox: { theta: c.thetas[0] },
                  }),
                )}
                onClick={(ev) => {
                  ev.preventDefault();
                  patch({
                    mode: 'sandbox',
                    facts: c.facts,
                    sandbox: {
                      view: 'model',
                      theta: c.thetas[0],
                      displayIndex: 0,
                      additionsOn: [],
                    },
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
