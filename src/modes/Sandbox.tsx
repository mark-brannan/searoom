// The v1 core: fact record on the left, scene + lawful displays + the
// rules that fired on the right. Alternatives stay unresolved — the app
// shows every lawful display and lets elimination teach the choice.

import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useAppState, usePatch } from '../state/store';
import { Presets } from '../components/Presets';
import { FactControls } from '../components/FactControls';
import { Scene } from '../components/Scene';
import { DisplayChips } from '../components/DisplayChips';
import { RulesPanel } from '../components/RulesPanel';
import { DataDrawer } from '../components/DataDrawer';
import { evaluateDisplayIn } from '../engine/evaluate';

export function Sandbox() {
  const state = useAppState();
  const patch = usePatch();
  const evaln = useMemo(
    () => evaluateDisplayIn(state.jurisdiction, state.facts),
    [state.jurisdiction, state.facts],
  );
  const current = Math.max(
    0,
    Math.min(state.displayIndex, evaln.displays.length - 1),
  );
  useEffect(() => {
    if (state.displayIndex !== current) patch({ displayIndex: current });
  }, [state.displayIndex, current, patch]);

  const display = evaln.displays[current];
  const lights = useMemo(() => {
    if (!display) return [];
    const additionLights = evaln.optionalAdditions
      .filter((a) => state.additionsOn.includes(a.id))
      .flatMap((a) => a.lights);
    return [...display.lights, ...additionLights];
  }, [display, evaln, state.additionsOn]);

  // Under 520 px the fact controls are a bottom sheet (CSS); this is its
  // open/closed state and is inert on wider screens.
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <>
      <Presets />
      <div className="sandbox-grid">
        <div className={`fact-sheet${sheetOpen ? '' : ' collapsed'}`}>
          <button
            type="button"
            className="sheet-handle"
            aria-expanded={sheetOpen}
            aria-controls="fact-sheet-body"
            onClick={() => setSheetOpen((o) => !o)}
          >
            <span className="sheet-grip" aria-hidden="true" />
            <FormattedMessage id="drawer.factRecord" />
            <span aria-hidden="true">{sheetOpen ? '\u25BE' : '\u25B4'}</span>
          </button>
          <div id="fact-sheet-body" className="fact-sheet-body">
            <FactControls />
          </div>
        </div>
        <div>
          <Scene
            facts={state.facts}
            lights={lights}
            settings={state}
            onChange={patch}
          />

          <DisplayChips
            evaln={evaln}
            displayIndex={state.displayIndex}
            onDisplayIndex={(i) => patch({ displayIndex: i })}
            additionsOn={state.additionsOn}
            onAdditionsOn={(ids) => patch({ additionsOn: ids })}
          />

          <RulesPanel evaln={evaln} jurisdiction={state.jurisdiction} />

          <DataDrawer
            evaln={evaln}
            facts={state.facts}
            jurisdiction={state.jurisdiction}
            open={state.drawer}
            onOpen={(drawer) => patch({ drawer })}
          />
        </div>
      </div>
    </>
  );
}
