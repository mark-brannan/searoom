// Component tests for the Sandbox's three view wrappers (profile, bearing,
// plan): each renders under the real IntlProvider and its mount point is
// present. Server rendering, so no DOM library is needed; the 3D bearing
// canvas draws client-side only, so for it we assert its controls render.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { Sandbox } from './Sandbox';
import { catalogs } from '../i18n';
import { DEFAULT_STATE } from '../state/urlState';
import { useApp } from '../state/store';
import type { View } from '../state/urlState';

function render(view: View): string {
  // server rendering reads the store's initial snapshot, not its live one
  Object.assign(useApp.getInitialState(), {
    state: { ...DEFAULT_STATE, view },
  });
  return renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      <Sandbox />
    </IntlProvider>,
  );
}

describe('Sandbox view wrappers', () => {
  it('profile view draws the scene SVG with its hull hint and sky, no mesh', () => {
    const html = render('profile');
    expect(html).toContain('scene-svg');
    expect(html).toContain('id="hull-hint"');
    expect(html).toContain('id="sky"');
    expect(html).not.toContain('id="benchy"');
  });

  it('with the arcs panel shown, a plan view shows the profile and the arcs beside it', () => {
    const html = render('plan');
    expect(html).toContain('data-side="starboard"');
    expect(html).toContain('plan-svg');
  });

  it('bearing view renders its hull hint, sky and mesh controls', () => {
    const html = render('bearing');
    expect(html).toContain('id="hull-hint"');
    expect(html).toContain('id="sky"');
    expect(html).toContain('id="benchy"');
  });

  it('the arcs leave the tabs while the arcs panel is shown', () => {
    for (const v of ['profile', 'bearing'] as const) {
      const html = render(v);
      expect(html.match(/role="tab"/g)).toHaveLength(2);
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    }
  });

  it('hiding the arcs panel brings the Arcs tab back', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'hidden', setItem: () => {} },
    });
    try {
      const html = render('plan');
      expect(html.match(/role="tab"/g)).toHaveLength(3);
      expect(html).not.toContain('data-side=');
      expect(html).toContain('plan-svg');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
