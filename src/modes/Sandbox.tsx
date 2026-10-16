// The v1 core: fact record on the left, scene + lawful displays + the
// rules that fired on the right. Alternatives stay unresolved — the app
// shows every lawful display and lets elimination teach the choice.

import { useEffect, useMemo } from 'react';
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

  return (
    <>
      <Presets />
      <div className="sandbox-grid">
        <FactControls />
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
