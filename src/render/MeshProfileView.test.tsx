import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { BoxGeometry, Group, Mesh } from 'three';
import { renderToString } from 'react-dom/server';
import { selectHull } from 'nav-wright';
import type { FactRecord } from '../engine/types';
import { evaluateDisplayIn } from '../engine/evaluate';
import { lights as lightCatalog } from '../data/colregs';
import { placeLights } from './navWright';
import { MeshProfileView } from './MeshProfileView';
import * as react from 'react';
import { GLTFLoader } from 'three-stdlib';
import * as annexISeats from './annexISeats';

// renderToString runs no effects and keeps no state past the first pass, so
// the tests that need a loaded (or failed) mesh drive useState/useEffect
// through passthrough spies; every other test sees the real hooks.
vi.mock('react', async (orig) => {
  const actual = await orig<typeof import('react')>();
  return {
    ...actual,
    useState: vi.fn(actual.useState),
    useEffect: vi.fn(actual.useEffect),
  };
});
vi.mock('three-stdlib', async (orig) => {
  const actual = await orig<typeof import('three-stdlib')>();
  return { ...actual, GLTFLoader: vi.fn(actual.GLTFLoader) };
});
vi.mock('./annexISeats', async (orig) => {
  const actual = await orig<typeof import('./annexISeats')>();
  return { ...actual, meshOnlyBreaches: vi.fn(actual.meshOnlyBreaches) };
});

const facts: FactRecord = {
  'fact:propulsion': 'propulsion:power',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 60,
};

function render(modelUrl = '/models/none.glb'): string {
  const hull = selectHull(facts);
  const display = evaluateDisplayIn('intl', facts).displays[0];
  const placed = placeLights(display.lights, hull.spec, facts, lightCatalog);
  return renderToString(
    createElement(MeshProfileView, {
      modelUrl,
      hull,
      placed,
      facts,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(react.useState).mockReset();
  vi.mocked(react.useEffect).mockReset();
  vi.mocked(GLTFLoader).mockReset();
  vi.mocked(annexISeats.meshOnlyBreaches).mockReset();
});

describe('MeshProfileView render branches', () => {
  it('draws the hand-drawn profile before any mesh has loaded', () => {
    expect(render()).not.toContain('data-profile-source="mesh"');
  });

  it('draws the hand-drawn profile under ?profile=svg', () => {
    vi.stubGlobal('location', { search: '?profile=svg' });
    expect(render()).not.toContain('data-profile-source="mesh"');
  });

  // A bare hull-sized box: enough mesh for the real profile and outline.
  function boxScene(): Group {
    const g = new Group();
    g.add(new Mesh(new BoxGeometry(1, 0.3, 0.2)));
    return g;
  }

  // Run effects at once (renderToString never does) and serve `state` from
  // the first useState, the `loaded` slot.
  function drive(state: unknown): ReturnType<typeof vi.fn> {
    const setLoaded = vi.fn();
    vi.mocked(react.useState).mockImplementationOnce((() => [
      state,
      setLoaded,
    ]) as never);
    vi.mocked(react.useEffect).mockImplementation((fn) => {
      fn();
    });
    return setLoaded;
  }

  it('clears the loaded mesh when the load fails', async () => {
    vi.mocked(GLTFLoader).mockImplementation(function () {
      return { loadAsync: () => Promise.reject(new Error('404')) };
    } as never);
    // Start from a loaded mesh so the clear is something the test observes;
    // the cleared (null) state then draws the hand-drawn profile, which the
    // first test in this block already covers.
    const setLoaded = drive({ url: '/models/gone.glb', scene: boxScene() });
    render('/models/gone.glb');
    await vi.waitFor(() => expect(setLoaded).toHaveBeenCalledTimes(1));
    expect(setLoaded).toHaveBeenCalledWith(null);
  });

  it('draws the mesh profile when its seats are lawful', () => {
    vi.mocked(annexISeats.meshOnlyBreaches).mockReturnValue([]);
    drive({ url: '/models/boat.glb', scene: boxScene() });
    expect(render('/models/boat.glb')).toContain('data-profile-source="mesh"');
  });

  it('draws the hand-drawn profile when the mesh seats break Annex I', () => {
    vi.mocked(annexISeats.meshOnlyBreaches).mockReturnValue([
      { cite: 'AnxI.3(a)', rule: 'stem', what: 'masthead abaft amidships' },
    ]);
    drive({ url: '/models/boat.glb', scene: boxScene() });
    expect(render('/models/boat.glb')).not.toContain(
      'data-profile-source="mesh"',
    );
  });
});
