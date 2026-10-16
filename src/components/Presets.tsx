// Presets gallery (searoom#103): a boat first, the facts second. Each preset
// is a fact record; picking one patches state exactly as editing the fact
// controls would, so the URL carries it.

import { useIntl } from 'react-intl';
import type { Patch } from '../state/store';
import { useAppState, usePatch } from '../state/store';
import { PRESETS, presetFor } from '../data/presets';
import { meshOnChange } from '../render/hullModels';

export function Presets() {
  const state = useAppState();
  const patch = usePatch();
  const intl = useIntl();
  const current = presetFor(state.facts)?.id;
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
          className={`chip${current === p.id ? ' active' : ''}`}
          aria-pressed={current === p.id}
          onClick={() => {
            const change: Patch = {
              facts: { ...p.facts },
              displayIndex: 0,
              additionsOn: [],
            };
            const mesh = meshOnChange(state.facts, p.facts);
            if (mesh !== undefined) change.mesh = mesh;
            patch(change);
          }}
        >
          {intl.formatMessage({ id: `preset.${p.id}` })}
        </button>
      ))}
    </div>
  );
}
