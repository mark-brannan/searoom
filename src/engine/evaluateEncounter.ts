// The encounter seam, mirroring `evaluate.ts`'s display seam: every
// two-subject evaluation in the app goes through here rather than calling
// colregs-engine directly, for the same jurisdiction/data-version reasons.

import { evaluateEncounter as engineEvaluateEncounter } from 'colregs-engine';
import { applicability, colregsVersion } from '../data/colregs';
import type { EncounterEvaluation, Situation } from './types';

/** Every applied entry, role and risk-of-collision finding for `situation`
 * under one jurisdiction. */
export function evaluateEncounterIn(
  jurisdiction: string,
  situation: Situation,
): EncounterEvaluation {
  return engineEvaluateEncounter(situation, {
    data: applicability as Parameters<
      typeof engineEvaluateEncounter
    >[1] extends { data?: infer D }
      ? D
      : never,
    jurisdiction,
    dataVersion: colregsVersion,
  });
}
