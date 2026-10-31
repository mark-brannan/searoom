// The presets gallery and the fact record's progressive disclosure (#103).
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import type { ReactNode } from 'react';
import { PresetThumb } from './PresetThumb';
import { Presets } from './Presets';
import { FactControls } from './FactControls';
import { catalogs } from '../i18n';
import { PRESETS } from '../data/presets';
import { evaluateDisplayIn } from '../engine/evaluate';
import { selectHull } from 'nav-wright';
import { placeLights } from '../render/navWright';
import { lights } from '../data/colregs';

const html = (n: ReactNode) =>
  renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      {n}
    </IntlProvider>,
  );

// each Glow has one white core; the hull drawings use no pure white
const glows = (markup: string) =>
  (markup.match(/fill="#ffffff" opacity="0.85"/g) ?? []).length;

describe('presets gallery', () => {
  for (const p of PRESETS) {
    it(`${p.id}: the thumbnail carries every light of her first display`, () => {
      const display = evaluateDisplayIn('intl', p.facts).displays[0]!;
      const placed = placeLights(
        display.lights,
        selectHull(p.facts).spec,
        p.facts,
        lights,
      );
      const markup = html(<PresetThumb facts={p.facts} jurisdiction="intl" />);
      expect(markup).toContain('preset-thumb');
      expect(placed.length).toBeGreaterThan(0);
      expect(glows(markup)).toBe(placed.length);
    });
  }

  it('every preset is a card with its thumbnail and name', () => {
    const markup = html(<Presets />);
    expect(markup.match(/class="preset-card/g)).toHaveLength(PRESETS.length);
    expect(markup).toContain('12 m sloop');
  });
});

describe('fact controls', () => {
  it('hides the rarer activities under "More activities"', () => {
    const markup = html(<FactControls />);
    expect(markup).toContain('More activities');
    expect(markup).toMatch(/<details class="more-activities"(?![^>]*open)/);
  });

  it('carries no jurisdiction or day/night row: those are settings', () => {
    const markup = html(<FactControls />);
    expect(markup).not.toContain('name="daynight"');
    expect(markup).not.toContain('Jurisdiction');
  });
});
