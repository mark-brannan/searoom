// Every scene view must render standalone, without an app IntlProvider
// around it — that's the point of the label interface.
// renderToStaticMarkup throws if a hook a component relies on (like
// react-intl's useIntl) has no provider in the tree, so a clean render
// is itself the assertion; the alt-text check proves the defaults landed.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BearingView } from './BearingView';
import { PlanView } from './PlanView';
import { ProfileView } from './ProfileView';
import { selectHull } from './hulls';
import { defaultSceneLabels } from './labels';
import type { FactRecord } from '../engine/types';

const facts: FactRecord = {};
const hull = selectHull(facts);
const noop = () => {};

const cases: [string, () => string, string][] = [
  [
    'ProfileView',
    () => renderToStaticMarkup(<ProfileView hull={hull} placed={[]} facts={facts} />),
    defaultSceneLabels.profileAlt,
  ],
  [
    'PlanView',
    () => renderToStaticMarkup(<PlanView hull={hull} placed={[]} theta={0} onTheta={noop} />),
    defaultSceneLabels.planAlt,
  ],
  [
    'BearingView',
    () =>
      renderToStaticMarkup(
        <BearingView hull={hull} placed={[]} theta={0} onTheta={noop} hullHint={false} />,
      ),
    defaultSceneLabels.bearingAlt(0),
  ],
];

// React escapes quotes in attributes (' -> &#x27;), so read the label back
// out of aria-label and unescape before comparing.
const ariaLabel = (html: string): string =>
  (/aria-label="([^"]*)"/.exec(html)?.[1] ?? '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

describe.each(cases)('%s without IntlProvider', (_name, render, expectedAlt) => {
  it('renders using the default English labels', () => {
    expect(ariaLabel(render())).toBe(expectedAlt);
  });
});
