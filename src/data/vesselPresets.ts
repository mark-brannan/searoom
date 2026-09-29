// Common vessel types, so building "a 30 m trawler crossing a 12 m sloop"
// in Encounters mode is two clicks rather than typing every fact/kin field
// by hand (issue #95 item 3). No vessel-preset picker existed anywhere in
// this app before this file — Sandbox's FactControls builds a fact record
// field-by-field too, and could reuse this list, but only Encounters is
// required to.

import type { FactRecord } from '../engine/types';

export interface VesselPreset {
  id: string;
  /** i18n message id for the picker label. */
  labelId: string;
  fact: FactRecord;
  /** `kin:dynamics` value, applied alongside `fact` when a preset is
   * chosen — kinematics is its own fact class (ADR 0005 §2), not part of
   * the fact record, but a preset is meaningless without it. */
  dynamics: string;
}

export const VESSEL_PRESETS: VesselPreset[] = [
  {
    id: 'sloop',
    labelId: 'vesselPreset.sloop',
    fact: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 12,
    },
    dynamics: 'dynamics:yacht',
  },
  {
    id: 'trawler',
    labelId: 'vesselPreset.trawler',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:trawling',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 30,
    },
    dynamics: 'dynamics:fishing',
  },
  {
    id: 'cargo',
    labelId: 'vesselPreset.cargo',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 180,
    },
    dynamics: 'dynamics:cargo',
  },
  {
    id: 'tanker',
    labelId: 'vesselPreset.tanker',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 250,
    },
    dynamics: 'dynamics:tanker',
  },
  {
    id: 'ferry',
    labelId: 'vesselPreset.ferry',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 90,
    },
    dynamics: 'dynamics:ferry',
  },
  {
    id: 'rib',
    labelId: 'vesselPreset.rib',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 7,
      'fact:non_displacement': true,
    },
    dynamics: 'dynamics:rib',
  },
  {
    id: 'pilotVessel',
    labelId: 'vesselPreset.pilotVessel',
    fact: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:pilot',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 20,
    },
    dynamics: 'dynamics:unknown',
  },
  {
    id: 'anchoredYacht',
    labelId: 'vesselPreset.anchoredYacht',
    fact: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:near_channel': false,
      'fact:length_m': 12,
    },
    dynamics: 'dynamics:yacht',
  },
];
