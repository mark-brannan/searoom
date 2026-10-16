import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import { JURISDICTIONS } from '../data/jurisdictions';
import type { AppState, Mode } from '../state/urlState';
import { jurisdictions as signposted } from '../data/signposts';
import { useCorpus } from '../state/corpusContext';

const SIGNPOST_PREFIX = 'sp:';
const MODES: Mode[] = ['sandbox', 'identify', 'quiz', 'rules', 'sound'];

export function Header({
  state,
  patch,
  setMode,
}: {
  state: AppState;
  patch: (p: Patch) => void;
  setMode: (m: Mode) => void;
}) {
  const intl = useIntl();
  const corpus = useCorpus();
  return (
    <header className="header-wrap">
      <div className="header">
        <h1 className="brand">
          Searoom{' '}
          <span className="lights" aria-hidden="true">
            <span style={{ color: 'var(--red)' }}>●</span>
            <span style={{ color: 'var(--white-light)' }}>●</span>
            <span style={{ color: 'var(--green)' }}>●</span>
          </span>
        </h1>
        <span className="tagline">
          <FormattedMessage id="app.tagline" />
        </span>
        <div className="header-actions">
          <label className="jurisdiction-picker">
            <span className="sr-only">
              <FormattedMessage id="jurisdiction.label" />
            </span>
            <select
              value={state.jurisdiction}
              onChange={(e) => {
                // a signposted row has no data to select: open its panel,
                // and the controlled value keeps the jurisdiction in view
                const v = e.target.value;
                if (v.startsWith(SIGNPOST_PREFIX))
                  patch({ signpost: v.slice(SIGNPOST_PREFIX.length) });
                else patch({ jurisdiction: v });
              }}
              aria-label={intl.formatMessage({ id: 'jurisdiction.label' })}
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {intl.formatMessage({
                    id: j.labelKey,
                    defaultMessage: j.id,
                  })}
                </option>
              ))}
              <optgroup
                label={intl.formatMessage({ id: 'jurisdiction.signposted' })}
              >
                {signposted
                  .filter((s) => s.status !== 'live')
                  .map((s) => (
                    <option key={s.id} value={SIGNPOST_PREFIX + s.id}>
                      {s.label ?? intl.formatMessage({ id: s.labelKey! })}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          <button
            className="mode-tab"
            onClick={() => patch({ signpost: 'locale-picker' })}
            aria-haspopup="dialog"
          >
            <FormattedMessage id="locale.title" />
            {': '}
            {state.locale === 'fi' ? 'FI' : 'EN'}
            {' · '}
            <FormattedMessage id="header.text" values={{ language: corpus.language }} />
          </button>
        </div>
      </div>
      <nav
        className="mode-nav"
        aria-label={intl.formatMessage({ id: 'mode.nav.label' })}
      >
        {MODES.map((m) => (
          <button
            key={m}
            className={`mode-tab${state.mode === m ? ' active' : ''}`}
            aria-current={state.mode === m ? 'page' : undefined}
            onClick={() => setMode(m)}
          >
            <FormattedMessage id={`mode.${m}`} />
          </button>
        ))}
      </nav>
    </header>
  );
}
