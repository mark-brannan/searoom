import { describe, expect, it } from 'vitest';
import { editsText, useApp } from './store';
import { PRESETS } from '../data/presets';
import { meshOnChange } from '../render/hullModels';

describe('fact-record undo', () => {
  it('steps the facts back, with the mesh they were shown on', () => {
    const [a, b] = PRESETS.map((p) => p.facts as never);
    const { patch } = useApp.getState();
    patch({ facts: a, mesh: 'before.glb' });
    const start = useApp.getState().state;
    const mesh = meshOnChange(a, b);
    patch({ facts: b, ...(mesh !== undefined && { mesh }) });
    useApp.getState().undo();
    const after = useApp.getState().state;
    expect(after.facts).toEqual(start.facts);
    expect(after.mesh).toBe('before.glb');
  });

  it('leaves no entry for a patch that does not change the facts', () => {
    const before = useApp.getState().undoStack.length;
    useApp.getState().patch({ locale: 'en' });
    expect(useApp.getState().undoStack.length).toBe(before);
  });
});

describe('editsText', () => {
  const input = (type: string) => ({ tagName: 'INPUT', type }) as never;
  it('leaves ctrl/cmd+Z to text fields', () => {
    expect(editsText(input('text'))).toBe(true);
    expect(editsText(input('number'))).toBe(true);
    expect(editsText({ tagName: 'TEXTAREA' } as never)).toBe(true);
  });
  it('takes ctrl/cmd+Z on a slider, checkbox, radio or select', () => {
    expect(editsText(input('range'))).toBe(false);
    expect(editsText(input('checkbox'))).toBe(false);
    expect(editsText(input('radio'))).toBe(false);
    expect(editsText({ tagName: 'SELECT' } as never)).toBe(false);
    expect(editsText(null)).toBe(false);
  });
});
