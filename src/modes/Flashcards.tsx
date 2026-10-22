// Flashcards: a due deck over the quiz scenarios, Leitner boxes in
// localStorage. Front is a rendered scene or a cite, the back is the other.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { MiniProfile } from '../components/MiniProfile';
import { describeFacts } from '../components/factLabel';
import { buildDeck, filterDeck } from '../engine/flashcards';
import type { Card } from '../engine/flashcards';
import {
  BOXES,
  boxCounts,
  dueQueue,
  grade,
  loadBoxes,
  saveBoxes,
  today,
} from '../state/leitner';
import type { Boxes } from '../state/leitner';
import { useAppState } from '../state/store';

const SESSION_CAP = 20;

export function Flashcards() {
  const state = useAppState();
  const intl = useIntl();
  const [boxes, setBoxes] = useState<Boxes>(() => loadBoxes());
  const [rule, setRule] = useState('');
  const [family, setFamily] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [requeued, setRequeued] = useState<Card[]>([]);
  const [session, setSession] = useState(0);
  const day = today();

  const deck = useMemo(() => buildDeck(state.jurisdiction), [state.jurisdiction]);
  const rules = useMemo(
    () =>
      [...new Set(deck.map((c) => c.rule))]
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b)),
    [deck],
  );
  const families = useMemo(
    () => [...new Set(deck.map((c) => c.family))].filter(Boolean).sort(),
    [deck],
  );
  const filtered = useMemo(
    () => filterDeck(deck, { rule, family }),
    [deck, rule, family],
  );

  // the session's queue is fixed when it starts, so grading does not reshuffle it
  const queue = useMemo(
    () => dueQueue(filtered, boxes, day).slice(0, SESSION_CAP),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, session, day],
  );
  const dueTotal = useMemo(
    () => dueQueue(filtered, boxes, day).length,
    [filtered, boxes, day],
  );
  const [index, setIndex] = useState(0);
  const all = [...queue, ...requeued];
  const card = all[index];
  const counts = boxCounts(filtered, boxes);

  const answer = (right: boolean) => {
    if (!card) return;
    const next = grade(boxes, card.id, right, day);
    setBoxes(next);
    saveBoxes(next);
    // a miss is re-queued once: a re-queued card missed again waits for tomorrow
    if (!right && !requeued.includes(card)) setRequeued((r) => [...r, card]);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setRequeued([]);
    setIndex(0);
    setFlipped(false);
    setSession((s) => s + 1);
  };
  const reset = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    restart();
  };

  const scene = card && <MiniProfile facts={card.facts} display={card.display} />;
  const cite = card && <p className="flashcard-cite">{card.cite}</p>;
  const situation = card && <p>{describeFacts(intl, card.facts)}</p>;

  return (
    <div>
      <div className="panel flashcards">
        <h2>
          <FormattedMessage id="flashcards.title" />
        </h2>
        <div className="chips">
          <label>
            <FormattedMessage id="flashcards.filter.rule" />{' '}
            <select value={rule} onChange={reset(setRule)}>
              <option value="">{intl.formatMessage({ id: 'flashcards.filter.all' })}</option>
              {rules.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FormattedMessage id="flashcards.filter.family" />{' '}
            <select value={family} onChange={reset(setFamily)}>
              <option value="">{intl.formatMessage({ id: 'flashcards.filter.all' })}</option>
              {families.map((f) => (
                <option key={f} value={f}>
                  {intl.formatMessage({ id: `propulsion.${f}`, defaultMessage: f })}
                </option>
              ))}
            </select>
          </label>
          <span style={{ marginLeft: 'auto', color: 'var(--dim)' }}>
            <FormattedMessage id="flashcards.due" values={{ count: dueTotal }} />
          </span>
        </div>
        <p className="elim" aria-label={intl.formatMessage({ id: 'flashcards.boxes' })}>
          {counts.map((n, i) => (
            <span key={i} className="flashcard-box">
              <FormattedMessage id="flashcards.box" values={{ box: i + 1, count: n }} />
            </span>
          ))}
        </p>

        {card ? (
          <div className="flashcard" data-testid="flashcard">
            <p className="elim">
              <FormattedMessage
                id="flashcards.progress"
                values={{ n: index + 1, total: all.length }}
              />
            </p>
            {!flipped ? (
              <>
                {card.direction === 'scene-to-cite' ? (
                  <>
                    <p>
                      <FormattedMessage id="flashcards.front.scene" />
                    </p>
                    {scene}
                  </>
                ) : (
                  <>
                    <p>
                      <FormattedMessage id="flashcards.front.cite" />
                    </p>
                    {cite}
                  </>
                )}
                <button className="mode-tab" onClick={() => setFlipped(true)}>
                  <FormattedMessage id="flashcards.flip" />
                </button>
              </>
            ) : (
              <>
                {card.direction === 'scene-to-cite' ? cite : scene}
                {situation}
                <div className="chips">
                  <button className="mode-tab" onClick={() => answer(false)}>
                    <FormattedMessage id="flashcards.wrong" />
                  </button>
                  <button className="mode-tab" onClick={() => answer(true)}>
                    <FormattedMessage id="flashcards.right" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flashcard-done" role="status">
            <p>
              <FormattedMessage
                id={filtered.length === 0 ? 'flashcards.empty' : 'flashcards.done'}
                values={{ boxes: BOXES }}
              />
            </p>
            {dueTotal > 0 && (
              <button className="mode-tab" onClick={restart}>
                <FormattedMessage id="flashcards.more" />
              </button>
            )}
          </div>
        )}
        <p className="elim">
          <FormattedMessage id="flashcards.note" />
        </p>
      </div>
    </div>
  );
}
