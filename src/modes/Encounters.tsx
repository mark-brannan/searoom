// Two vessels + their relative geometry, generated from the situation
// schema (issue #95) the same way Sandbox is generated from the fact-record
// schema: state -> evaluate -> render, `useMemo` over `evaluateEncounterIn`.
// No 3D scene here — that's about rendering one vessel's light
// configuration, orthogonal to this mode.

import { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { VesselFactControls, type FactPatch } from '../components/VesselFactControls';
import { SituationFieldControls, type FieldValue } from '../components/SituationFieldControls';
import { VESSEL_PRESETS, type VesselPreset } from '../data/vesselPresets';
import {
  KIN_FIELDS,
  HIST_FIELDS,
  GEO_OWN_FIELDS,
  GEO_PAIR_FIELDS,
  ENV_FIELDS,
  DERIVABLE_PAIR_GEO_KEYS,
  DERIVABLE_OWN_GEO_KEYS,
} from '../data/situationSchema';
import { evaluateEncounterIn } from '../engine/evaluateEncounter';
import { buildSituation, type EncounterState } from '../engine/situationBuilder';
import type { FactRecord, Subject } from '../engine/types';
import type { AppState } from '../state/urlState';

function subjectOf(state: EncounterState, who: 'self' | 'other'): Subject {
  return (who === 'self' ? state.situation.self : state.situation.other) ?? {
    fact: {},
  };
}

function VesselPanel({
  who,
  encounter,
  onChange,
}: {
  who: 'self' | 'other';
  encounter: EncounterState;
  onChange: (next: EncounterState) => void;
}) {
  const subject = subjectOf(encounter, who);
  const derived = !encounter.overrideGeometry ? DERIVABLE_OWN_GEO_KEYS : undefined;

  const patchSubject = (updates: Partial<Subject>) => {
    const next: EncounterState = {
      ...encounter,
      situation: {
        ...encounter.situation,
        [who]: { ...subject, ...updates },
      },
    };
    onChange(next);
  };

  const onFact = (updates: FactPatch, remove: string[] = []) => {
    const nextFact: FactPatch = { ...subject.fact, ...updates };
    for (const k of remove) delete nextFact[k];
    patchSubject({ fact: nextFact as FactRecord });
  };

  const onPreset = (preset: VesselPreset) => {
    patchSubject({
      fact: { ...preset.fact },
      // `kin:dynamics` is a closed enum in the generated types; the preset
      // table only ever supplies one of its own values, validated by
      // `evaluateEncounterIn` at evaluation time the same way a hand-typed
      // fact value is.
      kin: {
        ...subject.kin,
        'kin:dynamics': preset.dynamics,
      } as Subject['kin'],
    });
  };

  const getField =
    (cls: 'kin' | 'geo' | 'hist') =>
    (key: string): FieldValue =>
      (subject[cls] as Record<string, FieldValue> | undefined)?.[key];

  const setField =
    (cls: 'kin' | 'geo' | 'hist') =>
    (key: string, value: FieldValue) =>
      patchSubject({ [cls]: { ...subject[cls], [key]: value } } as Partial<Subject>);

  return (
    <div className="panel">
      <h3>
        <FormattedMessage id={`encounters.vessel.${who}`} />
      </h3>
      <VesselFactControls
        facts={subject.fact}
        onChange={onFact}
        idPrefix={`${who}-`}
        presets={VESSEL_PRESETS}
        onPreset={onPreset}
      />
      <h4>
        <FormattedMessage id="encounters.kin.title" />
      </h4>
      <SituationFieldControls
        fields={KIN_FIELDS}
        idPrefix={`${who}-kin-`}
        get={getField('kin')}
        set={setField('kin')}
      />
      <h4>
        <FormattedMessage id="encounters.geo.title" />
      </h4>
      <SituationFieldControls
        fields={GEO_OWN_FIELDS}
        idPrefix={`${who}-geo-`}
        get={getField('geo')}
        set={setField('geo')}
        derivedKeys={derived}
      />
      <h4>
        <FormattedMessage id="encounters.hist.title" />
      </h4>
      <SituationFieldControls
        fields={HIST_FIELDS}
        idPrefix={`${who}-hist-`}
        get={getField('hist')}
        set={setField('hist')}
      />
    </div>
  );
}

function PairPanel({
  encounter,
  onChange,
}: {
  encounter: EncounterState;
  onChange: (next: EncounterState) => void;
}) {
  const pair = encounter.situation.pair ?? {};
  const derived = !encounter.overrideGeometry ? DERIVABLE_PAIR_GEO_KEYS : undefined;

  const patchPair = (
    cls: 'geo' | 'env',
    key: string,
    value: FieldValue,
  ) => {
    onChange({
      ...encounter,
      situation: {
        ...encounter.situation,
        pair: { ...pair, [cls]: { ...pair[cls], [key]: value } },
      },
    });
  };

  return (
    <div className="panel">
      <h3>
        <FormattedMessage id="encounters.pair.title" />
      </h3>
      <label className="check-row" htmlFor="override-geometry">
        <input
          id="override-geometry"
          type="checkbox"
          checked={encounter.overrideGeometry}
          onChange={(e) =>
            onChange({ ...encounter, overrideGeometry: e.target.checked })
          }
        />
        <FormattedMessage id="encounters.overrideGeometry" />
      </label>
      <SituationFieldControls
        fields={GEO_PAIR_FIELDS}
        idPrefix="pair-geo-"
        get={(k) => (pair.geo as Record<string, FieldValue> | undefined)?.[k]}
        set={(k, v) => patchPair('geo', k, v)}
        derivedKeys={derived}
      />
      <h4>
        <FormattedMessage id="encounters.env.title" />
      </h4>
      <SituationFieldControls
        fields={ENV_FIELDS}
        idPrefix="pair-env-"
        get={(k) => (pair.env as Record<string, FieldValue> | undefined)?.[k]}
        set={(k, v) => patchPair('env', k, v)}
      />
    </div>
  );
}

function ResultsPanel({ jurisdiction, encounter }: { jurisdiction: string; encounter: EncounterState }) {
  const intl = useIntl();
  const situation = useMemo(() => buildSituation(encounter), [encounter]);
  const result = useMemo(
    () => evaluateEncounterIn(jurisdiction, situation),
    [jurisdiction, situation],
  );

  return (
    <div className="panel">
      <h2>
        <FormattedMessage id="encounters.results.title" />
      </h2>
      <h3>
        <FormattedMessage id="encounters.results.applied" />
      </h3>
      {result.applied.length === 0 ? (
        <p className="elim">
          <FormattedMessage id="encounters.results.none" />
        </p>
      ) : (
        <ul>
          {result.applied.map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
      <h3>
        <FormattedMessage id="encounters.results.encounter" />
      </h3>
      <p>
        {result.encounter
          ? JSON.stringify(result.encounter)
          : intl.formatMessage({ id: 'encounters.results.unclassified' })}
      </p>
      <h3>
        <FormattedMessage id="encounters.results.riskOfCollision" />
      </h3>
      <p>
        {result.risk_of_collision.asserted
          ? intl.formatMessage(
              { id: 'encounters.results.riskAsserted' },
              { by: result.risk_of_collision.by.join(', ') },
            )
          : intl.formatMessage({ id: 'encounters.results.riskNotAsserted' })}
      </p>
      <h3>
        <FormattedMessage id="encounters.results.roles" />
      </h3>
      <p>
        <strong>
          <FormattedMessage id="encounters.vessel.self" />:
        </strong>{' '}
        {result.roles.self.length === 0
          ? intl.formatMessage({ id: 'encounters.results.noRole' })
          : result.roles.self.map((r) => `${r.role} (${r.by})`).join(', ')}
      </p>
      <p>
        <strong>
          <FormattedMessage id="encounters.vessel.other" />:
        </strong>{' '}
        {result.roles.other.length === 0
          ? intl.formatMessage({ id: 'encounters.results.noRole' })
          : result.roles.other.map((r) => `${r.role} (${r.by})`).join(', ')}
      </p>
    </div>
  );
}

export function Encounters({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const setEncounter = (next: EncounterState) => patch({ encounter: next });

  return (
    <div className="sandbox-grid">
      <VesselPanel who="self" encounter={state.encounter} onChange={setEncounter} />
      <div>
        <VesselPanel
          who="other"
          encounter={state.encounter}
          onChange={setEncounter}
        />
        <PairPanel encounter={state.encounter} onChange={setEncounter} />
        <ResultsPanel jurisdiction={state.jurisdiction} encounter={state.encounter} />
      </div>
    </div>
  );
}
