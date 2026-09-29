// Normalizes `colregs/data/facts.json`'s `situation` key (read via
// `src/data/colregs.ts`) into flat field-spec lists the Encounters controls
// render from at runtime — genuinely schema-driven, not hand-transcribed
// from colregs-engine's generated `.d.ts` (which the package's `exports`
// map won't let us deep-import anyway). Field-set cross-checked by eye
// against `colregs-engine/dist/generated/situation.d.ts`'s KIN_SPEC /
// GEO_OWN_SPEC / GEO_PAIR_SPEC / HIST_SPEC / ENV_SPEC at the time this was
// written; the two are generated from the same upstream data so they
// should never drift, but the generated file is normative for what
// `validateSituation()` actually accepts.

import { situation as situationJson } from './colregs';

export type FieldKind = 'position' | 'number' | 'boolean' | 'enum';

export interface SituationFieldSpec {
  /** e.g. `'kin:heading_deg'` */
  key: string;
  kind: FieldKind;
  unit?: string;
  values?: string[];
}

function specsFrom(section: unknown, prefix: string): SituationFieldSpec[] {
  if (!section || typeof section !== 'object') return [];
  const out: SituationFieldSpec[] = [];
  for (const [key, value] of Object.entries(section as Record<string, unknown>)) {
    if (!key.startsWith(`${prefix}:`)) continue;
    const v = value as { type?: string; unit?: string; values?: string[] };
    if (!v || typeof v.type !== 'string') continue;
    const kind: FieldKind =
      v.type === 'position'
        ? 'position'
        : v.type === 'boolean'
          ? 'boolean'
          : v.type === 'enum'
            ? 'enum'
            : 'number';
    out.push({ key, kind, unit: v.unit, values: v.values });
  }
  return out;
}

const s = situationJson as {
  kinematics?: unknown;
  history?: unknown;
  geometry?: { directional?: unknown; symmetric?: unknown };
  environment?: unknown;
};

/** `self`/`other` absolute kinematic state. */
export const KIN_FIELDS = specsFrom(s.kinematics, 'kin');
/** `self`/`other` history (Rule 13(d) latch). */
export const HIST_FIELDS = specsFrom(s.history, 'hist');
/** `self`/`other` directional geometry (measured in that subject's frame). */
export const GEO_OWN_FIELDS = specsFrom(s.geometry?.directional, 'geo');
/** `pair`-only symmetric geometry. */
export const GEO_PAIR_FIELDS = specsFrom(s.geometry?.symmetric, 'geo');
/** `pair`-only environment (narrow channel, traffic lane). */
export const ENV_FIELDS = specsFrom(s.environment, 'env');

/** Field keys this app can derive from positions/vectors rather than ask
 * the user to type in directly (issue #95 item 2). `range_m`/`cpa_m`/
 * `tcpa_s`/both `rel_bearing_deg`s are always derivable given both
 * positions+headings+speeds; `bearing_change_deg_min` is derivable the same
 * way (short time-step forward on the relative-motion vector) so it's
 * included too. `in_sight`/`risk_of_collision`/`windward` are judgment
 * calls the Rules leave to observation — never derived, plain checkboxes.
 */
export const DERIVABLE_PAIR_GEO_KEYS = new Set([
  'geo:range_m',
  'geo:cpa_m',
  'geo:tcpa_s',
  'geo:bearing_change_deg_min',
]);
export const DERIVABLE_OWN_GEO_KEYS = new Set(['geo:rel_bearing_deg']);
