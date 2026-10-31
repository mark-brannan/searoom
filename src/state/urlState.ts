// The URL hash carries the app state for the mode in view, so any
// configuration is shareable — including which signpost panel is open. Hash
// routing keeps GitHub Pages happy. Deep-link shape for rules: #/rules/27(a)(i).

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

export type Mode =
  | 'sandbox'
  | 'identify'
  | 'quiz'
  | 'flashcards'
  | 'rules'
  | 'sound'
  | 'vessels';
// 'profile' is unwired from the Sandbox (refs #218); the type keeps its code compiling.
export type View = 'profile' | 'model' | 'plan';

/** The Sandbox's view state: how the vessel is shown, not what she is. */
export interface SandboxView {
  view: View;
  theta: number;
  /** Camera elevation above the waterline in the 3D views, degrees. */
  tilt: number;
  displayIndex: number;
  additionsOn: string[];
  /** 3D view hull hint, percent: 0 is off, 100 is plain to see. */
  hullHint: number;
  /** 3D view range to her, nautical miles: the hull hint is full at
   *  RANGE_MIN_NM and gone by RANGE_MAX_NM (nav-wright's hullHintOpacity). */
  range: number;
  /** 3D view sky, percent: 0 is black, 100 is a lighter night blue. */
  sky: number;
  /** 3D view draws Benchy in place of her own model, at her size. */
  benchy: boolean;
  /** 3D view mesh, by nav-wright file name; '' is the hull's default. */
  mesh: string;
  /** The lights-only view beside the 3D view. */
  bearingAside: boolean;
  drawer: boolean;
}

/** The Quiz's view state. */
export interface QuizView {
  /** Run seed; question n asks seed + n - 1, so a URL reopens it. */
  seed: number;
  /** Question number within the run, from 1. */
  n: number;
  direction: 'forward' | 'reverse';
  mode: QuizMode;
  /** Drill: only scenarios exercising this rule number; '' is all. */
  rule: string;
}

/** The Rules reader's view state. */
export interface RulesView {
  /** The paragraph in view, e.g. 27(a)(i). */
  path: string | null;
}

/**
 * The app state: the situation (jurisdiction and fact record), one view-state
 * slice per mode that has one, and preferences. A mode reads and writes its
 * own slice; a new mode adds a slice without touching another's.
 */
export interface AppState {
  mode: Mode;
  /** which jurisdiction's resolved rule set the app evaluates against */
  jurisdiction: string;
  facts: FactRecord;
  sandbox: SandboxView;
  quiz: QuizView;
  rules: RulesView;
  signpost: string | null;
  /** UI language (catalog). Independent of the rule-text corpus — REQ-LANG-1. */
  locale: string;
  /**
   * Rule-text corpus id from colregs data/corpora.json, e.g. intl@2016.es.boe.
   * Belongs to `jurisdiction`; a jurisdiction switch re-picks its reference.
   */
  corpus: string;
}

/** The view-state slices, each owned by the mode of the same name. */
export type SliceKey = 'sandbox' | 'quiz' | 'rules';
export const SLICES: SliceKey[] = ['sandbox', 'quiz', 'rules'];

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

export const DEFAULT_SANDBOX: SandboxView = {
  view: 'model',
  theta: 45,
  tilt: DEFAULT_TILT,
  displayIndex: 0,
  additionsOn: [],
  hullHint: 30,
  range: 0.5,
  sky: 0,
  benchy: false,
  mesh: '',
  bearingAside: true,
  drawer: false,
};

export const DEFAULT_QUIZ: QuizView = {
  seed: 1,
  n: 1,
  direction: 'forward',
  mode: 'practice',
  rule: '',
};

export const DEFAULT_RULES: RulesView = { path: null };

export const DEFAULT_STATE: AppState = {
  mode: 'sandbox',
  jurisdiction: BASE_JURISDICTION,
  facts: DEFAULT_FACTS,
  sandbox: DEFAULT_SANDBOX,
  quiz: DEFAULT_QUIZ,
  rules: DEFAULT_RULES,
  signpost: null,
  locale: 'en',
  corpus: DEFAULT_CORPUS_ID,
};

/** A state with the defaults in place of anything left out, slices merged one deep. */
export function stateWith(p: Partial<Omit<AppState, SliceKey>> & {
  sandbox?: Partial<SandboxView>;
  quiz?: Partial<QuizView>;
  rules?: Partial<RulesView>;
} = {}): AppState {
  return {
    ...DEFAULT_STATE,
    ...p,
    sandbox: { ...DEFAULT_SANDBOX, ...p.sandbox },
    quiz: { ...DEFAULT_QUIZ, ...p.quiz },
    rules: { ...DEFAULT_RULES, ...p.rules },
  };
}

const percent = (v: string | null): number | null => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : null;
};

/** The 3D view's range control: moonlight's reach to where she is gone. */
export const RANGE_MIN_NM = 0.5;
export const RANGE_MAX_NM = 3;
export const RANGE_STEP_NM = 0.1;

/** A range param in nm, clamped to the control and rounded to its step;
 *  junk is null so the default stands. */
const rangeNm = (v: string | null): number | null => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(RANGE_MAX_NM, Math.max(RANGE_MIN_NM, n));
  return Math.round(clamped * 10) / 10; // RANGE_STEP_NM
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

// The codec writes the situation and preferences always, and the view state
// of the mode in view only: a link shows one mode. Another mode's slice lives
// in the store for the visit (back/forward keep it, see store.ts) and is not
// in the URL.
export function serialize(state: AppState): string {
  const params = new URLSearchParams();
  for (const [short, key, kind] of FACT_PARAMS) {
    const v = (state.facts as FactBag)[key];
    if (v === undefined) continue;
    if (kind === 'enum') params.set(short, enumToParam(String(v)));
    else if (kind === 'bool') params.set(short, v ? '1' : '0');
    else params.set(short, String(v));
  }
  if (state.jurisdiction !== DEFAULT_STATE.jurisdiction)
    params.set('j', state.jurisdiction);
  if (state.signpost) params.set('sp', state.signpost);
  if (state.locale !== 'en') params.set('loc', state.locale);
  const cp = corpusIn(state.jurisdiction, state.corpus).id;
  if (cp !== defaultCorpusFor(state.jurisdiction)) params.set('cp', cp);
  let path = `/${state.mode}`;
  if (state.mode === 'sandbox') {
    const sb = state.sandbox;
    const d = DEFAULT_SANDBOX;
    if (sb.view !== d.view) params.set('view', sb.view);
    if (sb.theta !== d.theta) params.set('th', String(Math.round(sb.theta)));
    if (sb.tilt !== d.tilt) params.set('tl', String(Math.round(sb.tilt)));
    if (sb.displayIndex !== 0) params.set('d', String(sb.displayIndex));
    if (sb.additionsOn.length > 0) params.set('add', sb.additionsOn.join(','));
    if (sb.hullHint !== d.hullHint) params.set('hh', String(Math.round(sb.hullHint)));
    if (sb.range !== d.range) params.set('rg', String(sb.range));
    if (sb.sky !== d.sky) params.set('bg', String(Math.round(sb.sky)));
    if (sb.benchy) params.set('benchy', '1');
    if (sb.mesh) params.set('ms', sb.mesh);
    if (!sb.bearingAside) params.set('ba', '0');
    if (sb.drawer) params.set('dd', '1');
    // a preset's name stands in for its fact record
    const alias = presetAlias(state.facts);
    if (alias) {
      for (const [short] of FACT_PARAMS) params.delete(short);
      path = `/sandbox/${alias}`;
    }
  } else if (state.mode === 'rules') {
    if (state.rules.path) path = `/rules/${encodeURIComponent(state.rules.path)}`;
  } else if (state.mode === 'quiz') {
    const q = state.quiz;
    if (q.direction !== 'forward') params.set('dir', q.direction);
    if (q.mode !== 'practice') params.set('qm', q.mode);
    if (q.rule) params.set('qr', q.rule);
    if (q.seed !== 1 || q.n !== 1) path = `/quiz/${q.seed}/${q.n}`;
  }
  const q = params.toString();
  return `#${path}${q ? `?${q}` : ''}`;
}

/** The slices a hash carries: those of the mode it names. */
export function slicesIn(mode: Mode): SliceKey[] {
  return (SLICES as string[]).includes(mode) ? [mode as SliceKey] : [];
}

// Every slice's params are read whatever the mode, so a hand-edited link
// loses nothing it spelled out; serialize writes the mode's own.
export function deserialize(hash: string): AppState {
  const state = stateWith();
  const sb = state.sandbox;
  const quiz = state.quiz;
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h) return state;
  const qIndex = h.indexOf('?');
  const path = qIndex === -1 ? h : h.slice(0, qIndex);
  const query = qIndex === -1 ? '' : h.slice(qIndex + 1);
  const segments = path.split('/').filter(Boolean);
  const modes: Mode[] = ['sandbox', 'identify', 'quiz', 'flashcards', 'rules', 'sound', 'vessels'];
  if (segments[0] && (modes as string[]).includes(segments[0])) {
    state.mode = segments[0] as Mode;
  }
  if (state.mode === 'rules' && segments[1]) {
    state.rules.path = decodeURIComponent(segments[1]);
  }
  if (state.mode === 'quiz') {
    const seed = Number(segments[1]);
    const n = Number(segments[2]);
    if (Number.isInteger(seed) && seed >= 0) quiz.seed = seed;
    if (Number.isInteger(n) && n >= 1) quiz.n = n;
  }
  const params = new URLSearchParams(query);
  if (params.get('dir') === 'reverse') quiz.direction = 'reverse';
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
  if (view === 'model' || view === 'plan') sb.view = view;
  // the bearing and profile views live in the 3D model now; Benchy's link
  // lands there with Benchy on
  else if (view === 'bearing' || view === 'profile') sb.view = 'model';
  else if (view === 'benchy') {
    sb.view = 'model';
    sb.benchy = true;
  }
  const th = Number(params.get('th'));
  if (params.has('th') && Number.isFinite(th)) sb.theta = ((th % 360) + 360) % 360;
  const tl = Number(params.get('tl'));
  if (params.has('tl') && Number.isFinite(tl)) sb.tilt = Math.min(MAX_TILT, Math.max(0, tl));
  const d = Number(params.get('d'));
  if (params.has('d') && Number.isInteger(d) && d >= 0) sb.displayIndex = d;
  const add = params.get('add');
  if (add) sb.additionsOn = add.split(',').filter(Boolean);
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
  sb.hullHint = percent(params.get('hh')) ?? sb.hullHint;
  sb.range = rangeNm(params.get('rg')) ?? sb.range;
  sb.sky = percent(params.get('bg')) ?? sb.sky;
  if (params.get('benchy') === '1') sb.benchy = true;
  sb.mesh = params.get('ms') ?? '';
  if (params.get('ba') === '0') sb.bearingAside = false;
  if (params.get('dd') === '1') sb.drawer = true;
  const qm = params.get('qm');
  if (qm === 'drill' || qm === 'exam') quiz.mode = qm;
  const qr = params.get('qr');
  if (qr && /^\d{1,2}$/.test(qr)) quiz.rule = qr;
  return state;
}
