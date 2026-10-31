import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import fi from './i18n/fi.json';
import { catalogs } from './i18n';
import { DEFAULT_STATE } from './state/urlState';
import { startSync, useMode, usePrefs, useJurisdiction } from './state/store';
import { Header } from './components/Header';
import { SettingsSheet } from './components/SettingsSheet';
import { reducesMotion, useSettings } from './state/settings';
import { FirstRunIntro } from './components/FirstRunIntro';
import { OpenSignpost } from './components/SignpostPanel';
import { colregsVersion } from './data/colregs';
import { corpusIn } from './data/corpusText';
import { CorpusContext } from './state/corpusContext';
import { EXPERIMENTS, setVariant, useVariant } from './state/experiments';

// Each mode loads on first open, so the shell chunk carries none of them.
const Sandbox = lazy(() =>
  import('./modes/Sandbox').then((m) => ({ default: m.Sandbox })),
);
const Identify = lazy(() =>
  import('./modes/Identify').then((m) => ({ default: m.Identify })),
);
const Quiz = lazy(() =>
  import('./modes/Quiz').then((m) => ({ default: m.Quiz })),
);
const Flashcards = lazy(() =>
  import('./modes/Flashcards').then((m) => ({ default: m.Flashcards })),
);
const Rules = lazy(() =>
  import('./modes/Rules').then((m) => ({ default: m.Rules })),
);
const Sound = lazy(() =>
  import('./modes/Sound').then((m) => ({ default: m.Sound })),
);

const Vessels = lazy(() =>
  import('./modes/Vessels').then((m) => ({ default: m.Vessels })),
);

export function App() {
  const mode = useMode();
  const { locale: uiLocale, corpus, signpost } = usePrefs();
  const jurisdiction = useJurisdiction();
  const layout = useVariant('layout');
  useEffect(() => startSync(), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  useMotionPreference(useSettings().motion);

  const locale = uiLocale === 'fi' ? 'fi' : 'en';
  const messages = catalogs[locale];

  const body = useMemo(() => {
    switch (mode) {
      case 'sandbox':
        return <Sandbox />;
      case 'identify':
        return <Identify />;
      case 'quiz':
        return <Quiz />;
      case 'flashcards':
        return <Flashcards />;
      case 'rules':
        return <Rules />;
      case 'sound':
        return <Sound />;
      case 'vessels':
        return <Vessels />;
    }
  }, [mode]);

  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="en">
      <CorpusContext.Provider
        value={corpusIn(jurisdiction, corpus).id}
      >
        <div className="app">
          <Header onSettings={() => setSettingsOpen(true)} />
          {locale === 'fi' && (
            <p className="draft-banner">
              {(fi as Record<string, string>)['app.draftBanner']}
            </p>
          )}
          <p className="disclaimer" role="note">
            <FormattedMessage id="app.disclaimer" />
          </p>
          <Suspense
            fallback={
              <p className="mode-loading" role="status">
                <FormattedMessage id="app.loading" />
              </p>
            }
          >
            {body}
          </Suspense>
          <footer className="footer">
            <span>
              <FormattedMessage
                id="app.poweredBy"
                values={{
                  version: colregsVersion,
                  jurisdiction: jurisdiction,
                }}
              />
            </span>
            <a href="https://github.com/mark-brannan/colregs">colregs</a>
            <a href="https://github.com/mark-brannan/searoom">searoom</a>
            {mode === 'sandbox' && (
              <span
                className="layout-switch"
                role="group"
                aria-labelledby="layout-switch-label"
              >
                <span id="layout-switch-label">
                  <FormattedMessage id="app.layout" />
                </span>
                {EXPERIMENTS.layout.variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={layout === v}
                    onClick={() => setVariant('layout', v)}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </span>
            )}
          </footer>
          {mode === 'sandbox' && !signpost && !settingsOpen && <FirstRunIntro />}
          {settingsOpen && (
            <SettingsSheet onClose={closeSettings} covered={!!signpost} />
          )}
          <OpenSignpost />
        </div>
      </CorpusContext.Provider>
    </IntlProvider>
  );
}

export const defaultState = DEFAULT_STATE;

/**
 * Resolve the motion preference against the OS setting onto the root as
 * `data-motion="reduce" | "full"`; the stylesheet reads it.
 */
function useMotionPreference(pref: Parameters<typeof reducesMotion>[0]) {
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      document.documentElement.dataset.motion = reducesMotion(
        pref,
        !!mq?.matches,
      )
        ? 'reduce'
        : 'full';
    };
    apply();
    mq?.addEventListener('change', apply);
    return () => mq?.removeEventListener('change', apply);
  }, [pref]);
}
