import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Sheet } from './Sheet';
import { catalogs } from '../i18n';
import { boatSheet } from '../engine/myBoat';
import { DEFAULT_STATE } from '../state/urlState';

describe('cheat sheet', () => {
  it('draws every lawful display of each situation, in the bearing, profile and arcs views', () => {
    const out = renderToStaticMarkup(
      <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
        <Sheet />
      </IntlProvider>,
    );
    const want = boatSheet(
      DEFAULT_STATE.jurisdiction,
      DEFAULT_STATE.facts,
    ).reduce((n, r) => n + r.displays.length, 0);
    expect(want).toBeGreaterThan(0);
    expect(out.match(/data-testid="sheet-display"/g)?.length).toBe(want);
    expect(out.match(/<figure>/g)?.length).toBe(want * 6);
  });
});
