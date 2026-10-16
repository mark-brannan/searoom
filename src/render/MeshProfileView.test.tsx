import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { selectHull } from 'nav-wright';
import type { FactRecord } from '../engine/types';
import { evaluateDisplayIn } from '../engine/evaluate';
import { lights as lightCatalog } from '../data/colregs';
import { placeLights } from './navWright';
import { MeshProfileView } from './MeshProfileView';

const facts: FactRecord = {
  'fact:propulsion': 'propulsion:power',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 60,
};

function render(): string {
  const hull = selectHull(facts);
  const display = evaluateDisplayIn('intl', facts).displays[0];
  const placed = placeLights(display.lights, hull.spec, facts, lightCatalog);
  return renderToString(
    createElement(MeshProfileView, {
      modelUrl: '/models/none.glb',
      hull,
      placed,
      facts,
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('MeshProfileView render branches', () => {
  it('draws the hand-drawn profile before any mesh has loaded', () => {
    expect(render()).not.toContain('data-profile-source="mesh"');
  });

  it('draws the hand-drawn profile under ?profile=svg', () => {
    vi.stubGlobal('location', { search: '?profile=svg' });
    expect(render()).not.toContain('data-profile-source="mesh"');
  });
});
