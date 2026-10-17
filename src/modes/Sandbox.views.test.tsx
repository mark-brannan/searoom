// Component tests for the Sandbox's views (the 3D model, and the arcs when
// they are a tab): each renders under the real IntlProvider. Server
// rendering, so no DOM library is needed; the 3D canvas draws client-side
// only, so for it we assert its controls render.
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

function withArcsHidden(fn: () => void) {
  vi.stubGlobal('window', {
    localStorage: { getItem: () => 'hidden', setItem: () => {} },
  });
  try {
    fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('Sandbox views', () => {
  const disabled = (html: string, id: string) =>
    new RegExp(`id="${id}"[^>]*disabled=""`).test(html) ||
    new RegExp(`disabled=""[^>]*id="${id}"`).test(html);

  it('opens on the 3D view, its camera tilt live', () => {
    expect(DEFAULT_STATE.view).toBe('model');
    const html = render(DEFAULT_STATE.view);
    expect(html).not.toContain('data-side=');
    expect(disabled(html, 'tilt')).toBe(false);
    expect(disabled(html, 'benchy')).toBe(false);
  });

  // one vessel, every tab draws the same controls, and one that does not
  // apply there stays in place, disabled
  const CONTROLS = ['theta', 'tilt', 'hull-hint', 'range', 'sky', 'mesh', 'benchy'];

  it('the 3D view and the arcs show the same control set', () => {
    withArcsHidden(() => {
      for (const v of ['model', 'plan'] as const) {
        const html = render(v);
        for (const id of CONTROLS)
          expect(html, `${v} ${id}`).toContain(`id="${id}"`);
      }
    });
  });

  it('a control that does not apply to the view is disabled, not hidden', () => {
    const model = render('model');
    for (const id of ['benchy', 'mesh', 'range', 'sky', 'hull-hint'])
      expect(disabled(model, id), id).toBe(false);
    expect(disabled(render('model', { benchy: true }), 'mesh')).toBe(true);
    withArcsHidden(() => {
      const plan = render('plan');
      for (const id of ['tilt', 'benchy', 'mesh', 'range', 'sky', 'hull-hint'])
        expect(disabled(plan, id), id).toBe(true);
    });
  });

  it('shows the lights-only view beside the scene by default, and hides it on request', () => {
    const panel = (html: string) =>
      html.slice(html.indexOf('bearing-panel'), html.indexOf('arcs-panel'));
    const shown = panel(render('model'));
    expect(shown).toContain('<svg');
    expect(shown).toContain('aria-expanded="true"');
    const hidden = panel(render('model', { bearingAside: false }));
    expect(hidden).not.toContain('<svg');
    expect(hidden).toContain('aria-expanded="false"');
  });

  it('a stale profile view still lands on the 3D view, never the side profile', () => {
    const html = render('profile');
    expect(html).not.toContain('data-side=');
    expect(disabled(html, 'tilt')).toBe(false);
  });

  it('with the arcs panel shown, a plan view shows the 3D view and the arcs beside it', () => {
    const html = render('plan');
    expect(html).not.toContain('data-side=');
    expect(disabled(html, 'tilt')).toBe(false);
    expect(html).toContain('plan-svg');
  });

  it('3D view has a range control, 0.5 to 3 nm, opening at 0.5 nm', () => {
    const html = render('model');
    expect(html).toMatch(
      /id="range"[^>]*min="0.5"[^>]*max="3"[^>]*step="0.1"[^>]*value="0.5"/,
    );
  });

  it('with the arcs beside it, the 3D view stands alone with no tab bar', () => {
    const html = render('model');
    expect(html).not.toContain('role="tablist"');
  });

  it('hiding the arcs panel brings the Arcs tab back beside the 3D view', () => {
    withArcsHidden(() => {
      const html = render('plan');
      expect(html.match(/role="tab"/g)).toHaveLength(2);
      expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
      expect(html).toContain('plan-svg');
    });
  });
});
