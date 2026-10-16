// Presets gallery (searoom#103): a boat first, the facts second. Each preset
// is a fact record; picking one patches state exactly as editing the fact
// controls would, so the URL carries it.

import { useIntl } from 'react-intl';
import type { Patch } from '../App';
import { PRESETS, presetFor } from '../data/presets';
import { selectHull } from 'nav-wright';
import { pickMesh } from '../render/hullModels';
import type { AppState } from '../state/urlState';

export function Presets({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
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
          onClick={() =>
            patch({
              facts: { ...p.facts },
              displayIndex: 0,
              additionsOn: [],
              mesh: pickMesh(selectHull(p.facts)),
            })
          }
        >
          {intl.formatMessage({ id: `preset.${p.id}` })}
        </button>
      ))}
    </div>
  );
}
