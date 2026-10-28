// Quiz: both directions, seed in the URL, local progress, weighted drills,
// exams. Every question is generated from the data — scenarios from fixture
// fact records, distractors from near-miss records.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { describeFacts } from '../components/factLabel';
import { QUIZ_DIFFICULTIES, citeOf } from '../engine/quiz';
import type { QuizDifficulty, QuizQuestion } from '../engine/quiz';
import { evaluateDisplayIn } from '../engine/evaluate';
import {
  drillDifficulty,
  exportProgress,
  loadProgress,
  mergeProgress,
  nextDrillSeed,
  parseProgress,
  questionFor,
  record,
  rulesInPool,
  saveProgress,
} from '../engine/quizProgress';
import type { Progress } from '../engine/quizProgress';
import { RuleParagraphs } from '../components/RuleParagraphs';
import { QUIZ_MODES } from '../state/urlState';
import { useAppState, usePatch } from '../state/store';
import { Glow, PX, PZ, bearingInArc, bearingLabel, selectHull } from 'nav-wright';
import { placeLights } from '../render/navWright';
import { lights } from '../data/colregs';
import type { AppState } from '../state/urlState';
import type { Display, FactRecord } from '../engine/types';

function MiniProfile({
  facts,
  display,
}: {
  facts: FactRecord;
  display: Display;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts, lights);
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

/** A reverse question's card: lights only on black, the strict exam view. */
export function MiniBearing({
  facts,
  display,
  theta,
}: {
  facts: FactRecord;
  display: Display;
  theta: number;
}) {
  const hull = selectHull(facts);
  const placed = placeLights(display.lights, hull.spec, facts, lights);
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

export const EXAM_COUNT = 10;
export const EXAM_SECONDS = 600;

/** Cites of the display a reverse option stands for (the generator's first display). */
function reverseOptionCite(jurisdiction: string, facts: FactRecord): string {
  const d = evaluateDisplayIn(jurisdiction, facts).displays[0];
  return d ? citeOf(jurisdiction, d) : '';
}

function CitePanel({ cite, jurisdiction }: { cite: string; jurisdiction: string }) {
  return (
    <div className="quiz-why-col">
      {cite
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => (
          <RuleParagraphs key={c} cite={c} jurisdiction={jurisdiction} />
        ))}
    </div>
  );
}

function ProgressPanel({
  progress,
  onImport,
}: {
  progress: Progress;
  onImport: (p: Progress | null, count: number) => void;
}) {
  const intl = useIntl();
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = Object.entries(progress)
    .filter(([, t]) => t.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 5);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportProgress(progress)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'searoom-quiz-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseProgress(JSON.parse(await file.text()));
      onImport(parsed, parsed ? Object.keys(parsed).length : 0);
    } catch {
      onImport(null, 0);
    }
  };
  return (
    <div className="quiz-progress">
      <h3>
        <FormattedMessage id="quiz.progress.title" />
      </h3>
      {rows.length === 0 ? (
        <p className="elim">
          <FormattedMessage id="quiz.progress.empty" />
        </p>
      ) : (
        <ul>
          {rows.map(([name, t]) => (
            <li key={name}>
              <FormattedMessage
                id="quiz.progress.row"
                values={{ name, right: t.right, wrong: t.wrong }}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="chips">
        <button className="chip" onClick={download}>
          <FormattedMessage id="quiz.progress.export" />
        </button>
        <button className="chip" onClick={() => fileRef.current?.click()}>
          <FormattedMessage id="quiz.progress.import" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label={intl.formatMessage({ id: 'quiz.progress.import' })}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export function Quiz() {
  const state = useAppState();
  const patch = usePatch();
  const intl = useIntl();
  const { quizMode: mode, quizSeed, quizN, quizRule, quizDifficulty } = state;
  const reverse = state.quizDirection === 'reverse';
  const quizIndex = quizN - 1;
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [note, setNote] = useState<string | null>(null);
  // exam run, local: it starts on the button, not on the link
  const [exam, setExam] = useState<{ deadline: number; log: boolean[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const seed = quizSeed + quizIndex;
  const examDone =
    mode === 'exam' &&
    exam !== null &&
    (exam.log.length >= EXAM_COUNT || now >= exam.deadline);

  useEffect(() => {
    if (!exam || examDone) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [exam, examDone]);

  // a new question by any route (back/forward, an edited link, the
  // jurisdiction switcher) starts unanswered
  useEffect(() => setPicked(null), [seed, reverse, state.jurisdiction, quizDifficulty]);

  const rules = useMemo(() => rulesInPool(state.jurisdiction), [state.jurisdiction]);

  // a drilled rule the chosen level never asks about widens to one that does
  const askAt = (rule: string): QuizDifficulty =>
    mode === 'drill' ? drillDifficulty(state.jurisdiction, rule, quizDifficulty) : quizDifficulty;
  const level = askAt(quizRule);

  const question: QuizQuestion = useMemo(
    () => questionFor(seed, reverse, state.jurisdiction, level),
    [seed, reverse, state.jurisdiction, level],
  );

  const answer = (i: number) => {
    if (picked !== null || examDone) return;
    const ok = i === question.answerIndex;
    setPicked(i);
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    const nextProgress = record(progress, question.fixtureName, ok);
    saveProgress(nextProgress);
    setProgress(nextProgress);
    if (mode === 'exam' && exam) setExam({ ...exam, log: [...exam.log, ok] });
  };

  const next = () => {
    setPicked(null);
    if (mode === 'drill')
      patch({
        quizSeed: nextDrillSeed(seed, reverse, state.jurisdiction, progress, quizRule, level),
        quizN: 1,
      });
    else patch({ quizN: quizN + 1 });
  };

  const startExam = () => {
    setPicked(null);
    setNow(Date.now());
    setScore({ right: 0, total: 0 });
    setExam({ deadline: Date.now() + EXAM_SECONDS * 1000, log: [] });
    patch({ quizSeed: Math.floor(Math.random() * 1_000_000) + 1, quizN: 1 });
  };

  const setMode = (m: AppState['quizMode']) => {
    setPicked(null);
    setExam(null);
    setScore({ right: 0, total: 0 });
    patch({ quizMode: m, quizSeed: seed, quizN: 1 });
  };

  const setDifficulty = (d: QuizDifficulty) => {
    setPicked(null);
    setExam(null);
    setScore({ right: 0, total: 0 });
    patch({ quizDifficulty: d, quizSeed: seed, quizN: 1 });
  };
  const difficultyName = intl.formatMessage({ id: `quiz.difficulty.${quizDifficulty}` });

  const optionClass = (i: number) => {
    if (picked === null) return 'quiz-option';
    // an exam keeps the verdict back until the end
    if (mode === 'exam') return i === picked ? 'quiz-option selected' : 'quiz-option';
    if (i === question.answerIndex) return 'quiz-option right';
    if (i === picked) return 'quiz-option wrong';
    return 'quiz-option';
  };

  const wrong = picked !== null && picked !== question.answerIndex;
  const rightCite = question.cite;
  const chosenCite =
    picked === null
      ? ''
      : question.kind === 'forward'
        ? citeOf(state.jurisdiction, question.options[picked].display)
        : reverseOptionCite(state.jurisdiction, question.options[picked].facts);

  const secondsLeft = exam ? Math.max(0, Math.ceil((exam.deadline - now) / 1000)) : EXAM_SECONDS;
  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const examRight = exam ? exam.log.filter(Boolean).length : 0;

  const share = () => {
    const href = window.location.href;
    // no clipboard (insecure origin) or a refused write: show the link instead
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(href))
      .then(
        () => setNote(intl.formatMessage({ id: 'quiz.share.copied' })),
        () => setNote(href),
      );
  };

  const showQuestion = mode !== 'exam' || (exam !== null && !examDone);

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
          {([false, true] as const).map((r) => (
            <button
              key={String(r)}
              className={`chip${reverse === r ? ' active' : ''}`}
              role="radio"
              aria-checked={reverse === r}
              onClick={() => {
                setPicked(null);
                patch({ quizDirection: r ? 'reverse' : 'forward' });
              }}
            >
              <FormattedMessage id={r ? 'quiz.reverse.name' : 'quiz.forward.name'} />
            </button>
          ))}
          {mode !== 'exam' && (
            <span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>
              <FormattedMessage
                id="quiz.score"
                values={{ score: score.right, total: score.total }}
              />
            </span>
          )}
        </div>
        <div
          className="chips"
          role="radiogroup"
          aria-label={intl.formatMessage({ id: 'quiz.mode.label' })}
        >
          {QUIZ_MODES.map((m) => (
            <button
              key={m}
              className={`chip${mode === m ? ' active' : ''}`}
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
            >
              <FormattedMessage id={`quiz.mode.${m}`} />
            </button>
          ))}
          {mode === 'drill' && (
            <select
              value={quizRule}
              aria-label={intl.formatMessage({ id: 'quiz.rule.label' })}
              onChange={(e) => {
                setPicked(null);
                patch({
                  quizRule: e.target.value,
                  quizN: 1,
                  quizSeed: nextDrillSeed(
                    seed,
                    reverse,
                    state.jurisdiction,
                    progress,
                    e.target.value,
                    askAt(e.target.value),
                  ),
                });
              }}
            >
              <option value="">{intl.formatMessage({ id: 'quiz.rule.all' })}</option>
              {rules.map((r) => (
                <option key={r} value={r}>
                  {intl.formatMessage({ id: 'quiz.rule.option' }, { rule: r })}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="theta-control">
          <label htmlFor="quiz-difficulty">
            <FormattedMessage id="quiz.difficulty.label" />
          </label>
          <input
            id="quiz-difficulty"
            type="range"
            min={0}
            max={QUIZ_DIFFICULTIES.length - 1}
            step={1}
            value={QUIZ_DIFFICULTIES.indexOf(quizDifficulty)}
            onChange={(e) => setDifficulty(QUIZ_DIFFICULTIES[Number(e.target.value)])}
            aria-valuetext={difficultyName}
          />
          {/* a level name is short; the shared 11em would wrap it under the slider at phone width */}
          <span className="theta-readout" style={{ minWidth: '6em' }}>
            {difficultyName}
          </span>
        </div>

        {mode === 'exam' && !exam && (
          <div>
            <p>
              <FormattedMessage
                id="quiz.exam.intro"
                values={{ count: EXAM_COUNT, minutes: EXAM_SECONDS / 60 }}
              />
            </p>
            <button className="mode-tab" onClick={startExam}>
              <FormattedMessage id="quiz.exam.start" />
            </button>
          </div>
        )}
        {mode === 'exam' && examDone && exam && (
          <div role="status">
            <p>
              <FormattedMessage
                id={exam.log.length >= EXAM_COUNT ? 'quiz.exam.done' : 'quiz.exam.timeUp'}
                values={{ score: examRight, total: EXAM_COUNT, answered: exam.log.length }}
              />
            </p>
            <button className="mode-tab" onClick={startExam}>
              <FormattedMessage id="quiz.exam.again" />
            </button>
          </div>
        )}
        {mode === 'exam' && exam && !examDone && (
          <p className="elim">
            <FormattedMessage
              id="quiz.exam.progress"
              values={{ n: quizIndex + 1, count: EXAM_COUNT, time: clock }}
            />
          </p>
        )}

        {showQuestion && question.kind === 'forward' && (
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
                  <MiniProfile facts={o.facts} display={o.display} />
                </button>
              ))}
            </div>
          </>
        )}
        {showQuestion && question.kind === 'reverse' && (
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

        {showQuestion && picked !== null && mode !== 'exam' && (
          <p
            className={`quiz-feedback ${wrong ? 'no' : 'ok'}`}
            role="status"
          >
            <FormattedMessage
              id={wrong ? 'quiz.incorrect' : 'quiz.correct'}
              values={{ cite: rightCite }}
            />
          </p>
        )}
        {showQuestion && picked !== null && mode !== 'exam' && wrong && (
          <div className="quiz-why">
            <div>
              <h3>
                <FormattedMessage id="quiz.why.right" values={{ cite: rightCite }} />
              </h3>
              <CitePanel cite={rightCite} jurisdiction={state.jurisdiction} />
            </div>
            <div>
              <h3>
                <FormattedMessage id="quiz.why.chosen" values={{ cite: chosenCite }} />
              </h3>
              <CitePanel cite={chosenCite} jurisdiction={state.jurisdiction} />
            </div>
          </div>
        )}
        {showQuestion && picked !== null && mode !== 'exam' && (
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
        {showQuestion && (
          <div className="chips">
            <button
              className="mode-tab"
              onClick={next}
              disabled={mode === 'exam' && picked === null}
            >
              <FormattedMessage id="quiz.next" />
            </button>
            {mode !== 'exam' && (
              <button className="chip" onClick={share}>
                <FormattedMessage id="quiz.share" />
              </button>
            )}
            {note && <span className="elim">{note}</span>}
          </div>
        )}
      </div>
      <div className="panel">
        <ProgressPanel
          progress={progress}
          onImport={(p, count) => {
            if (!p) {
              setNote(intl.formatMessage({ id: 'quiz.progress.bad' }));
              return;
            }
            const merged = mergeProgress(progress, p);
            saveProgress(merged);
            setProgress(merged);
            setNote(intl.formatMessage({ id: 'quiz.progress.imported' }, { count }));
          }}
        />
      </div>
    </div>
  );
}
