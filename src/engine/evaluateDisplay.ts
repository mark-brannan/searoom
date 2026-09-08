// Thin adapter over colregs-engine's evaluateDisplay. searoom builds fact
// records dynamically (FactControls, URL state) against a loose
// Record<string, FactValue> — see the note in types.ts — while
// colregs-engine's own FactRecord types every key to colregs' exact enum.
// evaluateDisplay/validateFacts is the real authority on which keys and
// values are legal (it throws on an unrecognized one); this cast just lets
// searoom's wider app-level type reach that call.
import { evaluateDisplay as engineEvaluateDisplay } from 'colregs-engine';
import type { FactRecord as EngineFactRecord } from 'colregs-engine';
import type { FactRecord } from './types';

export function evaluateDisplay(facts: FactRecord) {
  return engineEvaluateDisplay(facts as unknown as EngineFactRecord);
}
