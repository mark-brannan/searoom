import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import en from './i18n/en.json';
import fi from './i18n/fi.json';
import type { AppState, Mode } from './state/urlState';
import { DEFAULT_STATE, deserialize, serialize } from './state/urlState';
import { Header } from './components/Header';
import { SignpostPanel } from './components/SignpostPanel';
import { Sandbox } from './modes/Sandbox';
import { Identify } from './modes/Identify';
import { Quiz } from './modes/Quiz';
import { Rules } from './modes/Rules';
import { Sound } from './modes/Sound';
import { colregsVersion, corpus } from './data/colregs';

const catalogs: Record<string, Record<string, string>> = {
  en: en as Record<string, string>,
  // draft catalog: untranslated keys fall back to English (UI chrome only —
  // legal text never goes through a catalog)
  fi: { ...(en as Record<string, string>), ...(fi as Record<string, string>) },
};

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
    setState((s) => ({ ...s, ...p }));
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
        return <Quiz />;
      case 'rules':
        return <Rules state={state} patch={patch} />;
      case 'sound':
        return <Sound patch={patch} />;
    }
  }, [state, patch]);

  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="en">
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
                jurisdiction: corpus.jurisdiction,
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
            onOpen={(id) => patch({ signpost: id })}
          />
        )}
      </div>
    </IntlProvider>
  );
}

export const defaultState = DEFAULT_STATE;
