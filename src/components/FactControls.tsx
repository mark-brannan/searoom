// The fact record as controls. No inference anywhere: the user sets every
// fact, the app evaluates. Conditional facts appear when the axes make
// them meaningful — showing 30(e)'s channel question to a vessel underway
// would be noise, not caution.

import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../state/store';
import { usePatch, useSituation } from '../state/store';
import type { FactRecord, FactValue } from '../engine/types';
import { meshOnChange } from '../render/hullModels';

// FactRecord (from colregs-engine/schema) types each key's value as its own
// literal enum, with no index signature — exact for a validated record, too
// strict for the controls below, which build a patch from a UI control's
// plain `string`/`boolean` before it is known to be a valid fact value.
// evaluate()/validateFacts() still gets a real FactRecord; this loosening is
// local to how the patch is assembled.
type FactPatch = Record<string, FactValue | undefined>;

const THRESHOLDS = [7, 12, 20, 50, 100];
const LEN_MAX = 120;

const PROPULSIONS = ['propulsion:power', 'propulsion:sail', 'propulsion:oars'];
// Progressive disclosure (searoom#103): the activities a learner meets first
// stay in view; the rest open under "More activities", and open by themselves
// when the vessel's activity is one of them.
const ACTIVITIES_FIRST = [
  'activity:none',
  'activity:fishing',
  'activity:trawling',
  'activity:towing',
  'activity:nuc',
  'activity:ram',
];
const ACTIVITIES_MORE = [
  'activity:pushing',
  'activity:being_towed',
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
  labelId = `fact.${name}`,
}: {
  name: string;
  values: string[];
  current: FactValue | undefined;
  onChange: (v: string) => void;
  /** i18n id of the group's accessible name; `fact.<name>` by default */
  labelId?: string;
}) {
  const intl = useIntl();
  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={intl.formatMessage({ id: labelId })}
    >
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

export function FactControls() {
  const { facts } = useSituation();
  const patch = usePatch();
  const intl = useIntl();
  const setFacts = (updates: FactPatch, remove: string[] = []) => {
    const next: FactPatch = { ...facts, ...updates };
    for (const k of remove) delete next[k];
    const nextFacts = next as FactRecord;
    // Back to the first display on any fact change. colregs-engine ranks
    // displays most specific concession first (colregs-engine #137), so
    // index 0 is the display the Convention wrote for this vessel — no
    // app-side pick needed.
    const change: Patch = {
      facts: nextFacts,
      sandbox: { displayIndex: 0, additionsOn: [] },
    };
    const mesh = meshOnChange(facts, nextFacts);
    if (mesh !== undefined) change.sandbox = { ...change.sandbox, mesh };
    patch(change);
  };

  const activity = facts['fact:activity'];
  const position = facts['fact:position'];
  const propulsion = facts['fact:propulsion'];
  const setActivity = (v: string) => {
    const updates: FactPatch = { 'fact:activity': v };
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
  };
  // a preset or a shared URL can name an activity under "More": open it
  const activityIsMore = ACTIVITIES_MORE.includes(String(activity));
  const [moreOpen, setMoreOpen] = useState(activityIsMore);
  useEffect(() => {
    if (activityIsMore) setMoreOpen(true);
  }, [activityIsMore]);

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
          values={ACTIVITIES_FIRST}
          current={activity}
          onChange={setActivity}
        />
        <details
          className="more-activities"
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.currentTarget.open)}
        >
          <summary>
            <FormattedMessage id="fact.activity.more" />
          </summary>
          <Segmented
            name="activity-more"
            labelId="fact.activity.more"
            values={ACTIVITIES_MORE}
            current={activity}
            onChange={setActivity}
          />
        </details>
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
            const updates: FactPatch = { 'fact:position': v };
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
            if (Number.isFinite(n) && n > 0) setFacts({ 'fact:length_m': n });
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
                  ? setFacts({
                      'fact:wig': true,
                      'fact:wig_near_surface': true,
                    })
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
    </div>
  );
}
