// The signpost surface. A signposted dead end is not a greyed-out
// mystery: the panel carries the measured delta, the status, and the
// blocker by id — the dead end IS content. Two composite panels (the
// jurisdiction picker and the locale picker) are built on the same
// surface, per the design doc.

import { useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { Signpost } from '../data/signposts';
import { corpora, findSignpost, jurisdictions, parts } from '../data/signposts';

function StatusChip({
  status,
  kind,
}: {
  status: Signpost['status'];
  kind?: Signpost['kind'];
}) {
  const intl = useIntl();
  // corpora are licence-sequenced, not delta-measured — their queue
  // status reads differently from a jurisdiction's
  const specific = `signpost.status.${status}.${kind}`;
  const id =
    kind === 'corpus' && intl.messages[specific]
      ? specific
      : `signpost.status.${status}`;
  return (
    <span className={`status-chip status-${status}`}>
      <FormattedMessage id={id} />
    </span>
  );
}

function SignpostBody({ sp }: { sp: Signpost }) {
  const intl = useIntl();
  return (
    <div className="signpost-body">
      <StatusChip status={sp.status} kind={sp.kind} />
      {sp.tier && (
        <span className="badge tier" style={{ marginLeft: 8 }}>
          {intl.formatMessage({ id: `corpus.tier.${sp.tier}` })}
          {sp.language ? ` · ${sp.language}` : ''}
        </span>
      )}
      {sp.bodyKeys.map((k) => (
        <p key={k}>
          <FormattedMessage id={k} />
        </p>
      ))}
      {sp.blockers.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="signpost.blockedBy" />
          </h3>
          {sp.blockers.map((b) => (
            <p key={b.id} className="blocker">
              <span className="bid">{b.id}</span>
              <FormattedMessage id={b.textKey} />
            </p>
          ))}
        </>
      )}
      <p>
        <a href={sp.link} target="_blank" rel="noreferrer">
          <FormattedMessage id="signpost.upstream" />
        </a>
      </p>
    </div>
  );
}

function JurisdictionPickerBody({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <p className="signpost-body">
        <FormattedMessage id="sp.jurisdictions.intro" />
      </p>
      <div className="picker-list">
        {jurisdictions.map((j) => (
          <button
            key={j.id}
            className={`picker-row${j.id === 'intl' ? ' current' : ''}`}
            onClick={() => onOpen(j.id)}
          >
            <span className="grow label">
              <FormattedMessage id={j.labelKey} />
            </span>
            <StatusChip status={j.status} />
          </button>
        ))}
      </div>
      <h3 style={{ marginTop: 18 }}>
        <FormattedMessage id="sp.parts.title" />
      </h3>
      <div className="picker-list">
        {parts.map((p) => (
          <button
            key={p.id}
            className="picker-row"
            onClick={() => onOpen(p.id)}
          >
            <span className="grow label">
              <FormattedMessage id={p.labelKey} />
            </span>
            <StatusChip status={p.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalePickerBody({
  locale,
  onLocale,
  onOpen,
}: {
  locale: string;
  onLocale: (l: string) => void;
  onOpen: (id: string) => void;
}) {
  const intl = useIntl();
  return (
    <div>
      <h3>
        <FormattedMessage id="locale.ui.title" />
      </h3>
      <div className="picker-list">
        <button
          className={`picker-row${locale === 'en' ? ' current' : ''}`}
          onClick={() => onLocale('en')}
        >
          <span className="grow label">English</span>
          <span className="status-chip status-live">
            <FormattedMessage id="signpost.status.live" />
          </span>
        </button>
        <button
          className={`picker-row${locale === 'fi' ? ' current' : ''}`}
          onClick={() => onLocale('fi')}
        >
          <span className="grow label">Suomi</span>
          <span className="status-chip status-measured">
            <FormattedMessage id="locale.fi.draft" />
          </span>
        </button>
      </div>
      <p className="picker-note">
        <FormattedMessage id="locale.corpusNote" />
      </p>
      <h3 style={{ marginTop: 16 }}>
        <FormattedMessage id="locale.corpora.title" />
      </h3>
      <div className="picker-list">
        {corpora.map((c) => (
          <button key={c.id} className="picker-row" onClick={() => onOpen(c.id)}>
            <span className="grow label">
              <FormattedMessage id={c.labelKey} />
            </span>
            {c.tier && (
              <span className="badge tier">
                {intl.formatMessage({ id: `corpus.tier.${c.tier}` })}
              </span>
            )}
            <StatusChip status={c.status} kind="corpus" />
          </button>
        ))}
      </div>
      <p className="picker-note">
        <FormattedMessage id="sp.locale.fact1" />
      </p>
      <p className="picker-note">
        <FormattedMessage id="sp.locale.fact2" />
      </p>
    </div>
  );
}

export function SignpostPanel({
  id,
  onClose,
  locale,
  onLocale,
  onOpen,
}: {
  id: string;
  onClose: () => void;
  locale?: string;
  onLocale?: (l: string) => void;
  onOpen?: (id: string) => void;
}) {
  const intl = useIntl();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = panelRef.current;
    el?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  const open = onOpen ?? (() => undefined);
  let title: string;
  let body: React.ReactNode;
  if (id === 'jurisdiction-picker') {
    title = intl.formatMessage({ id: 'sp.jurisdictions.title' });
    body = <JurisdictionPickerBody onOpen={open} />;
  } else if (id === 'locale-picker') {
    title = intl.formatMessage({ id: 'locale.title' });
    body = (
      <LocalePickerBody
        locale={locale ?? 'en'}
        onLocale={onLocale ?? (() => undefined)}
        onOpen={open}
      />
    );
  } else {
    const sp = findSignpost(id);
    if (!sp) return null;
    title = intl.formatMessage({ id: sp.labelKey });
    body = <SignpostBody sp={sp} />;
  }

  return (
    <div
      className="signpost-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="signpost-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <button className="mode-tab" onClick={onClose} style={{ float: 'right' }}>
          <FormattedMessage id="signpost.close" />
        </button>
        <h2>{title}</h2>
        {body}
      </div>
    </div>
  );
}
