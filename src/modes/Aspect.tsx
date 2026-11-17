// Aspect trainer (#120): ten glimpses of a vessel's lights alone, each
// followed by a pick of her heading on a dial, scored by angular error.
// A finished drill is appended to the quiz's local progress store.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Scene } from '../components/Scene';
import {
  ANSWER_MS,
  ASPECT_SCENES,
  GLIMPSE_MS,
  TOLERANCE_DEG,
  angularError,
  aspectScenes,
  headingSeenFrom,
  scoreDrill,
} from '../engine/aspect';
import { loadAspectRuns, recordAspectRun } from '../engine/quizProgress';
import type { AspectRun } from '../engine/quizProgress';
import { useJurisdiction } from '../state/store';

type Phase = 'idle' | 'glimpse' | 'ask' | 'done';

const R = 80;
const C = 100;

/** Dial reading of a point in the dial's viewBox: 0 up, clockwise. */
function readingAt(x: number, y: number): number {
  const deg = (Math.atan2(x - C, C - y) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

const onRing = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) };
};

function Dial({
  aim,
  onAim,
  onPick,
}: {
  aim: number | null;
  onAim: (deg: number) => void;
  onPick: (deg: number) => void;
}) {
  const intl = useIntl();
  const ref = useRef<SVGSVGElement>(null);
  const at = (e: PointerEvent<SVGSVGElement>) => {
    const box = ref.current!.getBoundingClientRect();
    return readingAt(
      ((e.clientX - box.left) / box.width) * 200,
      ((e.clientY - box.top) / box.height) * 200,
    );
  };
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = e.shiftKey ? 45 : 5;
    const from = aim ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onAim((from + step) % 360);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onAim((from + 360 - step) % 360);
    else if ((e.key === 'Enter' || e.key === ' ') && aim !== null) onPick(aim);
    else return;
    e.preventDefault();
  };
  const tip = aim === null ? null : onRing(aim, R - 6);
  return (
    <svg
      ref={ref}
      viewBox="0 0 200 200"
      className="aspect-dial"
      role="slider"
      tabIndex={0}
      aria-label={intl.formatMessage({ id: 'aspect.dial.label' })}
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={aim ?? undefined}
      aria-valuetext={
        aim === null ? undefined : intl.formatMessage({ id: 'aspect.dial.value' }, { deg: aim })
      }
      onPointerDown={(e) => {
        // aim on touch, pick on release: a touch screen has no hover to preview
        e.currentTarget.setPointerCapture(e.pointerId);
        onAim(at(e));
      }}
      onPointerMove={(e) => onAim(at(e))}
      onPointerUp={(e) => onPick(at(e))}
      onKeyDown={key}
    >
      <circle cx={C} cy={C} r={R} className="aspect-ring" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = onRing(i * 45, R);
        const b = onRing(i * 45, R - (i % 2 ? 6 : 10));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="aspect-tick" />;
      })}
      <text x={C} y={C + R + 16} className="aspect-you" textAnchor="middle">
        {intl.formatMessage({ id: 'aspect.dial.you' })}
      </text>
      <circle cx={C} cy={C} r={3} className="aspect-her" />
      {tip && <line x1={C} y1={C} x2={tip.x} y2={tip.y} className="aspect-aim" />}
    </svg>
  );
}

function RecentRuns({ runs }: { runs: AspectRun[] }) {
  if (runs.length === 0)
    return (
      <p className="elim">
        <FormattedMessage id="aspect.runs.empty" />
      </p>
    );
  return (
    <ul className="aspect-runs">
      {runs
        .slice(-5)
        .reverse()
        .map((r) => (
          <li key={r.at}>
            <FormattedMessage
              id="aspect.runs.row"
              values={{ mean: r.meanError, within: r.within, scenes: r.scenes }}
            />
          </li>
        ))}
    </ul>
  );
}

export function Aspect() {
  const jurisdiction = useJurisdiction();
  const [seed, setSeed] = useState(0);
  const scenes = useMemo(
    () => (seed ? aspectScenes(seed, jurisdiction, ASPECT_SCENES) : []),
    [seed, jurisdiction],
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [aim, setAim] = useState<number | null>(null);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [runs, setRuns] = useState<AspectRun[]>(loadAspectRuns);

  const start = () => {
    setSeed(Math.floor(Math.random() * 1e9) + 1);
    setIndex(0);
    setPicks([]);
    setAim(null);
    setPhase('glimpse');
  };

  const pick = (deg: number | null) => {
    const next = [...picks, deg];
    setPicks(next);
    setAim(null);
    if (next.length < scenes.length) {
      setIndex(next.length);
      setPhase('glimpse');
      return;
    }
    const errors = next.map((p, i) =>
      p === null ? 180 : angularError(p, headingSeenFrom(scenes[i].theta)),
    );
    setRuns(recordAspectRun({ at: Date.now(), scenes: scenes.length, ...scoreDrill(errors) }));
    setPhase('done');
  };

  // the clock: a glimpse gives way to the dial, and an unanswered dial to a miss
  const pickRef = useRef(pick);
  pickRef.current = pick;
  useEffect(() => {
    if (phase === 'glimpse') {
      const t = setTimeout(() => setPhase('ask'), GLIMPSE_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'ask') {
      const t = setTimeout(() => pickRef.current(null), ANSWER_MS);
      return () => clearTimeout(t);
    }
  }, [phase, index]);

  const scene = scenes[index];
  const errors = picks.map((p, i) =>
    p === null ? 180 : angularError(p, headingSeenFrom(scenes[i].theta)),
  );
  const score = scoreDrill(errors);

  return (
    <div className="aspect">
      <div className="panel">
        <h2>
          <FormattedMessage id="aspect.title" />
        </h2>
        <p className="elim">
          <FormattedMessage
            id="aspect.intro"
            values={{ scenes: ASPECT_SCENES, glimpse: GLIMPSE_MS / 1000, answer: ANSWER_MS / 1000 }}
          />
        </p>
        {phase !== 'idle' && phase !== 'done' && (
          <p className="quiz-score-line" role="status">
            <FormattedMessage
              id={phase === 'glimpse' ? 'aspect.glimpse' : 'aspect.ask'}
              values={{ n: index + 1, of: scenes.length }}
            />
          </p>
        )}
        {(phase === 'glimpse' || phase === 'ask') && (
          <div className="aspect-stage">
            {phase === 'glimpse' && scene && (
              <Scene
                facts={scene.facts}
                lights={scene.lights}
                settings={{ view: 'model', theta: scene.theta }}
                presentation="mini"
              />
            )}
            {phase === 'ask' && <Dial aim={aim} onAim={setAim} onPick={pick} />}
          </div>
        )}
        {(phase === 'idle' || phase === 'done') && (
          <div className="chips">
            <button className="chip" onClick={start}>
              <FormattedMessage id={phase === 'idle' ? 'aspect.start' : 'aspect.again'} />
            </button>
          </div>
        )}
        {phase === 'done' && (
          <>
            <p className="quiz-score-line" role="status">
              <FormattedMessage
                id="aspect.score"
                values={{
                  mean: score.meanError,
                  within: score.within,
                  scenes: scenes.length,
                  tolerance: TOLERANCE_DEG,
                }}
              />
            </p>
            <ol className="aspect-review">
              {scenes.map((s, i) => (
                <li key={i}>
                  <FormattedMessage
                    id={picks[i] === null ? 'aspect.review.none' : 'aspect.review.row'}
                    values={{
                      heading: headingSeenFrom(s.theta),
                      pick: picks[i],
                      error: Math.round(errors[i]),
                      name: s.fixtureName,
                    }}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
      <div className="panel">
        <h3>
          <FormattedMessage id="aspect.runs.title" />
        </h3>
        <RecentRuns runs={runs} />
      </div>
    </div>
  );
}
