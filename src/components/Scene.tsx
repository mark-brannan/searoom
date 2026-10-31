// The scene: the 3D view (and the arcs, when offered as a tab) over one
// display, with its θ, range and presentation settings. Every placed display is drawn through this component;
// the 'mini' presentation is the tab-less card the Quiz uses.

import { useMemo } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { rovingKeyDown } from './roving';
import { lights as lightCatalog } from '../data/colregs';
import type { DisplayLight, FactRecord } from '../engine/types';
import {
  Glow,
  PX,
  PZ,
  PlanView,
  ThetaControl,
  bearingInArc,
  selectHull,
  skyColor,
  useDragRotate,
  wrapDegrees,
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
  FALLBACK_MODEL_URL,
  modelVariants,
  stepMesh,
} from '../render/hullModels';
import {
  DEFAULT_SANDBOX,
  MAX_TILT,
  RANGE_MAX_NM,
  RANGE_MIN_NM,
  RANGE_STEP_NM,
} from '../state/urlState';
import type { SandboxView, View } from '../state/urlState';

export type SceneSettings = Pick<
  SandboxView,
  'view' | 'theta' | 'tilt' | 'hullHint' | 'range' | 'sky' | 'mesh' | 'benchy'
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
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
}: {
  id: string;
  label: string;
  value: number;
  readout: string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** shown but inert: the control does not apply to this view */
  disabled?: boolean;
}) {
  return (
    <div className={`theta-control${disabled ? ' disabled' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={readout}
      />
      <span className="theta-readout">{readout}</span>
    </div>
  );
}

/** The profile from the observer's side: mirrored from port. With sky,
 * hull hint and range it matches the 3D view's night. `drag` makes the
 * vessel a handle: grabbing it turns θ, as the 3D view's orbit does. */
function ProfileStage({
  side,
  sky,
  hullHint,
  range,
  drag,
  children,
}: {
  side: ProfileSide;
  sky?: number;
  hullHint?: number;
  range?: number;
  drag?: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}) {
  const style: Record<string, string | number> = {};
  if (sky !== undefined) {
    style['--sea-night'] = skyColor(sky / 100);
    style['--sea-below'] = skyColor((sky / 100) * 0.7);
  }
  if (hullHint !== undefined)
    style['--hull-opacity'] = bearingHullOpacity(hullHint / 100, range);
  return (
    <div
      className={`profile-stage${drag ? ' grab' : ''}`}
      data-side={side}
      style={style as CSSProperties}
      {...drag}
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
        <line x1="0" y1={PZ(0)} x2="440" y2={PZ(0)} stroke="var(--waterline)" />
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

/** Her lights alone, as seen from θ: the exam view. Black unless a sky is
 * given; `drag` turns θ by grabbing it. */
function MiniBearing({
  facts,
  lights,
  theta,
  sky,
  drag,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
  sky?: number;
  drag?: HTMLAttributes<SVGSVGElement>;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(lights, hull.spec, facts, lightCatalog);
  const rad = (theta * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 440 240"
      className={`scene-svg scene-svg-black${drag ? ' grab' : ''}`}
      aria-hidden="true"
      {...drag}
    >
      <rect
        width="440"
        height="240"
        fill={sky ? skyColor(sky / 100) : '#000'}
      />
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
    return settings.view === 'model' ? (
      <MiniBearing facts={facts} lights={lights} theta={settings.theta} />
    ) : (
      <MiniProfile facts={facts} lights={lights} theta={settings.theta} />
    );
  return (
    <FullScene
      facts={facts}
      lights={lights}
      settings={{ ...DEFAULT_SANDBOX, ...settings }}
      onChange={onChange ?? (() => {})}
      views={views}
    />
  );
}

export function useSceneLabels(): BenchyLabels {
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

/** The bearing view on its own, lights only, for a layout that shows it
 * beside the scene: grabbing it turns θ like the views it sits beside. */
export function BearingAside({
  facts,
  lights,
  theta,
  onTheta,
  sky,
}: {
  facts: FactRecord;
  lights: DisplayLight[];
  theta: number;
  onTheta: (theta: number) => void;
  sky?: number;
}) {
  const drag = useDragRotate<SVGSVGElement>(theta, (t) =>
    onTheta(wrapDegrees(t)),
  );
  return (
    <MiniBearing
      facts={facts}
      lights={lights}
      theta={theta}
      sky={sky}
      drag={drag}
    />
  );
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

export const ALL_VIEWS: View[] = ['model', 'plan'];

// The tabs are views of one vessel, so each draws the same controls; one
// that does not apply to the view stays in place, disabled.
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
  const onTheta = (t: number) => onChange({ theta: wrapDegrees(t) });
  const stageDrag = useDragRotate<HTMLDivElement>(settings.theta, onTheta);
  const percentText = (v: number): string =>
    intl.formatNumber(v / 100, { style: 'percent' });
  const variants = useMemo(() => modelVariants(facts), [facts]);
  const meshVariant =
    variants.find((v) => v.name === settings.mesh) ?? variants[0];
  const meshUrl = meshVariant?.url ?? FALLBACK_MODEL_URL;
  const meshOff = view === 'plan' || (view === 'model' && settings.benchy);

  return (
    <div className="panel scene-panel">
      {views.length > 1 && (
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
      )}
      <div className="scene-main">
        {/* unreachable: no tab offers 'profile' (refs #218) */}
        {view === 'profile' && (
          <>
            <ProfileStage
              side={side}
              sky={settings.sky}
              hullHint={settings.hullHint}
              range={settings.range}
              drag={stageDrag}
            >
              <MeshProfileView
                modelUrl={meshUrl}
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
        {view === 'model' && (
          <BearingModelView
            modelUrl={
              settings.benchy
                ? BENCHY_MODEL_URL
                : meshUrl
            }
            mesh={settings.benchy ? undefined : meshVariant?.record}
            hull={hull}
            placed={placed}
            facts={facts}
            theta={settings.theta}
            onTheta={onTheta}
            tilt={settings.tilt}
            onTilt={(t) => onChange({ tilt: t })}
            hullHint={settings.hullHint / 100}
            range={settings.range}
            sky={settings.sky / 100}
            labels={sceneLabels}
          />
        )}
        {view === 'plan' && (
          <PlanView
            hull={hull}
            placed={placed}
            theta={settings.theta}
            onTheta={onTheta}
            labels={sceneLabels}
          />
        )}
        {/* the 3D view draws its own dial and tilt; the flat views borrow
              the same dial, and tilt waits for the camera there */}
        {view !== 'model' && (
          <>
            <ThetaControl
              theta={settings.theta}
              onTheta={onTheta}
              labels={sceneLabels}
              plan={hull.plan}
            />
            <SceneSlider
              id="tilt"
              label={sceneLabels.benchyTiltLabel}
              value={settings.tilt}
              readout={`${Math.round(settings.tilt)}°`}
              max={MAX_TILT}
              disabled
              onChange={(t) => onChange({ tilt: t })}
            />
          </>
        )}
        <SceneSlider
          id="hull-hint"
          label={intl.formatMessage({ id: 'scene.hullHint' })}
          value={settings.hullHint}
          readout={
            settings.hullHint === 0
              ? intl.formatMessage({ id: 'scene.hullHint.off' })
              : percentText(settings.hullHint)
          }
          disabled={view === 'plan'}
          onChange={(v) => onChange({ hullHint: v })}
        />
        <SceneSlider
          id="range"
          label={intl.formatMessage({ id: 'scene.range' })}
          value={settings.range}
          min={RANGE_MIN_NM}
          max={RANGE_MAX_NM}
          step={RANGE_STEP_NM}
          readout={intl.formatMessage(
            { id: 'scene.range.value' },
            {
              range: intl.formatNumber(settings.range, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            },
          )}
          disabled={view === 'plan'}
          onChange={(v) => onChange({ range: v })}
        />
        <SceneSlider
          id="sky"
          label={intl.formatMessage({ id: 'scene.sky' })}
          value={settings.sky}
          readout={percentText(settings.sky)}
          disabled={view === 'plan'}
          onChange={(v) => onChange({ sky: v })}
        />
        <label className="check-row" htmlFor="mesh">
          <FormattedMessage id="scene.mesh" />
          <select
            id="mesh"
            value={
              variants.some((v) => v.name === settings.mesh)
                ? settings.mesh
                : ''
            }
            disabled={meshOff}
            onChange={(e) => onChange({ mesh: e.target.value })}
          >
            {variants.map((v, i) => (
              <option key={v.name} value={i === 0 ? '' : v.name}>
                {v.fits
                  ? v.label
                  : intl.formatMessage(
                      { id: 'scene.mesh.scaled' },
                      { name: v.label },
                    )}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={meshOff}
            aria-label={intl.formatMessage({ id: 'scene.mesh.prev' })}
            onClick={() =>
              onChange({ mesh: stepMesh(facts, settings.mesh, -1) })
            }
          >
            {'‹'}
          </button>
          <button
            type="button"
            disabled={meshOff}
            aria-label={intl.formatMessage({ id: 'scene.mesh.next' })}
            onClick={() => onChange({ mesh: stepMesh(facts, settings.mesh, 1) })}
          >
            {'›'}
          </button>
        </label>
        <label
          className={`benchy-toggle${view === 'model' ? '' : ' disabled'}`}
          htmlFor="benchy"
        >
          <input
            id="benchy"
            type="checkbox"
            checked={settings.benchy}
            disabled={view !== 'model'}
            onChange={(e) => onChange({ benchy: e.target.checked })}
          />
          <FormattedMessage id="scene.benchy.toggle" />
        </label>
      </div>
    </div>
  );
}
