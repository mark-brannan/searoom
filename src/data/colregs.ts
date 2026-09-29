// Single import point for the colregs package data. The app renders only
// what this data says (sprint boundary: no edits, no invented content).

// `with { type: 'json' }` matches how colregs-engine itself imports
// colregs/package.json and colregs/data/facts.json (src/evaluate.ts) —
// Vite/esbuild otherwise flags the same JSON module as imported with
// inconsistent attributes across the two packages.
import applicabilityJson from 'colregs/data/applicability.json' with { type: 'json' };
import editionsJson from 'colregs/data/editions.json' with { type: 'json' };
import factsJson from 'colregs/data/facts.json' with { type: 'json' };
import geometryJson from 'colregs/data/geometry.json' with { type: 'json' };
import imagesJson from 'colregs/data/images.json' with { type: 'json' };
import lightsJson from 'colregs/data/lights.json' with { type: 'json' };
import rulesJson from 'colregs/data/rules.json' with { type: 'json' };
import colregsPkg from 'colregs/package.json' with { type: 'json' };

import type {
  ApplicabilityData,
  LightsData,
  Paragraph,
  RulesData,
} from '../engine/types';

/**
 * ADR 0018's `suppressions[]` and ADR 0020's `deltas` are newer than the
 * generated types colregs-engine ships, so the two delta tables are typed
 * here against colregs' own schema until a regenerated engine carries them.
 */
export interface EntrySuppressionRow {
  jurisdiction: string;
  suppresses: string;
  cite: string;
  why: string;
}

export interface SkeletonDelta {
  note?: string;
  paragraphs: Record<string, Paragraph>;
  suppressions: { path: string; why: string }[];
}

export const applicability = applicabilityJson as unknown as ApplicabilityData & {
  suppressions?: EntrySuppressionRow[];
};
export const lights = lightsJson as unknown as LightsData;
export const rules = rulesJson as unknown as RulesData & {
  deltas?: Record<string, SkeletonDelta>;
};
export const facts = factsJson as Record<string, unknown>;

/**
 * `data/facts.json`'s `situation` key: the schema for the two-subject
 * `Situation` (kin/geo/hist/env), source of truth for Encounters mode's
 * generated controls (issue #95). Richer than colregs-engine's generated
 * `.d.ts` (cite/note per field) and not reachable via a deep import — the
 * package's `exports` map only allows `"."` and `"./schema"` — so this
 * reads it the same way `facts` above reads the vessel fact section: the
 * raw upstream JSON, typed loosely since it's read, not validated, here.
 */
export const situation = (factsJson as { situation: Record<string, unknown> })
  .situation;
export const geometry = geometryJson as Record<string, unknown>;
export const images = imagesJson as unknown as {
  images: Record<
    string,
    {
      file: string;
      captions?: string[];
      entries?: string[];
      paragraphs?: string[];
      source?: string;
      rights?: string;
    }
  >;
};

/** The instrument-and-edition registry of ADR 0013 / REQ-LANG-10. */
export interface EditionRow {
  amended_through?: string;
  in_force?: string;
  edition_status?: string;
  note?: string;
}

export const editions = editionsJson as unknown as {
  jurisdictions: Record<
    string,
    {
      instrument: string;
      skeleton: string;
      editions: Record<string, EditionRow>;
    }
  >;
};

export const colregsVersion: string = (colregsPkg as { version: string })
  .version;
