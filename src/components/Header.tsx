import { FormattedMessage, useIntl } from 'react-intl';
import { useApp } from '../state/store';
import type { Mode } from '../state/urlState';

const MODES: Mode[] = [
  'sandbox',
  'identify',
  'quiz',
  'flashcards',
  'rules',
  'sound',
  'vessels',
];

/** One row: the mark, the mode tabs, the settings button (#105). */
export function Header({ onSettings }: { onSettings: () => void }) {
  const mode = useApp((s) => s.state.mode);
  const setMode = useApp((s) => s.setMode);
  const intl = useIntl();
  return (
    <header className="topbar">
      <h1 className="brand">
        <span className="brand-word">Searoom</span>
        <span className="lights" aria-hidden="true">
          <span style={{ color: 'var(--red)' }}>●</span>
          <span style={{ color: 'var(--white-light)' }}>●</span>
          <span style={{ color: 'var(--green)' }}>●</span>
        </span>
      </h1>
      <nav
        className="mode-nav"
        aria-label={intl.formatMessage({ id: 'mode.nav.label' })}
      >
        {MODES.map((m) => (
          <button
            key={m}
            className={`mode-tab${mode === m ? ' active' : ''}`}
            aria-current={mode === m ? 'page' : undefined}
            onClick={() => setMode(m)}
          >
            <FormattedMessage id={`mode.${m}`} />
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="mode-tab settings-button"
        onClick={onSettings}
        aria-haspopup="dialog"
        aria-label={intl.formatMessage({ id: 'settings.open' })}
      >
        <span aria-hidden="true">⚙</span>
        <span className="settings-button-label">
          <FormattedMessage id="settings.open" />
        </span>
      </button>
    </header>
  );
}
