// The whole app state lives in the URL hash so any configuration is
// shareable — including which signpost panel is open. Hash routing keeps
// GitHub Pages happy. Deep-link shape for rules: #/rules/27(a)(i).

import type { FactRecord } from '../engine/types';

export type Mode = 'sandbox' | 'identify' | 'quiz' | 'rules' | 'sound';
export type View = 'profile' | 'bearing' | 'plan';

export interface AppState {
  mode: Mode;
  facts: FactRecord;
  view: View;
  theta: number;
  displayIndex: number;
  additionsOn: string[];
  signpost: string | null;
  locale: string;
  rulePath: string | null;
  hullHint: boolean;
  drawer: boolean;
}

export const DEFAULT_FACTS: FactRecord = {
  'fact:propulsion': 'propulsion:sail',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 12,
};

export const DEFAULT_STATE: AppState = {
  mode: 'sandbox',
  facts: DEFAULT_FACTS,
  view: 'profile',
  theta: 45,
  displayIndex: 0,
  additionsOn: [],
  signpost: null,
  locale: 'en',
  rulePath: null,
  hullHint: true,
  drawer: false,
};

// short param <-> fact key
const FACT_PARAMS: [string, string, 'enum' | 'num' | 'bool'][] = [
  ['p', 'fact:propulsion', 'enum'],
  ['a', 'fact:activity', 'enum'],
  ['pos', 'fact:position', 'enum'],
  ['mw', 'fact:making_way', 'bool'],
  ['len', 'fact:length_m', 'num'],
  ['tow', 'fact:tow_length_m', 'num'],
  ['spd', 'fact:max_speed_kn', 'num'],
  ['gear', 'fact:gear_extent_m', 'num'],
  ['cu', 'fact:composite_unit', 'bool'],
  ['nd', 'fact:non_displacement', 'bool'],
  ['wig', 'fact:wig', 'bool'],
  ['wns', 'fact:wig_near_surface', 'bool'],
  ['nc', 'fact:near_channel', 'bool'],
  ['ob', 'fact:obstruction_exists', 'bool'],
  ['obs', 'fact:obstruction_side', 'enum'],
];

// enum values travel as their suffix ("propulsion:sail" -> "sail")
function enumToParam(v: string): string {
  return v.slice(v.indexOf(':') + 1);
}
function paramToEnum(key: string, v: string): string {
  const prefix = key.slice(key.indexOf(':') + 1); // "propulsion"
  return `${prefix}:${v}`;
}

export function serialize(state: AppState): string {
  const params = new URLSearchParams();
  for (const [short, key, kind] of FACT_PARAMS) {
    const v = state.facts[key];
    if (v === undefined) continue;
    if (kind === 'enum') params.set(short, enumToParam(String(v)));
    else if (kind === 'bool') params.set(short, v ? '1' : '0');
    else params.set(short, String(v));
  }
  if (state.view !== DEFAULT_STATE.view) params.set('view', state.view);
  if (state.theta !== DEFAULT_STATE.theta)
    params.set('th', String(Math.round(state.theta)));
  if (state.displayIndex !== 0) params.set('d', String(state.displayIndex));
  if (state.additionsOn.length > 0)
    params.set('add', state.additionsOn.join(','));
  if (state.signpost) params.set('sp', state.signpost);
  if (state.locale !== 'en') params.set('loc', state.locale);
  if (!state.hullHint) params.set('hh', '0');
  if (state.drawer) params.set('dd', '1');
  const path =
    state.mode === 'rules' && state.rulePath
      ? `/rules/${encodeURIComponent(state.rulePath)}`
      : `/${state.mode}`;
  const q = params.toString();
  return `#${path}${q ? `?${q}` : ''}`;
}

export function deserialize(hash: string): AppState {
  const state: AppState = {
    ...DEFAULT_STATE,
    facts: { ...DEFAULT_FACTS },
    additionsOn: [],
  };
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h) return state;
  const qIndex = h.indexOf('?');
  const path = qIndex === -1 ? h : h.slice(0, qIndex);
  const query = qIndex === -1 ? '' : h.slice(qIndex + 1);
  const segments = path.split('/').filter(Boolean);
  const modes: Mode[] = ['sandbox', 'identify', 'quiz', 'rules', 'sound'];
  if (segments[0] && (modes as string[]).includes(segments[0])) {
    state.mode = segments[0] as Mode;
  }
  if (state.mode === 'rules' && segments[1]) {
    state.rulePath = decodeURIComponent(segments[1]);
  }
  const params = new URLSearchParams(query);
  const facts: FactRecord = {};
  for (const [short, key, kind] of FACT_PARAMS) {
    const v = params.get(short);
    if (v === null) continue;
    if (kind === 'enum') facts[key] = paramToEnum(key, v);
    else if (kind === 'bool') facts[key] = v === '1';
    else {
      const n = Number(v);
      if (Number.isFinite(n)) facts[key] = n;
    }
  }
  if (Object.keys(facts).length > 0) state.facts = facts;
  const view = params.get('view');
  if (view === 'profile' || view === 'bearing' || view === 'plan')
    state.view = view;
  const th = Number(params.get('th'));
  if (params.has('th') && Number.isFinite(th))
    state.theta = ((th % 360) + 360) % 360;
  const d = Number(params.get('d'));
  if (params.has('d') && Number.isInteger(d) && d >= 0) state.displayIndex = d;
  const add = params.get('add');
  if (add) state.additionsOn = add.split(',').filter(Boolean);
  state.signpost = params.get('sp');
  const loc = params.get('loc');
  if (loc) state.locale = loc;
  if (params.get('hh') === '0') state.hullHint = false;
  if (params.get('dd') === '1') state.drawer = true;
  return state;
}
