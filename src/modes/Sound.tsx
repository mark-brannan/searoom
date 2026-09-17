// Sound signals — Part D. The mode over the signal table: pick a situation,
// hear the signal, read the paragraph. Two of those three are live; the
// paragraph is not, because colregs carries no Part D text until Q-1 is
// answered (mark-brannan/colregs#168), and the empty slot says so rather
// than quietly transcribing the rule here.
//
// Audio is synthesised in the browser — no assets, and the whistle's pitch
// comes from Annex III's length band, so a hundred-metre ship and a launch
// do not sound alike.

import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { findSignpost } from '../data/signposts';
import {
  attentionParagraph,
  signalsByRule,
  signalsFor,
  type SoundSignal,
} from '../data/soundSignals';
import {
  patternDurationS,
  patternGlyphs,
  whistleBandFor,
  type SignalPattern,
} from '../audio/signalPattern';
import { audioAvailable, playPattern, type Playing } from '../audio/synth';
import { patternWords } from '../components/signalWords';
import { SoundQuiz } from './SoundQuiz';
import type { AppState } from '../state/urlState';

/** Hull lengths that sit one in each Annex III whistle band. */
const LENGTHS = [12, 30, 120, 250];

export function usePlayer(lengthM: number) {
  const playing = useRef<Playing | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    playing.current?.stop();
    playing.current = null;
    if (timer.current) clearTimeout(timer.current);
    setNowPlaying(null);
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    (id: string, pattern: SignalPattern, hullM?: number) => {
      stop();
      const handle = playPattern(pattern, { lengthM: hullM ?? lengthM });
      if (!handle) return;
      playing.current = handle;
      setNowPlaying(id);
      timer.current = setTimeout(
        () => setNowPlaying(null),
        (handle.durationS + 0.2) * 1000,
      );
    },
    [lengthM, stop],
  );

  return { play, stop, nowPlaying };
}

function SignalRow({
  signal,
  selected,
  playingId,
  onSelect,
  onPlay,
}: {
  signal: SoundSignal;
  selected: boolean;
  playingId: string | null;
  onSelect: () => void;
  onPlay: () => void;
}) {
  const intl = useIntl();
  const situation = intl.formatMessage({ id: `signal.${signal.id}.situation` });
  return (
    <div className={`signal-row${selected ? ' selected' : ''}`}>
      <button className="signal-name" onClick={onSelect} aria-expanded={selected}>
        <span className="signal-cite">{signal.paragraph}</span>
        <span className="signal-situation">{situation}</span>
      </button>
      <span className="signal-glyphs" title={patternWords(intl, signal.pattern)}>
        <span aria-hidden="true">{patternGlyphs(signal.pattern)}</span>
        <span className="sr-only">{patternWords(intl, signal.pattern)}</span>
      </span>
      <button
        className={`chip play${playingId === signal.id ? ' active' : ''}`}
        onClick={onPlay}
        aria-label={intl.formatMessage(
          { id: 'sound.playLabel' },
          { situation },
        )}
      >
        {playingId === signal.id ? '■' : '▶'}
      </button>
    </div>
  );
}

function SignalDetail({ signal }: { signal: SoundSignal }) {
  const intl = useIntl();
  const sp = findSignpost('part-d')!;
  return (
    <div className="signal-detail">
      <p className="signal-timing">
        <FormattedMessage
          id="sound.timing"
          values={{
            glyphs: patternWords(intl, signal.pattern),
            seconds: patternDurationS(signal.pattern).toFixed(1),
          }}
        />
        {signal.pattern.repeatEveryS && (
          <>
            {' '}
            <FormattedMessage
              id="sound.repeat"
              values={{ seconds: signal.pattern.repeatEveryS }}
            />
          </>
        )}
      </p>
      <p className="signal-trigger">
        <code>{signal.trigger}</code>
      </p>
      <div className="signal-text-slot">
        <span className={`status-chip status-${sp.status}`}>
          <FormattedMessage id={`signpost.status.${sp.status}`} />
        </span>
        <p>
          <FormattedMessage
            id="sound.textPending"
            values={{ paragraph: signal.paragraph }}
          />
        </p>
        <p>
          <a
            href="https://github.com/mark-brannan/colregs/issues/168"
            target="_blank"
            rel="noreferrer"
          >
            <FormattedMessage id="sound.q1Link" />
          </a>
        </p>
      </div>
    </div>
  );
}

export function Sound({ state, patch }: { state: AppState; patch: (p: Patch) => void }) {
  const intl = useIntl();
  const [tab, setTab] = useState<'table' | 'quiz'>('table');
  const [lengthM, setLengthM] = useState(30);
  const [selected, setSelected] = useState<string | null>(null);
  const { play, stop, nowPlaying } = usePlayer(lengthM);
  const groups = signalsByRule('intl');
  const available = audioAvailable();
  const jurisdictionModelled = signalsFor(state.jurisdiction).length > 0;

  return (
    <div>
      <div className="panel">
        <h2>
          <FormattedMessage id="sound.title" />
        </h2>
        <p>
          <FormattedMessage id="sound.provisional" />
        </p>
        <p>
          <button className="chip" onClick={() => patch({ signpost: 'part-d' })}>
            <FormattedMessage id="sound.openSignpost" />
          </button>
        </p>
        <div className="chips" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'table'}
            className={`chip${tab === 'table' ? ' active' : ''}`}
            onClick={() => setTab('table')}
          >
            <FormattedMessage id="sound.tab.table" />
          </button>
          <button
            role="tab"
            aria-selected={tab === 'quiz'}
            className={`chip${tab === 'quiz' ? ' active' : ''}`}
            onClick={() => setTab('quiz')}
          >
            <FormattedMessage id="sound.tab.quiz" />
          </button>
        </div>
        {!available && (
          <p className="blocker">
            <FormattedMessage id="sound.noAudio" />
          </p>
        )}
        {!jurisdictionModelled && (
          <p className="blocker">
            <FormattedMessage
              id="sound.jurisdictionNote"
              values={{ jurisdiction: state.jurisdiction }}
            />
          </p>
        )}
      </div>

      {tab === 'table' ? (
        <div className="panel">
          <div className="fact-group">
            <span className="fact-label">
              <FormattedMessage id="sound.whistleBand" />
            </span>
            <div className="chips">
              {LENGTHS.map((m) => {
                const band = whistleBandFor(m);
                return (
                  <button
                    key={m}
                    className={`chip${lengthM === m ? ' active' : ''}`}
                    onClick={() => setLengthM(m)}
                  >
                    {intl.formatMessage(
                      { id: 'sound.band' },
                      { length: m, low: band.lowHz, high: band.highHz },
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {groups.map((g) => (
            <section key={g.rule}>
              <h3>
                <FormattedMessage id={`sound.rule.${g.rule}`} />
              </h3>
              <ul className="signal-list">
                {g.signals.map((s) => (
                  <li key={s.id} className="signal-item">
                    <SignalRow
                      signal={s}
                      selected={selected === s.id}
                      playingId={nowPlaying}
                      onSelect={() =>
                        setSelected((cur) => (cur === s.id ? null : s.id))
                      }
                      onPlay={() =>
                        nowPlaying === s.id
                          ? stop()
                          : play(s.id, s.pattern, s.lengthM)
                      }
                    />
                    {selected === s.id && <SignalDetail signal={s} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h3>
              <FormattedMessage id="sound.rule.36" />
            </h3>
            <p className="signal-note">
              <span className="signal-cite">{attentionParagraph.paragraph}</span>{' '}
              <FormattedMessage id="sound.attention" />
            </p>
          </section>
        </div>
      ) : (
        <SoundQuiz lengthM={lengthM} />
      )}
    </div>
  );
}
