import { Suspense, lazy, useEffect, useMemo } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import fi from './i18n/fi.json';
import { catalogs } from './i18n';
import { DEFAULT_STATE } from './state/urlState';
import { startSync, useAppState, usePatch } from './state/store';
import { Header } from './components/Header';
import { FirstRunIntro } from './components/FirstRunIntro';
import { SignpostPanel } from './components/SignpostPanel';
import { colregsVersion } from './data/colregs';
import { corpusIn } from './data/corpusText';
import { CorpusContext } from './state/corpusContext';

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
const Rules = lazy(() =>
  import('./modes/Rules').then((m) => ({ default: m.Rules })),
);
const Sound = lazy(() =>
  import('./modes/Sound').then((m) => ({ default: m.Sound })),
);

export function App() {
  const state = useAppState();
  const patch = usePatch();
  useEffect(() => startSync(), []);

  const locale = state.locale === 'fi' ? 'fi' : 'en';
  const messages = catalogs[locale];

  const body = useMemo(() => {
    switch (state.mode) {
      case 'sandbox':
        return <Sandbox />;
      case 'identify':
        return <Identify />;
      case 'quiz':
        return <Quiz />;
      case 'rules':
        return <Rules />;
      case 'sound':
        return <Sound />;
    }
  }, [state.mode]);

  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="en">
      <CorpusContext.Provider
        value={corpusIn(state.jurisdiction, state.corpus).id}
      >
        <div className="app">
          <Header />
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
                  jurisdiction: state.jurisdiction,
                }}
              />
            </span>
            <a href="https://github.com/mark-brannan/colregs">colregs</a>
            <a href="https://github.com/mark-brannan/searoom">searoom</a>
          </footer>
          {state.mode === 'sandbox' && !state.signpost && <FirstRunIntro />}
          {state.signpost && (
            <SignpostPanel
              id={state.signpost}
              onClose={() => patch({ signpost: null })}
              locale={state.locale}
              onLocale={(l) => patch({ locale: l })}
              jurisdiction={state.jurisdiction}
              corpus={state.corpus}
              onCorpus={(c) => patch({ corpus: c })}
              onOpen={(id) => patch({ signpost: id })}
            />
          )}
        </div>
      </CorpusContext.Provider>
    </IntlProvider>
  );
}

export const defaultState = DEFAULT_STATE;
