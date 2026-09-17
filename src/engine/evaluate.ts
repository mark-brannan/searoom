// The one seam between searoom and colregs-engine. The engine resolves a
// jurisdiction itself (colregs ADR 0018, colregs-engine #123): it takes the
// unresolved rule set through `EvaluateOptions.data` and the jurisdiction
// through `EvaluateOptions.jurisdiction`, so every evaluation in the app
// goes through here and searoom never hands it a pre-filtered entry list.

import { evaluateDisplay as engineEvaluateDisplay } from 'colregs-engine';
import { applicability, colregsVersion } from '../data/colregs';
import type { DisplayEvaluation, FactRecord } from './types';

/** Every lawful display for `facts` under one jurisdiction. */
export function evaluateDisplayIn(
  jurisdiction: string,
  facts: FactRecord,
): DisplayEvaluation {
  return engineEvaluateDisplay(facts, {
    // colregs-engine exports `ApplicabilityData` from its generated schema
    // but types `EvaluateOptions.data` against its own internal narrowing of
    // the same shape, and the two aren't mutually assignable. One cast, here,
    // rather than at every call site.
    data: applicability as Parameters<
      typeof engineEvaluateDisplay
    >[1] extends { data?: infer D }
      ? D
      : never,
    jurisdiction,
    // the engine throws unless the data we patched is the release it would
    // have read itself, so a stale colregs copy can't be evaluated silently
    dataVersion: colregsVersion,
  });
}
