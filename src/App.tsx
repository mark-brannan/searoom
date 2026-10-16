import { Suspense, lazy, useEffect, useMemo } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import fi from './i18n/fi.json';
import { catalogs } from './i18n';
<<<<<<< HEAD
import type { AppState, Mode } from './state/urlState';
import {
  DEFAULT_STATE,
  defaultCorpusFor,
  deserialize,
  serialize,
} from './state/urlState';
import { saveSettings, stateFromHash } from './state/settings';
=======
import { DEFAULT_STATE } from './state/urlState';
import { startSync, useAppState, usePatch } from './state/store';
>>>>>>> origin/main
import { Header } from './components/Header';
import { SignpostPanel } from './components/SignpostPanel';
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
const Rules = lazy(() =>
  import('./modes/Rules').then((m) => ({ default: m.Rules })),
);
const Sound = lazy(() =>
  import('./modes/Sound').then((m) => ({ default: m.Sound })),
);

export function App() {
<<<<<<< HEAD
  const [state, setState] = useState<AppState>(() =>
    stateFromHash(window.location.hash),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // hash -> state (back button, hand-edited URL)
  useEffect(() => {
    const onHash = () => {
      const s = deserialize(window.location.hash);
      if (serialize(s) !== serialize(stateRef.current)) setState(s);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // state -> hash
  useEffect(() => {
    const target = serialize(state);
    if (window.location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }, [state]);

  // preferences that outlive the visit
  useEffect(() => {
    saveSettings({ locale: state.locale, jurisdiction: state.jurisdiction });
  }, [state.locale, state.jurisdiction]);

  const patch = useCallback((p: Patch) => {
    setState((s) => {
      const next = { ...s, ...p };
      // the corpus belongs to the jurisdiction in view: switching jurisdiction
      // re-picks that jurisdiction's reference corpus unless the patch names one
      if (
        p.jurisdiction !== undefined &&
        p.jurisdiction !== s.jurisdiction &&
        p.corpus === undefined
      ) {
        next.corpus = defaultCorpusFor(p.jurisdiction);
      }
      return next;
    });
  }, []);

  const setMode = useCallback(
    (mode: Mode) => {
      // mode switches get a history entry so back works between modes
      const next = { ...stateRef.current, mode };
      history.pushState(null, '', serialize(next));
      setState(next);
    },
    [],
  );
=======
  const state = useAppState();
  const patch = usePatch();
  const layout = useVariant('layout');
  useEffect(() => startSync(), []);
>>>>>>> origin/main

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
            {state.mode === 'sandbox' && (
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
