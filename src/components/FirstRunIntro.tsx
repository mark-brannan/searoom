// First-run intro (#108): one card over the Sandbox the first time a stranger
// opens the app, dismissable, never shown again. Storage is a per-viewer
// convenience, so every access is guarded and the card simply shows (or
// not) without it.

import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';

export const INTRO_SEEN_KEY = 'searoom.introSeen';

function alreadySeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function FirstRunIntro() {
  const [open, setOpen] = useState(() => !alreadySeen());
  const button = useRef<HTMLButtonElement>(null);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* storage blocked: the card closes for this visit only */
    }
  };

  useEffect(() => {
    if (!open) return;
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="intro-backdrop" onClick={dismiss}>
      <div
        className="intro-card"
        role="dialog"
        aria-labelledby="intro-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="intro-title">
          <FormattedMessage id="intro.title" />
        </h2>
        <p>
          <FormattedMessage id="intro.what" />
        </p>
        <p>
          <FormattedMessage id="intro.views" />
        </p>
        <p>
          <FormattedMessage id="intro.slider" />
        </p>
        <button ref={button} type="button" onClick={dismiss}>
          <FormattedMessage id="intro.dismiss" />
        </button>
      </div>
    </div>
  );
}
