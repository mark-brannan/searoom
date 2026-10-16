// The whole app state lives in the URL hash so any configuration is
// shareable — including which signpost panel is open. Hash routing keeps
// GitHub Pages happy. Deep-link shape for rules: #/rules/27(a)(i).

import type { FactRecord, FactValue } from '../engine/types';
import { BASE_JURISDICTION, isJurisdiction } from '../data/jurisdictions';
import { PRESETS } from '../data/presets';
import { DEFAULT_TILT, MAX_TILT } from 'nav-wright/benchy';
import {
  DEFAULT_CORPUS_ID,
  corpusById,
  corpusIn,
  jurisdictionOf,
  referenceCorpusFor,
} from '../data/corpusText';

// FactRecord (from colregs-engine/schema) has no index signature — each key
// carries its own literal type. The URL codec below reads/writes facts by a
// key it only knows dynamically (from FACT_PARAMS), so it works over this
// looser view and casts back to FactRecord at the boundary.
type FactBag = Record<string, FactValue | undefined>;

export type Mode = 'sandbox' | 'identify' | 'quiz' | 'rules' | 'sound';
export type View = 'profile' | 'bearing' | 'plan';

export interface AppState {
  mode: Mode;
  /** which jurisdiction's resolved rule set the app evaluates against */
  jurisdiction: string;
  facts: FactRecord;
  view: View;
  theta: number;
  /** Camera elevation above the waterline in the 3D views, degrees. */
  tilt: number;
  displayIndex: number;
  additionsOn: string[];
  signpost: string | null;
  /** UI language (catalog). Independent of the rule-text corpus — REQ-LANG-1. */
  locale: string;
  /**
   * Rule-text corpus id from colregs data/corpora.json, e.g. intl@2016.es.boe.
   * Belongs to `jurisdiction`; a jurisdiction switch re-picks its reference.
   */
  corpus: string;
  rulePath: string | null;
  /** Bearing view hull hint, percent: 0 is off, 100 is plain to see. */
  hullHint: number;
  /** Bearing view sky, percent: 0 is black, 100 is a lighter night blue. */
  sky: number;
  /** Bearing view draws Benchy in place of her own model, at her size. */
  benchy: boolean;
  /** Bearing view mesh, by nav-wright file name; '' is the hull's default. */
  mesh: string;
  drawer: boolean;
  /** Quiz run seed; question n asks seed + n - 1, so a URL reopens it. */
  quizSeed: number;
  /** Quiz question number within the run, from 1. */
  quizN: number;
  quizDirection: 'forward' | 'reverse';
  quizMode: QuizMode;
  /** Quiz drill: only scenarios exercising this rule number; '' is all. */
  quizRule: string;
}

export type QuizMode = 'practice' | 'drill' | 'exam';
export const QUIZ_MODES: QuizMode[] = ['practice', 'drill', 'exam'];

export const DEFAULT_FACTS: FactRecord = {
  'fact:propulsion': 'propulsion:sail',
  'fact:activity': 'activity:none',
  'fact:position': 'position:underway',
  'fact:making_way': true,
  'fact:length_m': 12,
};

// The 3D view's camera elevation bounds are nav-wright's; re-exported so
// the rest of the app keeps one import path for URL-state constants.
export { DEFAULT_TILT, MAX_TILT };

/** The corpus a jurisdiction reads unless the URL says otherwise. */
export function defaultCorpusFor(jurisdiction: string): string {
  return referenceCorpusFor(jurisdiction)?.id ?? DEFAULT_CORPUS_ID;
}

export const DEFAULT_STATE: AppState = {
  mode: 'sandbox',
  jurisdiction: BASE_JURISDICTION,
  facts: DEFAULT_FACTS,
  view: 'profile',
  theta: 45,
  tilt: DEFAULT_TILT,
  displayIndex: 0,
  additionsOn: [],
  signpost: null,
  locale: 'en',
  corpus: DEFAULT_CORPUS_ID,
  rulePath: null,
  hullHint: 30,
  sky: 0,
  benchy: false,
  mesh: '',
  drawer: false,
  quizSeed: 1,
  quizN: 1,
  quizDirection: 'forward',
  quizMode: 'practice',
  quizRule: '',
};

const percent = (v: string | null): number | null => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : null;
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

/** The preset whose fact record this is exactly, unless it is the default. */
function presetAlias(facts: FactRecord): string | null {
  if (JSON.stringify(sortedFacts(facts)) === JSON.stringify(sortedFacts(DEFAULT_FACTS)))
    return null;
  const want = JSON.stringify(sortedFacts(facts));
  return PRESETS.find((p) => JSON.stringify(sortedFacts(p.facts)) === want)?.id ?? null;
}
function sortedFacts(f: FactRecord): [string, unknown][] {
  return Object.entries(f).sort(([a], [b]) => a.localeCompare(b));
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
  if (state.tilt !== DEFAULT_STATE.tilt)
    params.set('tl', String(Math.round(state.tilt)));
  if (state.displayIndex !== 0) params.set('d', String(state.displayIndex));
  if (state.additionsOn.length > 0)
    params.set('add', state.additionsOn.join(','));
  if (state.jurisdiction !== DEFAULT_STATE.jurisdiction)
    params.set('j', state.jurisdiction);
  if (state.signpost) params.set('sp', state.signpost);
  if (state.locale !== 'en') params.set('loc', state.locale);
  const cp = corpusIn(state.jurisdiction, state.corpus).id;
  if (cp !== defaultCorpusFor(state.jurisdiction)) params.set('cp', cp);
  if (state.hullHint !== DEFAULT_STATE.hullHint)
    params.set('hh', String(Math.round(state.hullHint)));
  if (state.sky !== DEFAULT_STATE.sky) params.set('bg', String(Math.round(state.sky)));
  if (state.benchy) params.set('bn', '1');
  if (state.mesh) params.set('ms', state.mesh);
  if (state.drawer) params.set('dd', '1');
  let path = `/${state.mode}`;
  if (state.mode === 'rules' && state.rulePath)
    path = `/rules/${encodeURIComponent(state.rulePath)}`;
  else if (state.mode === 'quiz') {
    if (state.quizDirection !== 'forward') params.set('dir', state.quizDirection);
    if (state.quizMode !== 'practice') params.set('qm', state.quizMode);
    if (state.quizRule) params.set('qr', state.quizRule);
    if (state.quizSeed !== 1 || state.quizN !== 1)
      path = `/quiz/${state.quizSeed}/${state.quizN}`;
  } else if (state.mode === 'sandbox') {
    // a preset's name stands in for its fact record
    const alias = presetAlias(state.facts);
    if (alias) {
      for (const [short] of FACT_PARAMS) params.delete(short);
      path = `/sandbox/${alias}`;
    }
  }
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
  if (state.mode === 'quiz') {
    const seed = Number(segments[1]);
    const n = Number(segments[2]);
    if (Number.isInteger(seed) && seed >= 0) state.quizSeed = seed;
    if (Number.isInteger(n) && n >= 1) state.quizN = n;
  }
  const params = new URLSearchParams(query);
  if (params.get('dir') === 'reverse') state.quizDirection = 'reverse';
  const preset =
    state.mode === 'sandbox' && segments[1]
      ? PRESETS.find((p) => p.id === segments[1])
      : undefined;
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
  // query fields refine the aliased preset, or the default record without one
  const base = preset ? preset.facts : DEFAULT_FACTS;
  if (preset || Object.keys(facts).length > 0)
    state.facts = { ...base, ...facts } as FactRecord;
  const view = params.get('view');
  if (view === 'profile' || view === 'bearing' || view === 'plan') state.view = view;
  // the Model and Benchy tabs merged into the bearing view; an old link
  // lands there, Benchy's with Benchy on
  else if (view === 'model') state.view = 'bearing';
  else if (view === 'benchy') {
    state.view = 'bearing';
    state.benchy = true;
  }
  const th = Number(params.get('th'));
  if (params.has('th') && Number.isFinite(th))
    state.theta = ((th % 360) + 360) % 360;
  const tl = Number(params.get('tl'));
  if (params.has('tl') && Number.isFinite(tl))
    state.tilt = Math.min(MAX_TILT, Math.max(0, tl));
  const d = Number(params.get('d'));
  if (params.has('d') && Number.isInteger(d) && d >= 0) state.displayIndex = d;
  const add = params.get('add');
  if (add) state.additionsOn = add.split(',').filter(Boolean);
  // an unknown jurisdiction in a hand-edited or stale URL falls back to the
  // base rather than handing the engine a rule set that doesn't exist
  const j = params.get('j');
  if (j && isJurisdiction(j)) state.jurisdiction = j;
  state.signpost = params.get('sp');
  const loc = params.get('loc');
  if (loc) state.locale = loc;
  // a corpus id the package does not ship, or one from another jurisdiction,
  // is a stale or hand-edited URL: read the jurisdiction's reference instead
  state.corpus = defaultCorpusFor(state.jurisdiction);
  const cp = params.get('cp');
  const chosen = cp ? corpusById(cp) : undefined;
  if (chosen && jurisdictionOf(chosen) === state.jurisdiction) state.corpus = chosen.id;
  state.hullHint = percent(params.get('hh')) ?? state.hullHint;
  state.sky = percent(params.get('bg')) ?? state.sky;
  if (params.get('bn') === '1') state.benchy = true;
  state.mesh = params.get('ms') ?? '';
  if (params.get('dd') === '1') state.drawer = true;
  const qm = params.get('qm');
  if (qm === 'drill' || qm === 'exam') state.quizMode = qm;
  const qr = params.get('qr');
  if (qr && /^\d{1,2}$/.test(qr)) state.quizRule = qr;
  return state;
}
