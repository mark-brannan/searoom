// Fixtures for the shared mode components: each renders from a real
// evaluation of a fixture fact record, the contract every mode feeds.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntlProvider } from 'react-intl';
import type { ReactNode } from 'react';
import { Scene } from './Scene';
import { DisplayChips } from './DisplayChips';
import { RulesPanel } from './RulesPanel';
import { DataDrawer } from './DataDrawer';
import { catalogs } from '../i18n';
import { evaluateDisplayIn } from '../engine/evaluate';
import { DEFAULT_STATE } from '../state/urlState';

const { facts, jurisdiction } = DEFAULT_STATE;
const evaln = evaluateDisplayIn(jurisdiction, facts);
const lights = evaln.displays[0]!.lights;
const html = (n: ReactNode) =>
  renderToStaticMarkup(
    <IntlProvider locale="en" messages={catalogs.en} defaultLocale="en">
      {n}
    </IntlProvider>,
  );

describe('mode components', () => {
  it('Scene draws the view tabs, or a tab-less mini card', () => {
    const settings = { view: 'profile' as const, theta: 45 };
    expect(
      html(<Scene facts={facts} lights={lights} settings={settings} />),
    ).toContain('view-tabs');
    const mini = html(
      <Scene
        facts={facts}
        lights={lights}
        settings={settings}
        presentation="mini"
      />,
    );
    expect(mini).toContain('scene-svg');
    expect(mini).not.toContain('view-tabs');
  });

  it('DisplayChips renders one chip per lawful display', () => {
    const out = html(
      <DisplayChips
        evaln={evaln}
        displayIndex={0}
        onDisplayIndex={() => {}}
        additionsOn={[]}
        onAdditionsOn={() => {}}
      />,
    );
    expect(out.match(/role="radio"/g)?.length).toBe(evaln.displays.length);
  });

  it('RulesPanel renders an entry per applied rule', () => {
    const out = html(<RulesPanel evaln={evaln} jurisdiction={jurisdiction} />);
    expect(out.match(/class="entry"/g)?.length).toBe(evaln.applied.length);
  });

  it('DataDrawer shows the fact record', () => {
    const out = html(
      <DataDrawer
        evaln={evaln}
        facts={facts}
        jurisdiction={jurisdiction}
        open
        onOpen={() => {}}
      />,
    );
    expect(out).toContain(
      JSON.stringify(facts, null, 1).replace(/"/g, '&quot;'),
    );
  });
});
