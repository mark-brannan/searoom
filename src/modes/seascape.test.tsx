// The night sea (#93): Identify's field shows the bearing view's seascape,
// the quiz's reverse cards stay lights only, and range fades the hull hint
// from full at 0.5 nm to gone at 3 nm.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { bearingHullOpacity } from 'nav-wright/benchy';
import { SeenField } from './Identify';
import { MiniBearing } from './Quiz';
import { evaluateDisplayIn } from '../engine/evaluate';
import { DEFAULT_STATE, RANGE_MAX_NM, RANGE_MIN_NM } from '../state/urlState';

describe('seascape', () => {
  it("Identify's field draws the sea and the horizon under the picked lights", () => {
    const html = renderToStaticMarkup(
      <SeenField
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
      <SeenField seen={seen} arrangement="vertical" />,
    );
    const horizon = Number(
      /class="bearing-horizon"[^>]*y1="([\d.]+)"/.exec(html)![1],
    );
    const ys = [...html.matchAll(/cy="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(ys).toHaveLength(8 * 4);
    for (const y of ys) expect(y).toBeLessThan(horizon);
  });

  it('a quiz reverse card stays lights only: no sea, no horizon', () => {
    const { facts, jurisdiction } = DEFAULT_STATE;
    const display = evaluateDisplayIn(jurisdiction, facts).displays[0]!;
    const html = renderToStaticMarkup(
      <MiniBearing facts={facts} display={display} theta={0} />,
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
