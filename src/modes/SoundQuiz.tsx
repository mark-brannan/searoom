// Sound quiz, both directions. Forward: the situation is given, the options
// are patterns you can play. Reverse: the signal sounds, the options are
// situations. Both are generated from the signal table — the same contract
// the light quiz has with the fixture records.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { makeSoundForward, makeSoundReverse } from '../engine/soundQuiz';
import { patternGlyphs } from '../audio/signalPattern';
import { patternWords } from '../components/signalWords';
import { usePlayer } from './Sound';

export function SoundQuiz({ lengthM }: { lengthM: number }) {
  const intl = useIntl();
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward');
  const [seed, setSeed] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const { play, stop, nowPlaying } = usePlayer(lengthM);

  const question = useMemo(
    () =>
      direction === 'forward' ? makeSoundForward(seed) : makeSoundReverse(seed),
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
    stop();
    setPicked(null);
    setSeed((s) => s + 1);
  };

  const optionClass = (i: number) => {
    if (picked === null) return 'quiz-option';
    if (i === question.answerIndex) return 'quiz-option right';
    if (i === picked) return 'quiz-option wrong';
    return 'quiz-option';
  };

  const situationOf = (id: string) =>
    intl.formatMessage({ id: `signal.${id}.situation` });

  return (
    <div className="panel">
      <div className="chips">
        <button
          className={`chip${direction === 'forward' ? ' active' : ''}`}
          onClick={() => {
            setDirection('forward');
            setPicked(null);
            stop();
          }}
        >
          <FormattedMessage id="sound.quiz.forward.name" />
        </button>
        <button
          className={`chip${direction === 'reverse' ? ' active' : ''}`}
          onClick={() => {
            setDirection('reverse');
            setPicked(null);
            stop();
          }}
        >
          <FormattedMessage id="sound.quiz.reverse.name" />
        </button>
        <span className="quiz-score-line">
          <FormattedMessage
            id="quiz.score"
            values={{ score: score.right, total: score.total }}
          />
        </span>
      </div>

      {direction === 'forward' ? (
        <>
          <p className="quiz-prompt-line">
            <FormattedMessage
              id="sound.quiz.forward.prompt"
              values={{ situation: situationOf(question.signal.id) }}
            />
          </p>
          <div className="quiz-options">
            {question.options.map((o, i) => (
              <div key={o.id} className="sound-option">
                <button className={optionClass(i)} onClick={() => answer(i)}>
                  <span className="signal-glyphs">{patternGlyphs(o.pattern)}</span>
                  <span className="signal-words">{patternWords(intl, o.pattern)}</span>
                </button>
                <button
                  className={`chip play${nowPlaying === `opt-${o.id}` ? ' active' : ''}`}
                  onClick={() =>
                    nowPlaying === `opt-${o.id}`
                      ? stop()
                      : play(`opt-${o.id}`, o.pattern, o.lengthM)
                  }
                  aria-label={intl.formatMessage({ id: 'sound.quiz.hearOption' })}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="quiz-prompt-line">
            {/* Rule 34's signals are sounded in sight of another vessel and
                Rule 35's in fog — one prompt for both would contradict the
                rule it is asking about. */}
            <FormattedMessage
              id={`sound.quiz.reverse.prompt.${question.signal.category}`}
            />
          </p>
          <p>
            <button
              className="chip play active-hint"
              onClick={() =>
                nowPlaying === 'question'
                  ? stop()
                  : play(
                      'question',
                      question.signal.pattern,
                      question.signal.lengthM,
                    )
              }
            >
              <FormattedMessage id="sound.quiz.hear" />
            </button>
            {picked !== null && (
              <span className="signal-glyphs">
                {' '}
                {patternGlyphs(question.signal.pattern)}
              </span>
            )}
          </p>
          <div className="quiz-options">
            {question.options.map((o, i) => (
              <button
                key={o.id}
                className={optionClass(i)}
                onClick={() => answer(i)}
              >
                <span className="signal-cite">{o.paragraph}</span>{' '}
                {situationOf(o.id)}
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
            id={picked === question.answerIndex ? 'quiz.correct' : 'quiz.incorrect'}
            values={{ cite: question.cite }}
          />
        </p>
      )}
      <p>
        <button className="mode-tab" onClick={next}>
          <FormattedMessage id="quiz.next" />
        </button>
      </p>
      <p className="elim">
        <FormattedMessage id="sound.quiz.explain" />
      </p>
    </div>
  );
}
