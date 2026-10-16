// The jurisdiction picker (#127): jurisdictions colregs ships are selectable;
// signposted ones are listed too, and picking one opens its panel rather than
// selecting a jurisdiction with no data.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Header, pickJurisdiction } from './Header';
import { catalogs } from '../i18n';
import { DEFAULT_STATE } from '../state/urlState';
import { JURISDICTIONS } from '../data/jurisdictions';
import { jurisdictions as signposted } from '../data/signposts';

const pending = signposted.filter((s) => s.status !== 'live');

describe('jurisdiction picker', () => {
  it('lists every non-live signposted jurisdiction under its own group', () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
        <Header state={DEFAULT_STATE} patch={() => {}} setMode={() => {}} />
      </IntlProvider>,
    );
    expect(pending.length).toBeGreaterThan(0);
    expect(html).toContain(
      `<optgroup label="${catalogs.en['jurisdiction.signposted']}"`,
    );
    for (const s of pending) expect(html).toContain(`value="sp:${s.id}"`);
    for (const j of JURISDICTIONS) expect(html).toContain(`value="${j.id}"`);
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
