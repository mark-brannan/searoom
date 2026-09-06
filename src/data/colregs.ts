// Single import point for the colregs package data. The app renders only
// what this data says (sprint boundary: no edits, no invented content).

// `with { type: 'json' }` matches how colregs-engine itself imports
// colregs/package.json and colregs/data/facts.json (src/evaluate.ts) —
// Vite/esbuild otherwise flags the same JSON module as imported with
// inconsistent attributes across the two packages.
import applicabilityJson from 'colregs/data/applicability.json' with { type: 'json' };
import factsJson from 'colregs/data/facts.json' with { type: 'json' };
import geometryJson from 'colregs/data/geometry.json' with { type: 'json' };
import imagesJson from 'colregs/data/images.json' with { type: 'json' };
import lightsJson from 'colregs/data/lights.json' with { type: 'json' };
import rulesJson from 'colregs/data/rules.json' with { type: 'json' };
import colregsPkg from 'colregs/package.json' with { type: 'json' };

import type { ApplicabilityData, LightsData, RulesData } from '../engine/types';

export const applicability = applicabilityJson as unknown as ApplicabilityData;
export const lights = lightsJson as unknown as LightsData;
export const rules = rulesJson as unknown as RulesData;
export const facts = factsJson as Record<string, unknown>;
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

export const colregsVersion: string = (colregsPkg as { version: string })
  .version;

/** The corpus identity of the shipped rule text (see ADR 0003). */
export const corpus = {
  jurisdiction: 'intl',
  language: 'en-US',
  source: 'USCG amalgamated rendition',
  sourceUrl: (rulesJson as { source_url: string }).source_url,
  tier: 'national' as const,
};
