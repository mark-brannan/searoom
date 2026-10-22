import { applicability } from '../data/colregs';

// a label lookup, not a rule set: an id -> cite map over every jurisdiction's
// entries, so an overridden-by or in-lieu-of reference still renders its cite
export const entryById = new Map(applicability.entries.map((e) => [e.id, e]));
