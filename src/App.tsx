import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import fi from './i18n/fi.json';
import { catalogs } from './i18n';
import type { AppState, Mode } from './state/urlState';
import {
  DEFAULT_STATE,
  defaultCorpusFor,
  deserialize,
  serialize,
} from './state/urlState';
import { Header } from './components/Header';
import { SignpostPanel } from './components/SignpostPanel';
import { Sandbox } from './modes/Sandbox';
import { Identify } from './modes/Identify';
import { Quiz } from './modes/Quiz';
import { Rules } from './modes/Rules';
import { Sound } from './modes/Sound';
import { colregsVersion } from './data/colregs';
import { corpusIn } from './data/corpusText';
import { CorpusContext } from './state/corpusContext';

export type Patch = Partial<AppState>;

export function App() {
  const [state, setState] = useState<AppState>(() =>
    deserialize(window.location.hash),
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

  const locale = state.locale === 'fi' ? 'fi' : 'en';
  const messages = catalogs[locale];

  const body = useMemo(() => {
    switch (state.mode) {
      case 'sandbox':
        return <Sandbox state={state} patch={patch} />;
      case 'identify':
        return <Identify state={state} patch={patch} />;
      case 'quiz':
        return <Quiz state={state} />;
      case 'rules':
        return <Rules state={state} patch={patch} />;
      case 'sound':
        return <Sound patch={patch} />;
    }
  }, [state, patch]);

  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="en">
      <CorpusContext.Provider
        value={corpusIn(state.jurisdiction, state.corpus).id}
      >
      <div className="app">
        <Header state={state} patch={patch} setMode={setMode} />
        {locale === 'fi' && (
          <p className="draft-banner">
            {(fi as Record<string, string>)['app.draftBanner']}
          </p>
        )}
        <p className="disclaimer" role="note">
          <FormattedMessage id="app.disclaimer" />
        </p>
        {body}
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
