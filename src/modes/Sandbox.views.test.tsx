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
import type { AppState, View } from '../state/urlState';

function render(view: View, extra: Partial<AppState> = {}): string {
  // server rendering reads the store's initial snapshot, not its live one
  Object.assign(useApp.getInitialState(), {
    state: { ...DEFAULT_STATE, view, ...extra },
  });
  return renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      <Sandbox />
    </IntlProvider>,
  );
}

describe('Sandbox view wrappers', () => {
  it('profile view draws the scene SVG with its hull hint and sky', () => {
    const html = render('profile');
    expect(html).toContain('scene-svg');
    expect(html).toContain('id="hull-hint"');
    expect(html).toContain('id="sky"');
  });

  // one vessel, three views: every tab draws the same controls, and one that
  // does not apply there stays in place, disabled
  const CONTROLS = [
    'theta',
    'tilt',
    'hull-hint',
    'range',
    'sky',
    'mesh',
    'benchy',
  ];
  const disabled = (html: string, id: string) =>
    new RegExp(`id="${id}"[^>]*disabled=""`).test(html) ||
    new RegExp(`disabled=""[^>]*id="${id}"`).test(html);

  it('profile, bearing and arcs show the same control set', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'hidden', setItem: () => {} },
    });
    try {
      for (const v of ['profile', 'bearing', 'plan'] as const) {
        const html = render(v);
        for (const id of CONTROLS)
          expect(html, `${v} ${id}`).toContain(`id="${id}"`);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a control that does not apply to the view is disabled, not hidden', () => {
    const profile = render('profile');
    expect(disabled(profile, 'benchy')).toBe(true);
    expect(disabled(profile, 'tilt')).toBe(true);
    expect(disabled(profile, 'mesh')).toBe(false);
    expect(disabled(profile, 'range')).toBe(false);
    const bearing = render('bearing');
    for (const id of ['benchy', 'mesh', 'range', 'sky', 'hull-hint'])
      expect(disabled(bearing, id), id).toBe(false);
    expect(disabled(render('bearing', { benchy: true }), 'mesh')).toBe(true);
  });

  it('shows the bearing view beside the scene by default, and hides it on request', () => {
    const panel = (html: string) =>
      html.slice(html.indexOf('bearing-panel'), html.indexOf('arcs-panel'));
    for (const v of ['profile', 'bearing'] as const) {
      const html = panel(render(v));
      expect(html).toContain('<svg');
      expect(html).toContain('aria-expanded="true"');
    }
    const hidden = panel(render('profile', { bearingAside: false }));
    expect(hidden).not.toContain('<svg');
    expect(hidden).toContain('aria-expanded="false"');
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

  it('bearing view has a range control, 0.5 to 3 nm, opening at 0.5 nm', () => {
    const html = render('bearing');
    expect(html).toMatch(
      /id="range"[^>]*min="0.5"[^>]*max="3"[^>]*step="0.1"[^>]*value="0.5"/,
    );
    expect(html).toContain('0.5 nm');
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
