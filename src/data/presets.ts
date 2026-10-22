// Sandbox presets: a named vessel is a fact record, nothing more. Picking one
// loads the same state a shared URL would, so no new state shape exists.

import type { FactRecord } from '../engine/types';

export interface Preset {
  /** i18n key suffix: `preset.<id>` */
  id: string;
  facts: FactRecord;
}

export const PRESETS: Preset[] = [
  {
    id: 'sloop',
    facts: {
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 12,
    },
  },
  {
    id: 'trawler',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:trawling',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 30,
    },
  },
  {
    id: 'ship',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 55,
    },
  },
  {
    id: 'tug',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:towing',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 30,
      'fact:tow_length_m': 150,
    },
  },
  {
    id: 'pilot',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:pilot',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 15,
    },
  },
  {
    id: 'anchor',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:none',
      'fact:position': 'position:anchored',
      'fact:making_way': false,
      'fact:length_m': 30,
      'fact:near_channel': false,
    },
  },
  {
    id: 'nuc',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:nuc',
      'fact:position': 'position:underway',
      'fact:making_way': false,
      'fact:length_m': 30,
    },
  },
  {
    id: 'ram',
    facts: {
      'fact:propulsion': 'propulsion:power',
      'fact:activity': 'activity:ram',
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:length_m': 30,
    },
  },
];

/** The preset whose fact record the given facts are exactly, if any. */
export function presetFor(facts: FactRecord): Preset | undefined {
  const keys = (r: FactRecord) =>
    Object.entries(r)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
  const mine = JSON.stringify(keys(facts));
  return PRESETS.find((p) => JSON.stringify(keys(p.facts)) === mine);
}
