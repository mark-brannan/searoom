import { FormattedMessage, useIntl } from 'react-intl';
import type { Patch } from '../App';
import type { AppState, Mode } from '../state/urlState';

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
          <button
            className="mode-tab"
            onClick={() => patch({ signpost: 'locale-picker' })}
            aria-haspopup="dialog"
          >
            <FormattedMessage id="locale.title" />
            {': '}
            {state.locale === 'fi' ? 'FI' : 'EN'}
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
