// RFC 7396, JSON Merge Patch. colregs ADR 0018 and ADR 0020 both define a
// jurisdiction as a merge patch over `intl` — "any conformant merge-patch
// implementation applied to the intl entries by id reproduces the
// jurisdiction's resolved rule set" — so the resolution below is a literal
// implementation of §2 rather than a bespoke three-way merge that only
// happens to agree with it today.

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function isObject(v: unknown): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * `MergePatch(Target, Patch)` of RFC 7396 §2. A `null` in the patch deletes
 * the key (the tombstone of ADR 0018); an object recurses field by field, so
 * a restated row that says nothing about `images` keeps the base figure
 * (ADR 0020 point 2); anything else — arrays included — replaces wholesale
 * (ADR 0018 point 4).
 */
export function mergePatch(target: Json, patch: Json): Json {
  if (!isObject(patch)) return patch;
  const out: Record<string, Json> = isObject(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key];
    else out[key] = mergePatch(out[key] ?? null, value);
  }
  return out;
}
