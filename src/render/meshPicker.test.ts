import { describe, expect, it } from 'vitest';
import { allHulls, meshCatalog, selectHull } from 'nav-wright';
import type { Hull, MeshRecord } from 'nav-wright';
import type { FactRecord } from '../engine/types';
import { rankMeshes, sceneOf } from './meshPicker';
import { HULL_SCENES } from './hullScenes';

const rec = (file: string, over: Partial<MeshRecord>): MeshRecord =>
  ({
    file,
    name: file,
    kind: 'loft',
    fidelity: 'typical',
    propulsion: ['power'],
    shows: [],
    loaM: 10,
    fitLengthM: [5, 20],
    ...over,
  }) as MeshRecord;

const CATALOG: MeshRecord[] = [
  rec('benchy.glb', { kind: 'calibration', fidelity: 'calibration', loaM: null, fitLengthM: null }),
  rec('sloop-traced.glb', { kind: 'traced', fidelity: 'traced', propulsion: ['sail', 'power'], loaM: 10, fitLengthM: [8, 12] }),
  rec('sloop-kit.glb', { kind: 'kit', fidelity: 'stylised', propulsion: ['sail'], loaM: 6, fitLengthM: [4, 9] }),
  rec('sloop-loft.glb', { propulsion: ['sail', 'power'], loaM: 12, fitLengthM: [5, 20] }),
  rec('ship-loft.glb', { propulsion: ['sail'], loaM: 60, fitLengthM: [40, 120] }),
  rec('launch-loft.glb', { loaM: 12, fitLengthM: [7, 20] }),
  rec('tug-kit.glb', { kind: 'kit', fidelity: 'stylised', shows: ['towing-gear'], loaM: 14, fitLengthM: [10, 21] }),
  rec('rowboat-kit.glb', { kind: 'kit', fidelity: 'stylised', propulsion: ['oars'], loaM: 3, fitLengthM: [2, 4.5] }),
  rec('barge-loft.glb', { propulsion: ['none'], loaM: 40, fitLengthM: [20, 80] }),
];

const facts = (over: Record<string, unknown>): FactRecord =>
  ({
    'fact:propulsion': 'propulsion:power',
    'fact:activity': 'activity:none',
    'fact:length_m': 10,
    ...over,
  }) as FactRecord;

const files = (f: FactRecord) =>
  rankMeshes(CATALOG, sceneOf(f)).map((m) => m.record.file);

describe('rankMeshes', () => {
  it('gives a sailing vessel only meshes that can sail, traced first', () => {
    // 10 m: the kit sloop's band ends at 9 m, so she follows the fitting two
    expect(files(facts({ 'fact:propulsion': 'propulsion:sail' }))).toEqual([
      'sloop-traced.glb',
      'sloop-loft.glb',
      'ship-loft.glb',
      'sloop-kit.glb',
    ]);
    expect(files(facts({ 'fact:propulsion': 'propulsion:sail', 'fact:length_m': 8.5 }))).toEqual([
      'sloop-traced.glb',
      'sloop-loft.glb',
      'sloop-kit.glb',
      'ship-loft.glb',
    ]);
  });

  it('gives an oared vessel the oared mesh, and a power-driven one a motor hull first', () => {
    expect(files(facts({ 'fact:propulsion': 'propulsion:oars', 'fact:length_m': 3 }))).toEqual([
      'rowboat-kit.glb',
    ]);
    // the traced sloop has an engine too, so she is offered, but after the
    // motor hulls that fit
    expect(files(facts({}))).toEqual([
      'launch-loft.glb',
      'tug-kit.glb',
      'sloop-traced.glb',
      'sloop-loft.glb',
    ]);
  });

  it('prefers a mesh that shows the activity, without requiring it', () => {
    const towing = files(facts({ 'fact:activity': 'activity:towing', 'fact:length_m': 14 }));
    expect(towing[0]).toBe('tug-kit.glb');
    expect(towing).toContain('launch-loft.glb');
  });

  it('puts the length band first, and still offers what is outside it', () => {
    const ranked = rankMeshes(CATALOG, sceneOf(facts({ 'fact:propulsion': 'propulsion:sail', 'fact:length_m': 60 })));
    expect(ranked.map((m) => [m.record.file, m.fits])).toEqual([
      ['ship-loft.glb', true],
      ['sloop-traced.glb', false],
      ['sloop-loft.glb', false],
      ['sloop-kit.glb', false],
    ]);
    // nothing fits a 1 m sailing vessel, and nothing is dropped for it
    expect(files(facts({ 'fact:propulsion': 'propulsion:sail', 'fact:length_m': 1 }))).toHaveLength(4);
  });

  it('draws the class from the meshes that tie the best on length, activity and propulsion', () => {
    const ranked = rankMeshes(CATALOG, sceneOf(facts({ 'fact:length_m': 12 })));
    expect(ranked.filter((m) => m.inClass).map((m) => m.record.file)).toEqual([
      'launch-loft.glb',
      'tug-kit.glb',
    ]);
    const towing = rankMeshes(CATALOG, sceneOf(facts({ 'fact:activity': 'activity:towing', 'fact:length_m': 12 })));
    expect(towing.filter((m) => m.inClass).map((m) => m.record.file)).toEqual(['tug-kit.glb']);
  });

  it('puts a loft before its variants when all else ties', () => {
    const lofts = [
      rec('loft-tug-highside.glb', {}),
      rec('loft-tug.glb', {}),
      rec('loft-tug-slender.glb', {}),
    ];
    expect(rankMeshes(lofts, sceneOf(facts({}))).map((m) => m.record.file)).toEqual([
      'loft-tug.glb',
      'loft-tug-highside.glb',
      'loft-tug-slender.glb',
    ]);
  });

  it('lets a tow take an unpowered hull, and leads with it', () => {
    expect(files(facts({ 'fact:activity': 'activity:being_towed', 'fact:length_m': 40 }))[0]).toBe(
      'barge-loft.glb',
    );
    expect(files(facts({ 'fact:length_m': 40 }))).not.toContain('barge-loft.glb');
  });

  it('never leaves a scene with nothing, and never offers the calibration mesh', () => {
    const only = [CATALOG[0], CATALOG[8]];
    expect(rankMeshes(only, sceneOf(facts({}))).map((m) => m.record.file)).toEqual(['barge-loft.glb']);
    for (const p of ['sail', 'oars', 'power'])
      expect(files(facts({ 'fact:propulsion': `propulsion:${p}` }))).not.toContain('benchy.glb');
  });
});

describe('HULL_SCENES', () => {
  it('names a scene selectHull picks each hull for, for every hull it can pick', () => {
    for (const [id, f] of Object.entries(HULL_SCENES))
      expect(selectHull(f).spec.id, id).toBe(id);
    const unreachable = (Object.values(allHulls) as Hull[])
      .map((h) => h.spec.id)
      .filter((id) => !(id in HULL_SCENES));
    expect(unreachable.sort()).toEqual(['cruise-ship', 'warship']);
  });

  it('gives every hull scene at least one fitting mesh from the real catalog', () => {
    for (const [id, f] of Object.entries(HULL_SCENES))
      expect(rankMeshes(meshCatalog, sceneOf(f))[0].fits, id).toBe(true);
  });
});
