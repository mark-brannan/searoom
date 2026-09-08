// The v1 core: fact record on the left, scene + lawful displays + the
// rules that fired on the right. Alternatives stay unresolved — the app
// shows every lawful display and lets elimination teach the choice.

import { useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { FactControls } from '../components/FactControls';
import { RuleParagraphs } from '../components/RuleParagraphs';
import { applicability, colregsVersion, corpus } from '../data/colregs';
import { evaluate } from '../engine/evaluate';
import type { Display, Entry, Evaluation } from '../engine/types';
import { selectHull } from '../render/hulls';
import { placeLights } from '../render/placement';
import { BearingView } from '../render/BearingView';
import { PlanView } from '../render/PlanView';
import { ProfileView } from '../render/ProfileView';
import type { AppState, View } from '../state/urlState';

const entryById = new Map(applicability.entries.map((e) => [e.id, e]));

function imageUrl(name: string): string {
  return `${import.meta.env.BASE_URL}rule-images/${name}`;
}

function DisplayChips({
  evaln,
  state,
  patch,
}: {
  evaln: Evaluation;
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const intl = useIntl();
  const current = Math.min(state.displayIndex, evaln.displays.length - 1);

  const chipLabel = (d: Display, i: number) => {
    if (d.chosen.length === 0)
      return intl.formatMessage({ id: 'sandbox.display.base' });
    return d.chosen
      .map((id) => entryById.get(id)?.cite ?? id)
      .join(' + ');
    void i;
  };

  // elimination lines for the alternatives in play
  const elimination: React.ReactNode[] = [];
  const activeIds = new Set(evaln.displays.flatMap((d) => d.entries));
  for (const id of activeIds) {
    const e = entryById.get(id);
    if (!e) continue;
    const inLieu = (e['rel:in_lieu_of'] ?? []).filter((r) => activeIds.has(r));
    if (inLieu.length > 0) {
      elimination.push(
        <p className="elim" key={`il-${id}`}>
          <FormattedMessage
            id="sandbox.elimination.inLieu"
            values={{
              winner: e.cite,
              losers: inLieu
                .map((r) => entryById.get(r)?.cite ?? r)
                .join(', '),
              cite: e.cite,
            }}
          />
        </p>,
      );
    }
    for (const r of e['rel:excludes'] ?? []) {
      if (activeIds.has(r) && id < r) {
        elimination.push(
          <p className="elim" key={`ex-${id}-${r}`}>
            <span className="x">✕ </span>
            <FormattedMessage
              id="sandbox.elimination.excludes"
              values={{
                a: e.cite,
                b: entryById.get(r)?.cite ?? r,
                cite: e.cite,
              }}
            />
          </p>,
        );
      }
    }
  }

  return (
    <div className="panel">
      <h2>
        <FormattedMessage
          id="sandbox.displays.title"
          values={{ count: evaln.displays.length }}
        />
      </h2>
      {evaln.displays.length > 1 && (
        <p className="elim">
          <FormattedMessage id="sandbox.displays.explain" />
        </p>
      )}
      <div className="chips" role="radiogroup" aria-label={intl.formatMessage({ id: 'sandbox.displays.title' }, { count: evaln.displays.length })}>
        {evaln.displays.map((d, i) => (
          <button
            key={i}
            className={`chip${i === current ? ' active' : ''}`}
            role="radio"
            aria-checked={i === current}
            onClick={() => patch({ displayIndex: i })}
          >
            {chipLabel(d, i)}
          </button>
        ))}
      </div>
      {evaln.displays[current]?.lights.length === 0 && (
        <p className="elim">
          <FormattedMessage id="sandbox.noDisplays" />
        </p>
      )}
      {elimination.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.elimination.title" />
          </h3>
          {elimination}
        </>
      )}
      {evaln.optionalAdditions.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.additions.title" />
          </h3>
          <p className="elim">
            <FormattedMessage id="sandbox.additions.explain" />
          </p>
          <div className="chips">
            {evaln.optionalAdditions.map((a) => {
              const on = state.additionsOn.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={`chip addition${on ? ' active' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    patch({
                      additionsOn: on
                        ? state.additionsOn.filter((x) => x !== a.id)
                        : [...state.additionsOn, a.id],
                    })
                  }
                >
                  {a.cite}
                </button>
              );
            })}
          </div>
        </>
      )}
      {evaln.exempted.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.exempted.title" />
          </h3>
          {evaln.exempted.map((x) => (
            <p className="elim" key={x.id}>
              <s>
                <FormattedMessage
                  id="sandbox.exempted.item"
                  values={{
                    id: x.id,
                    cite: entryById.get(x.id)?.cite ?? '',
                    by: entryById.get(x.by)?.cite ?? x.by,
                  }}
                />
              </s>
            </p>
          ))}
        </>
      )}
      {evaln.excluded.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.excluded.title" />
          </h3>
          {evaln.excluded.map((x) => (
            <p className="elim" key={x.id}>
              <span className="x">✕ </span>
              <FormattedMessage
                id="sandbox.excluded.item"
                values={{
                  id: x.id,
                  cite: entryById.get(x.id)?.cite ?? '',
                  by: entryById.get(x.by)?.cite ?? x.by,
                }}
              />
            </p>
          ))}
        </>
      )}
    </div>
  );
}

function EntryRow({ entry, evaln }: { entry: Entry; evaln: Evaluation }) {
  const intl = useIntl();
  const modality = evaln.modalities[entry.id] ?? entry.modality;
  return (
    <div className="entry">
      <div className="entry-head">
        <span className="entry-id">{entry.id}</span>
        <strong>{entry.cite}</strong>
        <span className={`badge ${modality}`}>
          {intl.formatMessage({ id: `modality.${modality}` })}
        </span>
        <span className="badge tier">
          {corpus.source} · {intl.formatMessage({ id: `corpus.tier.${corpus.tier}` })} · {corpus.language}
        </span>
      </div>
      <details>
        <summary>
          <FormattedMessage id="sandbox.rules.showText" />
        </summary>
        <RuleParagraphs cite={entry.cite} />
        {(entry.images ?? []).map((img) => (
          <img
            key={img}
            className="rule-image"
            src={imageUrl(img)}
            alt={`USCG diagram for ${entry.cite}`}
            loading="lazy"
          />
        ))}
      </details>
    </div>
  );
}

function DataDrawer({
  evaln,
  state,
  patch,
}: {
  evaln: Evaluation;
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const applied = evaln.applied.map((id) => entryById.get(id));
  return (
    <div className="panel drawer">
      <details
        open={state.drawer}
        onToggle={(e) =>
          patch({ drawer: (e.target as HTMLDetailsElement).open })
        }
      >
        <summary>
          <FormattedMessage id="drawer.title" />
        </summary>
        <h3>
          <FormattedMessage id="drawer.package" />
        </h3>
        <p className="corpus-line">
          <FormattedMessage
            id="drawer.packageLine"
            values={{
              version: colregsVersion,
              jurisdiction: corpus.jurisdiction,
              corpus: corpus.source,
              tier: corpus.tier,
              language: corpus.language,
            }}
          />
        </p>
        <h3>
          <FormattedMessage id="drawer.factRecord" />
        </h3>
        <pre>{JSON.stringify(state.facts, null, 1)}</pre>
        <h3>
          <FormattedMessage id="drawer.applied" />
        </h3>
        <pre>{JSON.stringify(applied, null, 1)}</pre>
      </details>
    </div>
  );
}

export function Sandbox({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const intl = useIntl();
  const evaln = useMemo(
    () => evaluate(applicability, state.facts),
    [state.facts],
  );
  const current = Math.max(
    0,
    Math.min(state.displayIndex, evaln.displays.length - 1),
  );
  useEffect(() => {
    if (state.displayIndex !== current) patch({ displayIndex: current });
  }, [state.displayIndex, current, patch]);

  const display = evaln.displays[current];
  const hull = useMemo(() => selectHull(state.facts), [state.facts]);
  const placed = useMemo(() => {
    if (!display) return [];
    const additionLights = evaln.optionalAdditions
      .filter((a) => state.additionsOn.includes(a.id))
      .flatMap((a) => a.lights);
    return placeLights(
      [...display.lights, ...additionLights],
      hull.spec,
      state.facts,
    );
  }, [display, evaln, hull, state.facts, state.additionsOn]);

  const views: View[] = ['profile', 'bearing', 'plan'];

  return (
    <div className="sandbox-grid">
      <FactControls state={state} patch={patch} />
      <div>
        <div className="panel">
          <div className="view-tabs" role="tablist" aria-label={intl.formatMessage({ id: 'view.label' })}>
            {views.map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={state.view === v}
                className={`view-tab${state.view === v ? ' active' : ''}`}
                onClick={() => patch({ view: v })}
              >
                <FormattedMessage id={`view.${v}`} />
              </button>
            ))}
            {state.view === 'bearing' && (
              <label className="check-row" style={{ marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={state.hullHint}
                  onChange={(e) => patch({ hullHint: e.target.checked })}
                />
                <FormattedMessage id="scene.hullHint" />
              </label>
            )}
          </div>
          {state.view === 'profile' && (
            <ProfileView hull={hull} placed={placed} facts={state.facts} />
          )}
          {state.view === 'bearing' && (
            <BearingView
              hull={hull}
              placed={placed}
              theta={state.theta}
              onTheta={(t) => patch({ theta: t })}
              hullHint={state.hullHint}
            />
          )}
          {state.view === 'plan' && (
            <PlanView
              hull={hull}
              placed={placed}
              theta={state.theta}
              onTheta={(t) => patch({ theta: t })}
            />
          )}
        </div>

        <DisplayChips evaln={evaln} state={state} patch={patch} />

        <div className="panel">
          <h2>
            <FormattedMessage id="sandbox.rules.title" />
          </h2>
          <p className="elim">
            <FormattedMessage id="sandbox.rules.explain" />
          </p>
          {evaln.applied
            .map((id) => entryById.get(id)!)
            .map((e) => (
              <EntryRow key={e.id} entry={e} evaln={evaln} />
            ))}
        </div>

        <DataDrawer evaln={evaln} state={state} patch={patch} />
      </div>
    </div>
  );
}
