// The one seam between searoom and colregs-engine. The engine has no
// jurisdiction parameter — it takes a resolved rule set through
// `EvaluateOptions.data` — so every evaluation in the app goes through here
// with the jurisdiction in view already resolved (colregs ADR 0018).

import { evaluateDisplay as engineEvaluateDisplay } from 'colregs-engine';
import { colregsVersion } from '../data/colregs';
import { resolveApplicability } from '../data/jurisdictions';
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
    data: resolveApplicability(jurisdiction) as Parameters<
      typeof engineEvaluateDisplay
    >[1] extends { data?: infer D }
      ? D
      : never,
    // the engine throws unless the data we patched is the release it would
    // have read itself, so a stale colregs copy can't be evaluated silently
    dataVersion: colregsVersion,
  });
}
