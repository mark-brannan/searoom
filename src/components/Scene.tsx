// The scene: the view tabs over one display, with its θ, range and
// presentation settings. Every placed display is drawn through this component;
// the 'mini' presentation is the tab-less card the Quiz uses.

import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { rovingKeyDown } from './roving';
import { lights as lightCatalog } from '../data/colregs';
import type { DisplayLight, FactRecord } from '../engine/types';
import {
  Glow,
  PX,
  PZ,
  PlanView,
  bearingInArc,
  selectHull,
  skyColor,
} from 'nav-wright';
import type { Aspect } from 'nav-wright';
import { placeLights } from '../render/navWright';
import { MeshProfileView } from '../render/MeshProfileView';
import { profileSide, seenFrom } from '../render/profileSide';
import type { ProfileSide } from '../render/profileSide';
import { BearingModelView, bearingHullOpacity } from 'nav-wright/benchy';
import type { BenchyLabels } from 'nav-wright/benchy';
import {
  BENCHY_MODEL_URL,
  modelUrlForVariant,
  modelVariantsForHull,
  stepMesh,
} from '../render/hullModels';
import { DEFAULT_STATE } from '../state/urlState';
import type { AppState, View } from '../state/urlState';

export type SceneSettings = Pick<
  AppState,
  'view' | 'theta' | 'tilt' | 'hullHint' | 'sky' | 'mesh' | 'benchy'
>;

const ASPECTS: Aspect[] = [
  'ahead',
  'starboard-bow',
  'starboard-beam',
  'starboard-quarter',
  'astern',
  'port-quarter',
  'port-beam',
  'port-bow',
];

function SceneSlider({
  id,
  label,
  value,
  readout,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  readout: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="theta-control">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={readout}
      />
      <span className="theta-readout">{readout}</span>
    </div>
  );
}

/** The profile from the observer's side: mirrored from port. With sky and
 * hull hint it matches the 3D view's night. */
function ProfileStage({
  side,
  sky,
  hullHint,
  children,
}: {
  side: ProfileSide;
  sky?: number;
  hullHint?: number;
  children: ReactNode;
}) {
  const style: Record<string, string | number> = {};
  if (sky !== undefined) {
    style['--sea-night'] = skyColor(sky / 100);
    style['--sea-below'] = skyColor((sky / 100) * 0.7);
  }
  if (hullHint !== undefined)
    style['--hull-opacity'] = bearingHullOpacity(hullHint / 100);
  return (
    <div
      className="profile-stage"
      data-side={side}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
}

function MiniProfile({
  facts,
  lights,
  theta,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
}) {
  const hull = selectHull(facts);
  const side = profileSide(theta);
  const placed = seenFrom(
    placeLights(lights, hull.spec, facts, lightCatalog),
    side,
  );
  return (
    <ProfileStage side={side}>
      <svg viewBox="0 0 440 240" className="scene-svg" aria-hidden="true">
        <rect width="440" height="240" fill="var(--sea-night)" />
        <line
          x1="0"
          y1={PZ(0)}
          x2="440"
          y2={PZ(0)}
          stroke="var(--waterline)"
        />
        <hull.Profile />
        {placed.map((l) => (
          <Glow
            key={l.key}
            x={PX(l.fx) + l.py * 10}
            y={PZ(l.z)}
            color={l.color}
            flashing={l.character === 'flashing'}
            dim={l.py < -0.05}
          />
        ))}
      </svg>
    </ProfileStage>
  );
}

function MiniBearing({
  facts,
  lights,
  theta,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(lights, hull.spec, facts, lightCatalog);
  const rad = (theta * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 440 240"
      className="scene-svg scene-svg-black"
      aria-hidden="true"
    >
      <rect width="440" height="240" fill="#000" />
      {placed
        .filter(
          (l) =>
            bearingInArc(theta, l.arc) && l.lightId !== 'light:deck_lights',
        )
        .map((l) => (
          <Glow
            key={l.key}
            x={220 + (l.fx * Math.sin(rad) - l.py * Math.cos(rad)) * 150}
            y={150 - l.z * 95}
            color={l.color}
            flashing={l.character === 'flashing'}
            r={5.5}
          />
        ))}
    </svg>
  );
}

export function Scene({
  facts,
  lights,
  settings,
  onChange,
  presentation = 'full',
  views = ALL_VIEWS,
}: {
  facts: FactRecord;
  /** the lights to draw: a display's, plus any optional additions switched on */
  lights: DisplayLight[];
  /** 'mini' needs only view and theta */
  settings: Pick<SceneSettings, 'view' | 'theta'> & Partial<SceneSettings>;
  onChange?: (patch: Partial<SceneSettings>) => void;
  presentation?: 'full' | 'mini';
  /** the view tabs offered; a view outside them shows the first */
  views?: View[];
}) {
  if (presentation === 'mini')
    return settings.view === 'bearing' ? (
      <MiniBearing facts={facts} lights={lights} theta={settings.theta} />
    ) : (
      <MiniProfile facts={facts} lights={lights} theta={settings.theta} />
    );
  return (
    <FullScene
      facts={facts}
      lights={lights}
      settings={{ ...DEFAULT_STATE, ...settings }}
      onChange={onChange ?? (() => {})}
      views={views}
    />
  );
}

function useSceneLabels(): BenchyLabels {
  const intl = useIntl();
  return useMemo(
    () => ({
      bearingAlt: (theta) =>
        intl.formatMessage({ id: 'scene.bearing.alt' }, { theta }),
      bearingNoLights: intl.formatMessage({ id: 'scene.bearing.noLights' }),
      bearingThetaLabel: intl.formatMessage({ id: 'scene.bearing.thetaLabel' }),
      bearingThetaValue: (theta, aspect) =>
        intl.formatMessage(
          { id: 'scene.bearing.thetaValue' },
          { theta, aspect },
        ),
      aspect: Object.fromEntries(
        ASPECTS.map((a) => [a, intl.formatMessage({ id: `aspect.${a}` })]),
      ) as Record<Aspect, string>,
      planAlt: intl.formatMessage({ id: 'scene.plan.alt' }),
      profileAlt: intl.formatMessage({ id: 'scene.profile.alt' }),
      benchyAlt: intl.formatMessage({ id: 'scene.benchy.alt' }),
      benchyTiltLabel: intl.formatMessage({ id: 'scene.benchy.tiltLabel' }),
      benchyTiltValue: (tilt) =>
        intl.formatMessage({ id: 'scene.benchy.tiltValue' }, { tilt }),
    }),
    [intl],
  );
}

function usePlaced(facts: FactRecord, lights: DisplayLight[]) {
  const hull = useMemo(() => selectHull(facts), [facts]);
  const placed = useMemo(
    () => placeLights(lights, hull.spec, facts, lightCatalog),
    [lights, hull, facts],
  );
  return { hull, placed };
}

/** The overhead arcs on their own, for a layout that shows them beside the scene. */
export function Arcs({
  facts,
  lights,
  theta,
  onTheta,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
  onTheta: (theta: number) => void;
}) {
  const labels = useSceneLabels();
  const { hull, placed } = usePlaced(facts, lights);
  return (
    <PlanView
      hull={hull}
      placed={placed}
      theta={theta}
      onTheta={onTheta}
      labels={labels}
    />
  );
}

export const ALL_VIEWS: View[] = ['profile', 'bearing', 'plan'];

function FullScene({
  facts,
  lights,
  settings,
  onChange,
  views,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  settings: SceneSettings;
  onChange: (patch: Partial<SceneSettings>) => void;
  views: View[];
}) {
  const intl = useIntl();
  const sceneLabels = useSceneLabels();
  const { hull, placed } = usePlaced(facts, lights);
  const view = views.includes(settings.view) ? settings.view : views[0];
  const side = profileSide(settings.theta);
  const percentText = (v: number): string =>
    intl.formatNumber(v / 100, { style: 'percent' });

  return (
    <div className="panel scene-panel">
      <div
        className="view-tabs"
        role="tablist"
        onKeyDown={rovingKeyDown}
        aria-label={intl.formatMessage({ id: 'view.label' })}
      >
        {views.map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            tabIndex={view === v ? 0 : -1}
            className={`view-tab${view === v ? ' active' : ''}`}
            onClick={() => onChange({ view: v })}
          >
            <FormattedMessage id={`view.${v}`} />
          </button>
        ))}
      </div>
      {view === 'profile' && (
        <>
          <ProfileStage
            side={side}
            sky={settings.sky}
            hullHint={settings.hullHint}
          >
            <MeshProfileView
              modelUrl={modelUrlForVariant(hull, settings.mesh)}
              hull={hull}
              placed={seenFrom(placed, side)}
              facts={facts}
              labels={sceneLabels}
            />
          </ProfileStage>
          <p className="profile-side">
            <FormattedMessage id={`scene.profile.side.${side}`} />
          </p>
        </>
      )}
      {view === 'bearing' && (
        <BearingModelView
          modelUrl={
            settings.benchy
              ? BENCHY_MODEL_URL
              : modelUrlForVariant(hull, settings.mesh)
          }
          hull={hull}
          placed={placed}
          facts={facts}
          theta={settings.theta}
          onTheta={(t) => onChange({ theta: t })}
          tilt={settings.tilt}
          onTilt={(t) => onChange({ tilt: t })}
          hullHint={settings.hullHint / 100}
          sky={settings.sky / 100}
          labels={sceneLabels}
        />
      )}
      {(view === 'profile' || view === 'bearing') && (
        <>
          <SceneSlider
            id="hull-hint"
            label={intl.formatMessage({ id: 'scene.hullHint' })}
            value={settings.hullHint}
            readout={
              settings.hullHint === 0
                ? intl.formatMessage({ id: 'scene.hullHint.off' })
                : percentText(settings.hullHint)
            }
            onChange={(v) => onChange({ hullHint: v })}
          />
          <SceneSlider
            id="sky"
            label={intl.formatMessage({ id: 'scene.sky' })}
            value={settings.sky}
            readout={percentText(settings.sky)}
            onChange={(v) => onChange({ sky: v })}
          />
        </>
      )}
      {view === 'bearing' && (
        <>
          <label className="check-row" htmlFor="mesh">
            <FormattedMessage id="scene.mesh" />
            <select
              id="mesh"
              value={
                modelVariantsForHull(hull).some((v) => v.name === settings.mesh)
                  ? settings.mesh
                  : ''
              }
              disabled={settings.benchy}
              onChange={(e) => onChange({ mesh: e.target.value })}
            >
              {modelVariantsForHull(hull).map((v, i) => (
                <option key={v.name} value={i === 0 ? '' : v.name}>
                  {v.name.slice(hull.spec.id.length + 1).replace(/\.glb$/, '')}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={settings.benchy}
              aria-label={intl.formatMessage({ id: 'scene.mesh.prev' })}
              onClick={() =>
                onChange({ mesh: stepMesh(hull, settings.mesh, -1) })
              }
            >
              {'\u2039'}
            </button>
            <button
              type="button"
              disabled={settings.benchy}
              aria-label={intl.formatMessage({ id: 'scene.mesh.next' })}
              onClick={() =>
                onChange({ mesh: stepMesh(hull, settings.mesh, 1) })
              }
            >
              {'\u203A'}
            </button>
          </label>
          <label className="check-row" htmlFor="benchy">
            <input
              id="benchy"
              type="checkbox"
              checked={settings.benchy}
              onChange={(e) => onChange({ benchy: e.target.checked })}
            />
            <FormattedMessage id="scene.benchy.toggle" />
          </label>
        </>
      )}
      {view === 'plan' && (
        <PlanView
          hull={hull}
          placed={placed}
          theta={settings.theta}
          onTheta={(t) => onChange({ theta: t })}
          labels={sceneLabels}
        />
      )}
    </div>
  );
}
