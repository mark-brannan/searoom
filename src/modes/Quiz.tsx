// Quiz v1, both directions. Every question is generated from the data —
// scenarios from fixture fact records, distractors from near-miss records.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { describeFacts } from '../components/factLabel';
import { makeForward, makeReverse } from '../engine/quiz';
import type { QuizQuestion } from '../engine/quiz';
import { bearingLabel } from '../render/BearingView';
import { selectHull } from '../render/hulls';
import { placeLights, bearingInArc } from '../render/placement';
import { Glow } from '../render/svg';
import type { Display, FactRecord } from '../engine/types';
import { PX, PZ } from '../render/hulls';

function MiniProfile({
  facts,
  display,
}: {
  facts: FactRecord;
  display: Display;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts);
  return (
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
  );
}

function MiniBearing({
  facts,
  display,
  theta,
}: {
  facts: FactRecord;
  display: Display;
  theta: number;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts);
  const rad = (theta * Math.PI) / 180;
  return (
    <svg viewBox="0 0 440 240" className="scene-svg scene-svg-black" aria-hidden="true">
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

export function Quiz() {
  const intl = useIntl();
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward');
  const [seed, setSeed] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const question: QuizQuestion = useMemo(
    () => (direction === 'forward' ? makeForward(seed) : makeReverse(seed)),
    [direction, seed],
  );

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setScore((s) => ({
      right: s.right + (i === question.answerIndex ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const next = () => {
    setPicked(null);
    setSeed((s) => s + 1);
  };

  const optionClass = (i: number) => {
    if (picked === null) return 'quiz-option';
    if (i === question.answerIndex) return 'quiz-option right';
    if (i === picked) return 'quiz-option wrong';
    return 'quiz-option';
  };

  return (
    <div>
      <div className="panel">
        <h2>
          <FormattedMessage id="quiz.title" />
        </h2>
        <div
          className="chips"
          role="radiogroup"
          aria-label={intl.formatMessage({ id: 'quiz.direction.label' })}
        >
          <button
            className={`chip${direction === 'forward' ? ' active' : ''}`}
            role="radio"
            aria-checked={direction === 'forward'}
            onClick={() => {
              setDirection('forward');
              setPicked(null);
            }}
          >
            <FormattedMessage id="quiz.forward.name" />
          </button>
          <button
            className={`chip${direction === 'reverse' ? ' active' : ''}`}
            role="radio"
            aria-checked={direction === 'reverse'}
            onClick={() => {
              setDirection('reverse');
              setPicked(null);
            }}
          >
            <FormattedMessage id="quiz.reverse.name" />
          </button>
          <span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>
            <FormattedMessage
              id="quiz.score"
              values={{ score: score.right, total: score.total }}
            />
          </span>
        </div>

        {question.kind === 'forward' ? (
          <>
            <p>
              <FormattedMessage
                id="quiz.forward.prompt"
                values={{ scenario: describeFacts(intl, question.facts) }}
              />
            </p>
            <div className="quiz-options">
              {question.options.map((o, i) => (
                <button
                  key={i}
                  className={optionClass(i)}
                  onClick={() => answer(i)}
                  aria-pressed={picked === i}
                >
                  <MiniProfile facts={o.facts} display={o.display} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>
              <FormattedMessage
                id="quiz.reverse.prompt"
                values={{
                  aspect: intl.formatMessage({
                    id: `aspect.${bearingLabel(question.theta)}`,
                  }),
                }}
              />
            </p>
            <MiniBearing
              facts={question.facts}
              display={question.display}
              theta={question.theta}
            />
            <div className="quiz-options">
              {question.options.map((o, i) => (
                <button
                  key={i}
                  className={optionClass(i)}
                  onClick={() => answer(i)}
                  aria-pressed={picked === i}
                >
                  <FormattedMessage
                    id="quiz.reverse.optionAspect"
                    values={{
                      label: describeFacts(intl, o.facts),
                      aspect: intl.formatMessage({
                        id: `aspect.${bearingLabel(o.theta)}`,
                      }),
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {picked !== null && (
          <p
            className={`quiz-feedback ${picked === question.answerIndex ? 'ok' : 'no'}`}
            role="status"
          >
            <FormattedMessage
              id={
                picked === question.answerIndex
                  ? 'quiz.correct'
                  : 'quiz.incorrect'
              }
              values={{ cite: question.cite }}
            />
          </p>
        )}
        {picked !== null && (
          <p className="elim">
            <FormattedMessage
              id="quiz.explain"
              values={{
                ids:
                  question.kind === 'forward'
                    ? question.correct.entries.join(', ')
                    : question.display.entries.join(', '),
              }}
            />
          </p>
        )}
        <button className="mode-tab" onClick={next}>
          <FormattedMessage id="quiz.next" />
        </button>
      </div>
    </div>
  );
}
