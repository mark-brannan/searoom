// The v1 core: fact record, scene + lawful displays + the rules that fired.
// Alternatives stay unresolved — the app shows every lawful display and lets
// elimination teach the choice. Two layouts are under trial (experiments.ts):
// A puts the facts in a rail and the arcs in a side panel, C puts the scene
// first with the arcs inset on it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePatch, useSituation, useSlice } from '../state/store';
import { useVariant } from '../state/experiments';
import { Presets } from '../components/Presets';
import { FactControls } from '../components/FactControls';
import { ALL_VIEWS, Arcs, BearingAside, Scene } from '../components/Scene';
import { DisplayChips } from '../components/DisplayChips';
import { RulesPanel } from '../components/RulesPanel';
import { DataDrawer } from '../components/DataDrawer';
import { evaluateDisplayIn } from '../engine/evaluate';
import type { SandboxView, View } from '../state/urlState';

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
  const { jurisdiction, facts } = useSituation();
  const sb = useSlice('sandbox');
  const patchApp = usePatch();
  const patch = useCallback(
    (p: Partial<SandboxView>) => patchApp({ sandbox: p }),
    [patchApp],
  );
  const layout = useVariant('layout');
  const evaln = useMemo(
    () => evaluateDisplayIn(jurisdiction, facts),
    [jurisdiction, facts],
  );
  const current = Math.max(
    0,
    Math.min(sb.displayIndex, evaln.displays.length - 1),
  );
  useEffect(() => {
    if (sb.displayIndex !== current) patch({ displayIndex: current });
  }, [sb.displayIndex, current, patch]);

  const display = evaln.displays[current];
  const lights = useMemo(() => {
    if (!display) return [];
    const additionLights = evaln.optionalAdditions
      .filter((a) => sb.additionsOn.includes(a.id))
      .flatMap((a) => a.lights);
    return [...display.lights, ...additionLights];
  }, [display, evaln, sb.additionsOn]);

  const [arcsShown, setArcsShown] = useArcsShown();
  // the arcs leave the tabs while they are on screen beside the scene
  const views: View[] = arcsShown
    ? ALL_VIEWS.filter((v) => v !== 'plan')
    : ALL_VIEWS;
  // ...so the store never names a tab that is not offered: the scene would
  // draw the 3D view while the state and the URL still said plan
  useEffect(() => {
    if (arcsShown && sb.view === 'plan') patch({ view: 'model' });
  }, [arcsShown, sb.view, patch]);

  const scene = (
    <Scene
      facts={facts}
      lights={lights}
      settings={sb}
      onChange={patch}
      views={views}
    />
  );
  const arcs = (
    <Arcs
      facts={facts}
      lights={lights}
      theta={sb.theta}
      onTheta={(theta) => patch({ theta })}
    />
  );
  const chips = (
    <DisplayChips
      evaln={evaln}
      displayIndex={sb.displayIndex}
      onDisplayIndex={(i) => patch({ displayIndex: i })}
      additionsOn={sb.additionsOn}
      onAdditionsOn={(ids) => patch({ additionsOn: ids })}
    />
  );
  const rules = <RulesPanel evaln={evaln} jurisdiction={jurisdiction} />;
  const drawer = (
    <DataDrawer
      evaln={evaln}
      facts={facts}
      jurisdiction={jurisdiction}
      open={sb.drawer}
      onOpen={(drawer) => patch({ drawer })}
    />
  );
  const toggle = <ArcsToggle shown={arcsShown} onShown={setArcsShown} />;
  // the lights-only view, beside the scene; shown unless the URL
  // says it was hidden
  const bearing = (
    <section className="panel bearing-panel">
      <div className="arcs-head">
        <h2>
          <FormattedMessage id="scene.aside.title" />
        </h2>
        <ArcsToggle
          shown={sb.bearingAside}
          onShown={(bearingAside) => patch({ bearingAside })}
        />
      </div>
      {sb.bearingAside && (
        <BearingAside
          facts={facts}
          lights={lights}
          theta={sb.theta}
          onTheta={(theta) => patch({ theta })}
          sky={sb.sky}
        />
      )}
    </section>
  );

  return layout === 'c' ? (
    <LayoutC
      scene={scene}
      bearing={bearing}
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
      bearing={bearing}
      bearingShown={sb.bearingAside}
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
  bearing: ReactNode;
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
  bearing,
  bearingShown,
  arcs,
  arcsShown,
  toggle,
  chips,
  rules,
  drawer,
}: Pieces & { bearingShown: boolean }) {
  // Under 520 px the fact controls are a bottom sheet (CSS); this is its
  // open/closed state and is inert on wider screens.
  const [sheetOpen, setSheetOpen] = useState(true);

  return (
    <>
      <Presets />
      <div
        className={`sandbox-grid sandbox-a${arcsShown ? '' : ' arcs-hidden'}${bearingShown ? '' : ' bearing-hidden'}`}
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
        <div className="sandbox-side">
          {bearing}
          <section className="panel arcs-panel">
            <div className="arcs-head">
              <h2>
                <FormattedMessage id="view.plan" />
              </h2>
              {toggle}
            </div>
            {arcsShown && arcs}
          </section>
        </div>
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
  bearing,
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
      {bearing}
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
