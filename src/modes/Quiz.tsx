// Quiz v1, both directions. Every question is generated from the data —
// scenarios from fixture fact records, distractors from near-miss records.

import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { describeFacts } from '../components/factLabel';
import { makeForward, makeReverse } from '../engine/quiz';
import type { QuizQuestion } from '../engine/quiz';
import { bearingLabel } from 'nav-wright';
import { Scene } from '../components/Scene';
import { useAppState, usePatch } from '../state/store';

export function Quiz() {
  const state = useAppState();
  const patch = usePatch();
  const intl = useIntl();
  const direction = state.quizDirection;
  const seed = state.quizSeed + state.quizN - 1;
  const [picked, setPicked] = useState<number | null>(null);
  // back/forward or a pasted URL changes the question: drop the old pick
  useEffect(() => setPicked(null), [seed, direction, state.jurisdiction]);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const question: QuizQuestion = useMemo(
    () =>
      direction === 'forward'
        ? makeForward(seed, state.jurisdiction)
        : makeReverse(seed, state.jurisdiction),
    [direction, seed, state.jurisdiction],
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
    patch({ quizN: state.quizN + 1 });
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
              patch({ quizDirection: 'forward' });
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
              patch({ quizDirection: 'reverse' });
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
                  aria-label={describeFacts(intl, o.facts)}
                >
                  <Scene
                    facts={o.facts}
                    lights={o.display.lights}
                    settings={{ view: 'profile', theta: 0 }}
                    presentation="mini"
                  />
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
            <Scene
              facts={question.facts}
              lights={question.display.lights}
              settings={{ view: 'bearing', theta: question.theta }}
              presentation="mini"
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
