// Component tests for the Sandbox's three view wrappers (profile, bearing,
// plan): each renders under the real IntlProvider and its mount point is
// present. Server rendering, so no DOM library is needed; the 3D bearing
// canvas draws client-side only, so for it we assert its controls render.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Sandbox } from './Sandbox';
import { catalogs } from '../i18n';
import { DEFAULT_STATE } from '../state/urlState';
import type { View } from '../state/urlState';

function render(view: View): string {
  return renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      <Sandbox state={{ ...DEFAULT_STATE, view }} patch={() => {}} />
    </IntlProvider>,
  );
}

describe('Sandbox view wrappers', () => {
  it('profile view draws the scene SVG', () => {
    const html = render('profile');
    expect(html).toContain('scene-svg');
    expect(html).not.toContain('id="hull-hint"');
  });

  it('plan view draws the scene SVG without the bearing controls', () => {
    const html = render('plan');
    expect(html).toContain('<svg');
    expect(html).not.toContain('id="hull-hint"');
  });

  it('bearing view renders its hull hint, sky and mesh controls', () => {
    const html = render('bearing');
    expect(html).toContain('id="hull-hint"');
    expect(html).toContain('id="sky"');
    expect(html).toContain('id="benchy"');
  });

  it('all three tabs are present and the selected one is marked', () => {
    for (const v of ['profile', 'bearing', 'plan'] as const) {
      const html = render(v);
      expect(html.match(/role="tab"/g)).toHaveLength(3);
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    }
  });
});
