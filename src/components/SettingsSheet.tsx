// The settings sheet (#105): the learner's preferences in one place, out of
// the header and the fact record. Language, corpus and jurisdiction are app
// state (the URL carries them, so a shared link wins); day/night, presentation
// and motion live only in settings.ts. Each picker keeps its signpost panel
// one tap away, opened over the sheet.

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useApp } from '../state/store';
import type { Patch } from '../state/store';
import { JURISDICTIONS } from '../data/jurisdictions';
import { jurisdictions as signposted } from '../data/signposts';
import { CorpusSwitcher } from './CorpusSwitcher';
import { catalogs } from '../i18n';
import {
  DAY_NIGHT,
  MOTION_PREFS,
  PRESENTATIONS,
  saveSettings,
  useSettings,
} from '../state/settings';

const SIGNPOST_PREFIX = 'sp:';

/**
 * What picking a jurisdiction row does. A signposted row has no data to
 * select, so it opens that jurisdiction's signpost panel instead; the
 * controlled select keeps showing the jurisdiction in view.
 */
export function pickJurisdiction(value: string): Patch {
  return value.startsWith(SIGNPOST_PREFIX)
    ? { signpost: value.slice(SIGNPOST_PREFIX.length) }
    : { jurisdiction: value };
}

function Segmented<T extends string>({
  name,
  labelId,
  values,
  value,
  onPick,
  labelFor,
}: {
  name: string;
  labelId: string;
  values: readonly T[];
  value: T;
  onPick: (v: T) => void;
  labelFor: (v: T) => string;
}) {
  const intl = useIntl();
  return (
    <div
      className="segmented"
      role="radiogroup"
      aria-label={intl.formatMessage({ id: labelId })}
    >
      {values.map((v) => (
        <label key={v}>
          <input
            type="radio"
            name={name}
            checked={v === value}
            onChange={() => onPick(v)}
          />
          <FormattedMessage id={labelFor(v)} />
        </label>
      ))}
    </div>
  );
}

function Section({
  titleId,
  children,
}: {
  titleId: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <h3>
        <FormattedMessage id={titleId} />
      </h3>
      {children}
    </section>
  );
}

function MoreRow({ labelId, onOpen }: { labelId: string; onOpen: () => void }) {
  return (
    <button type="button" className="settings-more" onClick={onOpen}>
      <FormattedMessage id={labelId} />
      <span aria-hidden="true"> ›</span>
    </button>
  );
}

export function SettingsSheet({
  onClose,
  covered = false,
}: {
  onClose: () => void;
  /** a signpost panel sits over the sheet: Escape is that panel's */
  covered?: boolean;
}) {
  const state = useApp((s) => s.state);
  const patch = useApp((s) => s.patch);
  const prefs = useSettings();
  const intl = useIntl();
  const ref = useRef<HTMLDivElement>(null);

  // focus the sheet on open and again when a panel over it closes
  useEffect(() => {
    if (!covered) ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, [covered]);
  useEffect(() => {
    if (covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covered, onClose]);

  const title = intl.formatMessage({ id: 'settings.title' });
  return (
    <div
      className="signpost-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="signpost-panel settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <button
          className="mode-tab"
          onClick={onClose}
          style={{ float: 'right' }}
        >
          <FormattedMessage id="signpost.close" />
        </button>
        <h2>{title}</h2>
        <p className="picker-note settings-saved">
          <FormattedMessage id="settings.saved" />
        </p>

        <Section titleId="settings.language">
          <div className="picker-list">
            {Object.keys(catalogs).map((id) => (
              <button
                key={id}
                className={`picker-row${state.locale === id ? ' current' : ''}`}
                aria-pressed={state.locale === id}
                lang={id}
                onClick={() => patch({ locale: id })}
              >
                <span className="grow label">
                  <FormattedMessage id={`locale.${id}`} />
                </span>
              </button>
            ))}
          </div>
          <MoreRow
            labelId="settings.language.more"
            onOpen={() => patch({ signpost: 'locale-picker' })}
          />
        </Section>

        <Section titleId="settings.jurisdiction">
          <label className="settings-select">
            <span className="sr-only">
              <FormattedMessage id="jurisdiction.label" />
            </span>
            <select
              value={state.jurisdiction}
              onChange={(e) => patch(pickJurisdiction(e.target.value))}
              aria-label={intl.formatMessage({ id: 'jurisdiction.label' })}
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {intl.formatMessage({ id: j.labelKey, defaultMessage: j.id })}
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
          <MoreRow
            labelId="settings.jurisdiction.more"
            onOpen={() => patch({ signpost: 'jurisdiction-picker' })}
          />
        </Section>

        <Section titleId="settings.dayNight">
          <Segmented
            name="settings-daynight"
            labelId="settings.dayNight"
            values={DAY_NIGHT}
            value={prefs.dayNight ?? 'night'}
            onPick={(dayNight) => saveSettings({ dayNight })}
            labelFor={(v) => `settings.${v}`}
          />
          <p className="picker-note">
            <FormattedMessage id="settings.dayNight.note" />
          </p>
          <MoreRow
            labelId="settings.dayNight.more"
            onOpen={() => patch({ signpost: 'day-shapes' })}
          />
        </Section>

        <Section titleId="settings.presentation">
          <Segmented
            name="settings-presentation"
            labelId="settings.presentation"
            values={PRESENTATIONS}
            value={prefs.presentation ?? 'seascape'}
            onPick={(presentation) => saveSettings({ presentation })}
            labelFor={(v) => `settings.presentation.${v}`}
          />
          <p className="picker-note">
            <FormattedMessage id="settings.presentation.note" />
          </p>
        </Section>

        <Section titleId="settings.motion">
          <Segmented
            name="settings-motion"
            labelId="settings.motion"
            values={MOTION_PREFS}
            value={prefs.motion ?? 'system'}
            onPick={(motion) => saveSettings({ motion })}
            labelFor={(v) => `settings.motion.${v}`}
          />
        </Section>
        <Section titleId="settings.corpus">
          <CorpusSwitcher
            corpusId={state.corpus}
            jurisdiction={state.jurisdiction}
            onPick={(corpus) => patch({ corpus })}
          />
        </Section>
      </div>
    </div>
  );
}
