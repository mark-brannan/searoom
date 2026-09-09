// The whole app state lives in the URL hash so any configuration is
// shareable — including which signpost panel is open. Hash routing keeps
// GitHub Pages happy. Deep-link shape for rules: #/rules/27(a)(i).

import type { FactRecord, FactValue } from '../engine/types';

// FactRecord (from colregs-engine/schema) has no index signature — each key
// carries its own literal type. The URL codec below reads/writes facts by a
// key it only knows dynamically (from FACT_PARAMS), so it works over this
// looser view and casts back to FactRecord at the boundary.
type FactBag = Record<string, FactValue | undefined>;

export type Mode = 'sandbox' | 'identify' | 'quiz' | 'rules' | 'sound';
export type View = 'profile' | 'bearing' | 'plan' | 'model';

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

// short param <-> fact key. The 4th element, for 'enum' params, is the
// accepted suffix set — colregs-engine's validateFacts() throws on anything
// else, and a hand-edited or stale URL is untrusted input.
const FACT_PARAMS: [string, string, 'enum' | 'num' | 'bool', string[]?][] = [
  ['p', 'fact:propulsion', 'enum', ['power', 'sail', 'oars']],
  [
    'a',
    'fact:activity',
    'enum',
    [
      'none',
      'fishing',
      'trawling',
      'towing',
      'pushing',
      'being_towed',
      'nuc',
      'ram',
      'ram_underwater',
      'cbd',
      'mine',
      'pilot',
      'diving',
    ],
  ],
  ['pos', 'fact:position', 'enum', ['underway', 'anchored', 'aground', 'moored']],
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
  ['obs', 'fact:obstruction_side', 'enum', ['port', 'starboard']],
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
    const v = (state.facts as FactBag)[key];
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
  const facts: FactBag = {};
  for (const [short, key, kind, enumValues] of FACT_PARAMS) {
    const v = params.get(short);
    if (v === null) continue;
    if (kind === 'enum') {
      if (enumValues?.includes(v)) facts[key] = paramToEnum(key, v);
    } else if (kind === 'bool') facts[key] = v === '1';
    else {
      const n = Number(v);
      if (Number.isFinite(n)) facts[key] = n;
    }
  }
  if (Object.keys(facts).length > 0)
    state.facts = { ...DEFAULT_FACTS, ...facts } as FactRecord;
  const view = params.get('view');
  if (view === 'profile' || view === 'bearing' || view === 'plan' || view === 'model')
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
