// The v1 core: fact record, scene + lawful displays + the rules that fired.
// Alternatives stay unresolved — the app shows every lawful display and lets
// elimination teach the choice. Two layouts are under trial (experiments.ts):
// A puts the facts in a rail and the arcs in a side panel, C puts the scene
// first with the arcs inset on it.

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAppState, usePatch } from '../state/store';
import { useVariant } from '../state/experiments';
import { Presets } from '../components/Presets';
import { FactControls } from '../components/FactControls';
import { ALL_VIEWS, Arcs, Scene } from '../components/Scene';
import { DisplayChips } from '../components/DisplayChips';
import { RulesPanel } from '../components/RulesPanel';
import { DataDrawer } from '../components/DataDrawer';
import { evaluateDisplayIn } from '../engine/evaluate';
import type { View } from '../state/urlState';

const ARCS_KEY = 'searoom.arcs';

function useArcsShown(): [boolean, (shown: boolean) => void] {
  const [shown, setShown] = useState(() => {
    try {
      return window.localStorage.getItem(ARCS_KEY) !== 'hidden';
    } catch {
      return true;
    }
  });
  const set = (s: boolean) => {
    setShown(s);
    try {
      window.localStorage.setItem(ARCS_KEY, s ? 'shown' : 'hidden');
    } catch {
      // storage blocked: the choice lasts this visit
    }
  };
  return [shown, set];
}

function ArcsToggle({
  shown,
  onShown,
}: {
  shown: boolean;
  onShown: (shown: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="arcs-toggle"
      aria-expanded={shown}
      onClick={() => onShown(!shown)}
    >
      <FormattedMessage
        id={shown ? 'sandbox.arcs.hide' : 'sandbox.arcs.show'}
      />
    </button>
  );
}

export function Sandbox() {
  const state = useAppState();
  const patch = usePatch();
  const layout = useVariant('layout');
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

  const [arcsShown, setArcsShown] = useArcsShown();
  // the arcs leave the tabs while they are on screen beside the scene
  const views: View[] = arcsShown
    ? ALL_VIEWS.filter((v) => v !== 'plan')
    : ALL_VIEWS;

  const scene = (
    <Scene
      facts={state.facts}
      lights={lights}
      settings={state}
      onChange={patch}
      views={views}
    />
  );
  const arcs = (
    <Arcs
      facts={state.facts}
      lights={lights}
      theta={state.theta}
      onTheta={(theta) => patch({ theta })}
    />
  );
  const chips = (
    <DisplayChips
      evaln={evaln}
      displayIndex={state.displayIndex}
      onDisplayIndex={(i) => patch({ displayIndex: i })}
      additionsOn={state.additionsOn}
      onAdditionsOn={(ids) => patch({ additionsOn: ids })}
    />
  );
  const rules = <RulesPanel evaln={evaln} jurisdiction={state.jurisdiction} />;
  const drawer = (
    <DataDrawer
      evaln={evaln}
      facts={state.facts}
      jurisdiction={state.jurisdiction}
      open={state.drawer}
      onOpen={(drawer) => patch({ drawer })}
    />
  );
  const toggle = <ArcsToggle shown={arcsShown} onShown={setArcsShown} />;

  return layout === 'c' ? (
    <LayoutC
      scene={scene}
      arcs={arcs}
      arcsShown={arcsShown}
      toggle={toggle}
      chips={chips}
      rules={rules}
      ruleCount={evaln.applied.length}
      drawer={drawer}
    />
  ) : (
    <LayoutA
      scene={scene}
      arcs={arcs}
      arcsShown={arcsShown}
      toggle={toggle}
      chips={chips}
      rules={rules}
      drawer={drawer}
    />
  );
}

type Pieces = {
  scene: ReactNode;
  arcs: ReactNode;
  arcsShown: boolean;
  toggle: ReactNode;
  chips: ReactNode;
  rules: ReactNode;
  drawer: ReactNode;
};

/** A · rail, stage, arcs. */
function LayoutA({
  scene,
  arcs,
  arcsShown,
  toggle,
  chips,
  rules,
  drawer,
}: Pieces) {
  // Under 520 px the fact controls are a bottom sheet (CSS); this is its
  // open/closed state and is inert on wider screens.
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <>
      <Presets />
      <div
        className={`sandbox-grid sandbox-a${arcsShown ? '' : ' arcs-hidden'}`}
      >
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
            <span aria-hidden="true">{sheetOpen ? '▾' : '▴'}</span>
          </button>
          <div id="fact-sheet-body" className="fact-sheet-body">
            <FactControls />
          </div>
        </div>
        <div className="sandbox-stage">{scene}</div>
        <section className="panel arcs-panel">
          <div className="arcs-head">
            <h2>
              <FormattedMessage id="view.plan" />
            </h2>
            {toggle}
          </div>
          {arcsShown && arcs}
        </section>
        <div className="sandbox-rest">
          {chips}
          {rules}
          {drawer}
        </div>
      </div>
    </>
  );
}

/** C · scene first. */
function LayoutC({
  scene,
  arcs,
  arcsShown,
  toggle,
  chips,
  rules,
  ruleCount,
  drawer,
}: Pieces & { ruleCount: number }) {
  const intl = useIntl();
  return (
    <div className="sandbox-c">
      <Presets />
      <div className="scene-wrap">
        {scene}
        <aside
          className={`arcs-inset${arcsShown ? '' : ' collapsed'}`}
          aria-label={intl.formatMessage({ id: 'view.plan' })}
        >
          <div className="arcs-head">
            <FormattedMessage id="view.plan" />
            {toggle}
          </div>
          {arcsShown && arcs}
        </aside>
      </div>
      {chips}
      <div className="fact-row">
        <FactControls />
      </div>
      <details className="rules-why" open>
        <summary>
          <FormattedMessage
            id="sandbox.rules.why"
            values={{ count: ruleCount }}
          />
        </summary>
        {rules}
      </details>
      {drawer}
    </div>
  );
}
