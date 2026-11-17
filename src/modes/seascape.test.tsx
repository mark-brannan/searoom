// The night sea (#93): Identify's field shows the bearing view's seascape,
// the quiz's reverse cards stay lights only, and range fades the hull hint
// from full at 0.5 nm to gone at 3 nm. The Sandbox's 3D view opens on the
// night sea; its lights-only toggle takes the sea, sky and hull away.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import { seaColor } from 'nav-wright';
import { bearingHullOpacity } from 'nav-wright/benchy';
import { Scene } from '../components/Scene';
import { evaluateDisplayIn } from '../engine/evaluate';
import { catalogs } from '../i18n';
import { SEASCAPE_SEA } from '../render/Seascape';
import { DEFAULT_STATE, RANGE_MAX_NM, RANGE_MIN_NM } from '../state/urlState';
import type { SandboxView } from '../state/urlState';

// what the Sandbox's scene hands the 3D view, which draws client-side only
const bearingProps = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock('nav-wright/benchy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('nav-wright/benchy')>()),
  BearingModelView: (props: Record<string, unknown>) => {
    bearingProps.push(props);
    return null;
  },
}));

function sandboxScene(extra: Partial<SandboxView> = {}) {
  bearingProps.length = 0;
  const { facts, jurisdiction } = DEFAULT_STATE;
  const display = evaluateDisplayIn(jurisdiction, facts).displays[0]!;
  renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      <Scene
        facts={facts}
        lights={display.lights}
        settings={{ ...DEFAULT_STATE.sandbox, ...extra }}
      />
    </IntlProvider>,
  );
  expect(bearingProps).toHaveLength(1);
  return bearingProps[0]!;
}

describe('seascape', () => {
  it("Identify's field draws the sea and the horizon under the picked lights", () => {
    const html = renderToStaticMarkup(
      <Scene
        presentation="seen"
        seen={[
          { color: 'white', flashing: false },
          { color: 'red', flashing: false },
        ]}
        arrangement="free"
      />,
    );
    expect(html).toContain('bearing-sea');
    expect(html).toContain('bearing-horizon');
  });

  it('a vertical line of lights stays above the horizon however many are picked', () => {
    const seen = Array.from({ length: 8 }, () => ({
      color: 'white' as const,
      flashing: false,
    }));
    const html = renderToStaticMarkup(
      <Scene presentation="seen" seen={seen} arrangement="vertical" />,
    );
    const horizon = Number(
      /class="bearing-horizon"[^>]*y1="([\d.]+)"/.exec(html)![1],
    );
    const ys = [...html.matchAll(/cy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(ys).toHaveLength(8 * 4);
    for (const y of ys) expect(y).toBeLessThan(horizon);
  });

  it("the Sandbox's 3D view opens on the night sea, the sloop hinted", () => {
    const p = sandboxScene();
    expect(p.sea).toBe(SEASCAPE_SEA);
    expect(p.hullHint).toBeGreaterThan(0);
    expect(p.range).toBe(RANGE_MIN_NM);
  });

  it('lights only draws her lights on black: no sea, no sky, no hull', () => {
    const p = sandboxScene({ lightsOnly: true, sky: 40, hullHint: 80 });
    expect(p.sea).toBe(0);
    expect(p.sky).toBe(0);
    expect(p.hullHint).toBe(0);
  });

  it('a quiz reverse card stays lights only: no sea, no horizon', () => {
    const { facts, jurisdiction } = DEFAULT_STATE;
    const display = evaluateDisplayIn(jurisdiction, facts).displays[0]!;
    const html = renderToStaticMarkup(
      <Scene
        presentation="mini"
        facts={facts}
        lights={display.lights}
        settings={{ view: 'model', theta: 0 }}
      />,
    );
    expect(html).toContain('scene-svg-black');
    expect(html).not.toContain('bearing-sea');
    expect(html).not.toContain('bearing-horizon');
  });

  it('the hull hint shows at the near end of the range and is gone at the far end', () => {
    const hint = DEFAULT_STATE.sandbox.hullHint / 100;
    expect(bearingHullOpacity(hint, RANGE_MIN_NM)).toBeGreaterThan(0);
    expect(bearingHullOpacity(hint, DEFAULT_STATE.sandbox.range)).toBeGreaterThan(0);
    expect(bearingHullOpacity(hint, RANGE_MAX_NM)).toBe(0);
  });
});
