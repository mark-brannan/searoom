// Types over the colregs data files and the engine's evaluation output.
//
// These used to be hand-declared here, mirroring colregs-engine's own
// src/types.ts and src/schema.ts by hand. searoom now consumes
// colregs-engine as a real dependency (see package.json — pinned to a git
// SHA until colregs-engine is published to npm, at which point this becomes
// a semver `^x.y.z` range), so this file is a thin re-export: the engine's
// own vocabulary (Display, DisplayLight, Evaluation, FactRecord, Modality)
// comes from its public entry point, and the colregs data shapes (Entry,
// ApplicabilityData, Predicate, LightSpec, ...) come from its
// `colregs-engine/schema` entry point, which mirrors colregs' JSON Schema.

export type {
  Display,
  DisplayLight,
  Evaluation,
  FactRecord,
  Modality,
} from 'colregs-engine';

export type {
  Arc,
  ApplicabilityData,
  Constraint,
  ConditionalInclude,
  Entry,
  FactValue,
  GeometryData,
  LightDef,
  LightsData,
  LightSpec,
  ModalityBy,
  NumericConstraint,
  Paragraph,
  Predicate,
  RulesData,
} from 'colregs-engine/schema';
