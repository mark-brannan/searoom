// Renders one group of situation-schema fields (kin/geo/hist/env) as
// controls, generically over `SituationFieldSpec` — this is what "generated
// from the schema" means for issue #95: add a field to
// `colregs/data/facts.json`'s `situation` key and it appears here with no
// new render branch, the same way `FactControls`' fields are all
// hand-written because the fact record predates this issue.

import { FormattedMessage, useIntl } from 'react-intl';
import type { SituationFieldSpec } from '../data/situationSchema';
import { Segmented } from './VesselFactControls';

export type FieldValue = string | number | boolean | { latitude: number; longitude: number } | undefined;

function labelId(key: string): string {
  return `situation.${key.replace(':', '.')}`;
}

export function SituationFieldControls({
  fields,
  idPrefix,
  get,
  set,
  /** Fields present in `fields` but currently computed live rather than
   * settable — greyed out with a note, not hidden, so the reader still
   * sees the schema's full key set (issue #95's done-when). */
  derivedKeys,
}: {
  fields: SituationFieldSpec[];
  idPrefix: string;
  get: (key: string) => FieldValue;
  set: (key: string, value: FieldValue) => void;
  derivedKeys?: Set<string>;
}) {
  const intl = useIntl();
  return (
    <>
      {fields.map((f) => {
        const id = `${idPrefix}${f.key}`;
        const derived = derivedKeys?.has(f.key) ?? false;
        const value = get(f.key);
        if (f.kind === 'boolean') {
          return (
            <label className="check-row" htmlFor={id} key={f.key}>
              <input
                id={id}
                type="checkbox"
                checked={value === true}
                onChange={(e) => set(f.key, e.target.checked)}
              />
              <FormattedMessage
                id={labelId(f.key)}
                defaultMessage={f.key}
              />
            </label>
          );
        }
        if (f.kind === 'enum') {
          return (
            <div className="fact-group" key={f.key}>
              <span className="fact-label">
                <FormattedMessage id={labelId(f.key)} defaultMessage={f.key} />
              </span>
              <Segmented
                name={id}
                ariaLabelId={labelId(f.key)}
                values={f.values ?? []}
                current={typeof value === 'string' ? value : undefined}
                onChange={(v) => set(f.key, v)}
              />
            </div>
          );
        }
        if (f.kind === 'position') {
          const pos =
            value && typeof value === 'object' ? value : { latitude: 0, longitude: 0 };
          return (
            <div className="fact-group" key={f.key}>
              <label className="fact-label" htmlFor={id}>
                <FormattedMessage id={labelId(f.key)} defaultMessage={f.key} />
              </label>
              <input
                id={id}
                type="number"
                step={0.0001}
                aria-label={intl.formatMessage(
                  { id: 'situation.position.latitude' },
                  undefined,
                )}
                value={pos.latitude}
                onChange={(e) =>
                  set(f.key, { ...pos, latitude: Number(e.target.value) })
                }
              />
              <input
                type="number"
                step={0.0001}
                aria-label={intl.formatMessage(
                  { id: 'situation.position.longitude' },
                  undefined,
                )}
                value={pos.longitude}
                onChange={(e) =>
                  set(f.key, { ...pos, longitude: Number(e.target.value) })
                }
              />
            </div>
          );
        }
        // number
        return (
          <div className="fact-group" key={f.key}>
            <label className="fact-label" htmlFor={id}>
              <FormattedMessage id={labelId(f.key)} defaultMessage={f.key} />
              {derived && (
                <span className="badge tier" style={{ marginLeft: 6 }}>
                  <FormattedMessage id="situation.derived" />
                </span>
              )}
            </label>
            <input
              id={id}
              type="number"
              disabled={derived}
              value={
                derived
                  ? typeof value === 'number'
                    ? Math.round(value * 100) / 100
                    : ''
                  : typeof value === 'number'
                    ? value
                    : ''
              }
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) set(f.key, n);
              }}
            />{' '}
            {f.unit}
          </div>
        );
      })}
    </>
  );
}
