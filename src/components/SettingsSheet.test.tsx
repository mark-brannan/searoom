// The settings sheet (#105) holds the jurisdiction picker (#127): jurisdictions
// colregs ships are selectable; signposted ones are listed too, and picking
// one opens its panel rather than selecting a jurisdiction with no data. The
// header keeps only the mark, the tabs and the settings button.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { SettingsSheet, pickJurisdiction } from './SettingsSheet';
import { Header } from './Header';
import { catalogs } from '../i18n';
import { JURISDICTIONS } from '../data/jurisdictions';
import { jurisdictions as signposted } from '../data/signposts';

const pending = signposted.filter((s) => s.status !== 'live');
const en = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      {node}
    </IntlProvider>,
  );

describe('settings sheet', () => {
  const html = en(<SettingsSheet onClose={() => undefined} />);

  it('lists every non-live signposted jurisdiction under its own group', () => {
    expect(pending.length).toBeGreaterThan(0);
    expect(html).toContain(
      `<optgroup label="${catalogs.en['jurisdiction.signposted']}"`,
    );
    for (const s of pending) expect(html).toContain(`value="sp:${s.id}"`);
    for (const j of JURISDICTIONS) expect(html).toContain(`value="${j.id}"`);
  });

  it('offers all six preferences', () => {
    for (const k of [
      'settings.language',
      'settings.corpus',
      'settings.jurisdiction',
      'settings.dayNight',
      'settings.presentation',
      'settings.motion',
    ])
      expect(html).toContain(catalogs.en[k]);
  });

  it('a signposted pick opens its panel and leaves the jurisdiction alone', () => {
    for (const s of pending)
      expect(pickJurisdiction(`sp:${s.id}`)).toEqual({ signpost: s.id });
  });

  it('a shipped pick selects the jurisdiction', () => {
    for (const j of JURISDICTIONS)
      expect(pickJurisdiction(j.id)).toEqual({ jurisdiction: j.id });
  });
});

describe('header', () => {
  it('is the mark, the tabs and the settings button only', () => {
    const html = en(<Header onSettings={() => undefined} />);
    expect(html).not.toContain('<select');
    expect(html).toContain('class="mode-nav"');
    expect(html).toContain(`aria-label="${catalogs.en['settings.open']}"`);
  });
});
