// Presets gallery (searoom#103): a boat first, the facts second. Each preset
// is a fact record shown as her thumbnail; picking one patches state exactly
// as editing the fact controls would, so the URL carries it.

import { useIntl } from 'react-intl';
import type { Patch } from '../state/store';
import { usePatch, useSituation } from '../state/store';
import { PRESETS, presetFor } from '../data/presets';
import { meshOnChange } from '../render/hullModels';
import { PresetThumb } from './PresetThumb';

export function Presets() {
  const { facts, jurisdiction } = useSituation();
  const patch = usePatch();
  const intl = useIntl();
  const current = presetFor(facts)?.id;
  return (
    <div
      className="presets"
      role="group"
      aria-label={intl.formatMessage({ id: 'presets.label' })}
    >
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`preset-card${current === p.id ? ' active' : ''}`}
          aria-pressed={current === p.id}
          onClick={() => {
            const change: Patch = {
              facts: { ...p.facts },
              sandbox: { displayIndex: 0, additionsOn: [] },
            };
            const mesh = meshOnChange(facts, p.facts);
            if (mesh !== undefined) change.sandbox = { ...change.sandbox, mesh };
            patch(change);
          }}
        >
          <PresetThumb facts={p.facts} jurisdiction={jurisdiction} />
          <span className="preset-name">
            {intl.formatMessage({ id: `preset.${p.id}` })}
          </span>
        </button>
      ))}
    </div>
  );
}
