// The fact record as controls. No inference anywhere: the user sets every
// fact, the app evaluates. Conditional facts appear when the axes make
// them meaningful — showing 30(e)'s channel question to a vessel underway
// would be noise, not caution.

import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import type { AppState } from '../state/urlState';
import type { FactRecord, FactValue } from '../engine/types';

const THRESHOLDS = [7, 12, 20, 50, 100];
const LEN_MAX = 120;

const PROPULSIONS = ['propulsion:power', 'propulsion:sail', 'propulsion:oars'];
const ACTIVITIES = [
  'activity:none',
  'activity:fishing',
  'activity:trawling',
  'activity:towing',
  'activity:pushing',
  'activity:being_towed',
  'activity:nuc',
  'activity:ram',
  'activity:ram_underwater',
  'activity:cbd',
  'activity:mine',
  'activity:pilot',
  'activity:diving',
];
const POSITIONS = [
  'position:underway',
  'position:anchored',
  'position:aground',
  'position:moored',
];

function Segmented({
  name,
  values,
  current,
  onChange,
}: {
  name: string;
  values: string[];
  current: FactValue | undefined;
  onChange: (v: string) => void;
}) {
  const intl = useIntl();
  return (
    <div className="segmented" role="radiogroup" aria-label={intl.formatMessage({ id: `fact.${name}` })}>
      {values.map((v) => {
        const suffix = v.slice(v.indexOf(':') + 1);
        return (
          <label key={v}>
            <input
              type="radio"
              name={name}
              value={v}
              checked={current === v}
              onChange={() => onChange(v)}
            />
            <FormattedMessage id={`${v.split(':')[0]}.${suffix}`} />
          </label>
        );
      })}
    </div>
  );
}

function Check({
  id,
  labelId,
  checked,
  onChange,
}: {
  id: string;
  labelId: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check-row" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <FormattedMessage id={labelId} />
    </label>
  );
}

export function FactControls({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const intl = useIntl();
  const facts = state.facts;
  const setFacts = (updates: FactRecord, remove: string[] = []) => {
    const next = { ...facts, ...updates };
    for (const k of remove) delete next[k];
    patch({ facts: next, displayIndex: 0, additionsOn: [] });
  };

  const activity = facts['fact:activity'];
  const position = facts['fact:position'];
  const propulsion = facts['fact:propulsion'];
  const length =
    typeof facts['fact:length_m'] === 'number'
      ? (facts['fact:length_m'] as number)
      : 12;

  return (
    <div className="panel">
      <h2>
        <FormattedMessage id="drawer.factRecord" />
      </h2>

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="fact.propulsion" />
        </span>
        <Segmented
          name="propulsion"
          values={PROPULSIONS}
          current={propulsion}
          onChange={(v) => setFacts({ 'fact:propulsion': v })}
        />
      </div>

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="fact.activity" />
        </span>
        <Segmented
          name="activity"
          values={ACTIVITIES}
          current={activity}
          onChange={(v) => {
            const updates: FactRecord = { 'fact:activity': v };
            const remove: string[] = [];
            if (v !== 'activity:towing') remove.push('fact:tow_length_m');
            else if (facts['fact:tow_length_m'] === undefined)
              updates['fact:tow_length_m'] = 150;
            if (v !== 'activity:fishing') remove.push('fact:gear_extent_m');
            if (v !== 'activity:pushing') remove.push('fact:composite_unit');
            else if (facts['fact:composite_unit'] === undefined)
              updates['fact:composite_unit'] = false;
            if (v !== 'activity:ram_underwater') {
              remove.push('fact:obstruction_exists', 'fact:obstruction_side');
            }
            setFacts(updates, remove);
          }}
        />
      </div>

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="fact.position" />
        </span>
        <Segmented
          name="position"
          values={POSITIONS}
          current={position}
          onChange={(v) => {
            const updates: FactRecord = { 'fact:position': v };
            const remove: string[] = [];
            if (v !== 'position:anchored') remove.push('fact:near_channel');
            else if (facts['fact:near_channel'] === undefined)
              updates['fact:near_channel'] = true;
            if (v !== 'position:underway') remove.push('fact:making_way');
            else if (facts['fact:making_way'] === undefined)
              updates['fact:making_way'] = true;
            setFacts(updates, remove);
          }}
        />
      </div>

      {position === 'position:underway' && (
        <Check
          id="mw"
          labelId="fact.makingWay"
          checked={facts['fact:making_way'] === true}
          onChange={(v) => setFacts({ 'fact:making_way': v })}
        />
      )}

      <div className="fact-group">
        <label className="fact-label" htmlFor="length">
          <FormattedMessage id="fact.length" />{' '}
          <span className="length-readout">{length} m</span>
        </label>
        <input
          id="length"
          className="length-slider"
          type="range"
          min={2}
          max={LEN_MAX}
          step={0.5}
          value={Math.min(length, LEN_MAX)}
          onChange={(e) =>
            setFacts({ 'fact:length_m': Number(e.target.value) })
          }
          aria-describedby="length-thresholds"
          list="length-ticks"
        />
        <datalist id="length-ticks">
          {THRESHOLDS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div
          className="threshold-ticks"
          id="length-thresholds"
          aria-label={intl.formatMessage({ id: 'sandbox.length.thresholds' })}
        >
          {THRESHOLDS.map((t) => (
            <span
              key={t}
              style={{ left: `${((t - 2) / (LEN_MAX - 2)) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={500}
          step={0.1}
          value={length}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n > 0)
              setFacts({ 'fact:length_m': n });
          }}
          aria-label={intl.formatMessage({ id: 'fact.length' })}
        />{' '}
        m
      </div>

      {activity === 'activity:towing' && (
        <div className="fact-group">
          <label className="fact-label" htmlFor="towlen">
            <FormattedMessage id="fact.towLength" />
          </label>
          <input
            id="towlen"
            type="number"
            min={0}
            max={2000}
            step={10}
            value={Number(facts['fact:tow_length_m'] ?? 150)}
            onChange={(e) =>
              setFacts({ 'fact:tow_length_m': Number(e.target.value) })
            }
          />{' '}
          m
        </div>
      )}

      {activity === 'activity:fishing' && (
        <div className="fact-group">
          <label className="fact-label" htmlFor="gear">
            <FormattedMessage id="fact.gearExtent" />
          </label>
          <input
            id="gear"
            type="number"
            min={0}
            max={2000}
            step={10}
            value={Number(facts['fact:gear_extent_m'] ?? 0)}
            onChange={(e) =>
              setFacts({ 'fact:gear_extent_m': Number(e.target.value) })
            }
          />{' '}
          m
        </div>
      )}

      {position === 'position:anchored' && (
        <Check
          id="nc"
          labelId="fact.nearChannel"
          checked={facts['fact:near_channel'] !== false}
          onChange={(v) => setFacts({ 'fact:near_channel': v })}
        />
      )}

      <details>
        <summary>
          <FormattedMessage id="fact.specialCases" />
        </summary>
        {activity === 'activity:pushing' && (
          <Check
            id="cu"
            labelId="fact.compositeUnit"
            checked={facts['fact:composite_unit'] === true}
            onChange={(v) => setFacts({ 'fact:composite_unit': v })}
          />
        )}
        {propulsion === 'propulsion:power' && (
          <>
            <Check
              id="nd"
              labelId="fact.nonDisplacement"
              checked={facts['fact:non_displacement'] === true}
              onChange={(v) =>
                v
                  ? setFacts({ 'fact:non_displacement': true })
                  : setFacts({}, ['fact:non_displacement'])
              }
            />
            <Check
              id="wig"
              labelId="fact.wig"
              checked={facts['fact:wig'] === true}
              onChange={(v) =>
                v
                  ? setFacts({ 'fact:wig': true, 'fact:wig_near_surface': true })
                  : setFacts({}, ['fact:wig', 'fact:wig_near_surface'])
              }
            />
            {facts['fact:wig'] === true && (
              <Check
                id="wigns"
                labelId="fact.wigNearSurface"
                checked={facts['fact:wig_near_surface'] === true}
                onChange={(v) => setFacts({ 'fact:wig_near_surface': v })}
              />
            )}
            <div className="fact-group">
              <label className="fact-label" htmlFor="spd">
                <FormattedMessage id="fact.maxSpeed" />
              </label>
              <input
                id="spd"
                type="number"
                min={0}
                max={80}
                step={0.5}
                value={
                  typeof facts['fact:max_speed_kn'] === 'number'
                    ? Number(facts['fact:max_speed_kn'])
                    : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setFacts({}, ['fact:max_speed_kn']);
                  else setFacts({ 'fact:max_speed_kn': Number(v) });
                }}
              />{' '}
              kn
            </div>
          </>
        )}
        {activity === 'activity:ram_underwater' && (
          <>
            <Check
              id="ob"
              labelId="fact.obstructionExists"
              checked={facts['fact:obstruction_exists'] === true}
              onChange={(v) =>
                v
                  ? setFacts({
                      'fact:obstruction_exists': true,
                      'fact:obstruction_side': 'obstruction_side:port',
                    })
                  : setFacts({}, [
                      'fact:obstruction_exists',
                      'fact:obstruction_side',
                    ])
              }
            />
            {facts['fact:obstruction_exists'] === true && (
              <div className="fact-group">
                <span className="fact-label">
                  <FormattedMessage id="fact.obstructionSide" />
                </span>
                <Segmented
                  name="obstruction_side"
                  values={[
                    'obstruction_side:port',
                    'obstruction_side:starboard',
                  ]}
                  current={facts['fact:obstruction_side']}
                  onChange={(v) => setFacts({ 'fact:obstruction_side': v })}
                />
              </div>
            )}
          </>
        )}
      </details>

      <div className="fact-group" style={{ marginTop: 12 }}>
        <span className="fact-label">
          <FormattedMessage id="sandbox.jurisdiction.label" />
        </span>
        <button
          className="picker-row"
          onClick={() => patch({ signpost: 'jurisdiction-picker' })}
          aria-haspopup="dialog"
        >
          <span className="grow label">
            <FormattedMessage id="sp.intl.label" />
          </span>
          <span className="status-chip status-live" style={{ margin: 0 }}>
            <FormattedMessage id="signpost.status.live" />
          </span>
        </button>
      </div>

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="sandbox.dayNight.label" />
        </span>
        <div className="segmented" role="group">
          <label>
            <input type="radio" name="daynight" checked readOnly />
            <FormattedMessage id="sandbox.night" />
          </label>
          <label>
            <input
              type="radio"
              name="daynight"
              checked={false}
              onChange={() => patch({ signpost: 'day-shapes' })}
            />
            <FormattedMessage id="sandbox.day" />
          </label>
        </div>
      </div>
    </div>
  );
}
