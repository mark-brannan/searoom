// The fact record as controls. No inference anywhere: the user sets every
// fact, the app evaluates. Conditional facts appear when the axes make
// them meaningful — showing 30(e)'s channel question to a vessel underway
// would be noise, not caution.
//
// Extracted from `FactControls.tsx` (issue #95): this is the vessel-fact
// portion only — propulsion/activity/position/length/tow/gear/special
// cases — with no `state`/`patch` dependency, so both Sandbox (one vessel)
// and Encounters (two) can each own an instance. Jurisdiction and day/night
// are page-level, not per-vessel, and stay in `FactControls`'s thin wrapper.

import { FormattedMessage, useIntl } from 'react-intl';
import type { FactRecord, FactValue } from '../engine/types';
import type { VesselPreset } from '../data/vesselPresets';

// FactRecord (from colregs-engine/schema) types each key's value as its own
// literal enum, with no index signature — exact for a validated record, too
// strict for the controls below, which build a patch from a UI control's
// plain `string`/`boolean` before it is known to be a valid fact value.
// evaluate()/validateFacts() still gets a real FactRecord; this loosening is
// local to how the patch is assembled.
export type FactPatch = Record<string, FactValue | undefined>;

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

export function Segmented({
  name,
  values,
  current,
  onChange,
  ariaLabelId,
}: {
  name: string;
  values: string[];
  current: FactValue | undefined;
  onChange: (v: string) => void;
  /** Overrides the default `fact.<name>` aria-label lookup for a caller
   * whose `name` isn't a fact-record field (e.g. the generic situation
   * schema controls, whose group names are DOM-id-safe, not message ids). */
  ariaLabelId?: string;
}) {
  const intl = useIntl();
  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={intl.formatMessage({ id: ariaLabelId ?? `fact.${name}` })}
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

export function Check({
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

export function VesselFactControls({
  facts,
  onChange,
  idPrefix = '',
  presets,
  onPreset,
}: {
  facts: FactRecord;
  onChange: (updates: FactPatch, remove?: string[]) => void;
  /** Disambiguates DOM ids/radio group names when two instances render on
   * one page (Encounters mode's self/other panels). */
  idPrefix?: string;
  /** Vessel-preset picker (issue #95 item 3), rendered above the controls
   * when given. Sandbox doesn't pass these; Encounters does. */
  presets?: VesselPreset[];
  onPreset?: (preset: VesselPreset) => void;
}) {
  const intl = useIntl();
  const setFacts = (updates: FactPatch, remove: string[] = []) =>
    onChange(updates, remove);

  const activity = facts['fact:activity'];
  const position = facts['fact:position'];
  const propulsion = facts['fact:propulsion'];
  const length =
    typeof facts['fact:length_m'] === 'number'
      ? (facts['fact:length_m'] as number)
      : 12;

  const id = (suffix: string) => `${idPrefix}${suffix}`;

  return (
    <>
      {presets && onPreset && (
        <div className="fact-group">
          <span className="fact-label">
            <FormattedMessage id="vesselPreset.label" />
          </span>
          <select
            aria-label={intl.formatMessage({ id: 'vesselPreset.label' })}
            defaultValue=""
            onChange={(e) => {
              const preset = presets.find((p) => p.id === e.target.value);
              if (preset) onPreset(preset);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              {intl.formatMessage({ id: 'vesselPreset.placeholder' })}
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {intl.formatMessage({ id: p.labelId })}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="fact.propulsion" />
        </span>
        <Segmented
          name={id('propulsion')}
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
          name={id('activity')}
          values={ACTIVITIES}
          current={activity}
          onChange={(v) => {
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
          }}
        />
      </div>

      <div className="fact-group">
        <span className="fact-label">
          <FormattedMessage id="fact.position" />
        </span>
        <Segmented
          name={id('position')}
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
          id={id('mw')}
          labelId="fact.makingWay"
          checked={facts['fact:making_way'] === true}
          onChange={(v) => setFacts({ 'fact:making_way': v })}
        />
      )}

      <div className="fact-group">
        <label className="fact-label" htmlFor={id('length')}>
          <FormattedMessage id="fact.length" />{' '}
          <span className="length-readout">{length} m</span>
        </label>
        <input
          id={id('length')}
          className="length-slider"
          type="range"
          min={2}
          max={LEN_MAX}
          step={0.5}
          value={Math.min(length, LEN_MAX)}
          onChange={(e) =>
            setFacts({ 'fact:length_m': Number(e.target.value) })
          }
          aria-describedby={id('length-thresholds')}
          list={id('length-ticks')}
        />
        <datalist id={id('length-ticks')}>
          {THRESHOLDS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div
          className="threshold-ticks"
          id={id('length-thresholds')}
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
          <label className="fact-label" htmlFor={id('towlen')}>
            <FormattedMessage id="fact.towLength" />
          </label>
          <input
            id={id('towlen')}
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
          <label className="fact-label" htmlFor={id('gear')}>
            <FormattedMessage id="fact.gearExtent" />
          </label>
          <input
            id={id('gear')}
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
          id={id('nc')}
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
            id={id('cu')}
            labelId="fact.compositeUnit"
            checked={facts['fact:composite_unit'] === true}
            onChange={(v) => setFacts({ 'fact:composite_unit': v })}
          />
        )}
        {propulsion === 'propulsion:power' && (
          <>
            <Check
              id={id('nd')}
              labelId="fact.nonDisplacement"
              checked={facts['fact:non_displacement'] === true}
              onChange={(v) =>
                v
                  ? setFacts({ 'fact:non_displacement': true })
                  : setFacts({}, ['fact:non_displacement'])
              }
            />
            <Check
              id={id('wig')}
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
                id={id('wigns')}
                labelId="fact.wigNearSurface"
                checked={facts['fact:wig_near_surface'] === true}
                onChange={(v) => setFacts({ 'fact:wig_near_surface': v })}
              />
            )}
            <div className="fact-group">
              <label className="fact-label" htmlFor={id('spd')}>
                <FormattedMessage id="fact.maxSpeed" />
              </label>
              <input
                id={id('spd')}
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
              id={id('ob')}
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
                  name={id('obstruction_side')}
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
    </>
  );
}
