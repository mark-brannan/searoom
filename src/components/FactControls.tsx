// Sandbox's one-vessel panel: the extracted vessel-fact controls
// (`VesselFactControls`, issue #95) plus the jurisdiction and day/night
// controls, which are page-level, not per-vessel, and so stay here rather
// than moving into the extracted piece.

import { FormattedMessage } from 'react-intl';
import type { Patch } from '../App';
import type { AppState } from '../state/urlState';
import type { FactRecord } from '../engine/types';
import { VesselFactControls, type FactPatch } from './VesselFactControls';

export function FactControls({
  state,
  patch,
}: {
  state: AppState;
  patch: (p: Patch) => void;
}) {
  const facts = state.facts;
  const setFacts = (updates: FactPatch, remove: string[] = []) => {
    const next: FactPatch = { ...facts, ...updates };
    for (const k of remove) delete next[k];
    const nextFacts = next as FactRecord;
    // Back to the first display on any fact change. colregs-engine ranks
    // displays most specific concession first (colregs-engine #137), so
    // index 0 is the display the Convention wrote for this vessel — no
    // app-side pick needed.
    patch({ facts: nextFacts, displayIndex: 0, additionsOn: [] });
  };

  return (
    <div className="panel">
      <h2>
        <FormattedMessage id="drawer.factRecord" />
      </h2>

      <VesselFactControls facts={facts} onChange={setFacts} />

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
            <FormattedMessage
              id={`jurisdiction.${state.jurisdiction}`}
              defaultMessage={state.jurisdiction}
            />
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
