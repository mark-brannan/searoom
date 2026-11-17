import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets';

// scripts/golden-fixtures.mjs cannot import the TypeScript preset list, so it
// copies the ids; this keeps the copy honest (#102).
describe('golden fixtures', () => {
  it('shoot every preset hull', () => {
    const src = readFileSync('scripts/golden-fixtures.mjs', 'utf8');
    const listed = [...src.matchAll(/^ {2}'(\w+)',$/gm)].map((m) => m[1]);
    expect(listed).toEqual(PRESETS.map((p) => p.id));
  });
});
