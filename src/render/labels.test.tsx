// A scene view (here, ProfileView) must render standalone, without an
// app IntlProvider around it — that's the point of the label interface.
// renderToStaticMarkup throws if a hook a component relies on (like
// react-intl's useIntl) has no provider in the tree, so a clean render
// is itself the assertion.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileView } from './ProfileView';
import { selectHull } from './hulls';
import { defaultSceneLabels } from './labels';
import type { FactRecord } from '../engine/types';

describe('ProfileView without IntlProvider', () => {
  it('renders using the default English labels', () => {
    const facts: FactRecord = {};
    const hull = selectHull(facts);
    const html = renderToStaticMarkup(
      <ProfileView hull={hull} placed={[]} facts={facts} />,
    );
    expect(html).toContain(defaultSceneLabels.profileAlt);
  });
});
