// Types over the colregs data files. The package is data-only (no runtime,
// no types), so the shapes are declared here, against the published schema.
//
// Display, DisplayLight and Evaluation are the exception: they are the
// evaluator's *output* shape, and the evaluator itself now lives in
// colregs-engine (src/engine/evaluateDisplay.ts), so those three are
// re-exported from there rather than hand-declared, to keep the app's
// output type honest to what evaluateDisplay actually returns.

export type FactValue = string | number | boolean;

/** A fact record: what the user has asserted about one vessel at one moment. */
export type FactRecord = Record<string, FactValue>;

export interface NumericConstraint {
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
}

export type Constraint = FactValue | FactValue[] | NumericConstraint;

export type Predicate = Record<string, Constraint>;

export type Modality =
  | 'shall'
  | 'may'
  | 'shall-if-practicable'
  | 'conditional'
  | 'exempt';

export interface LightSpec {
  light: string;
  color?: string;
  character?: string;
  count?: number;
  arrangement?: string;
  position?: string;
  combined?: boolean;
  intensity?: string;
  modality?: string;
  note?: string;
}

export interface ModalityBy {
  when: Predicate;
  modality: Modality;
}

export interface ConditionalInclude {
  when?: Predicate;
  one_of?: string[];
  'rel:includes'?: string[];
  cite?: string;
}

export interface Entry {
  id: string;
  jurisdiction: string;
  cite: string;
  when: Predicate;
  lights: LightSpec[];
  modality: Modality;
  modality_by?: ModalityBy[];
  'rel:includes'?: string[];
  'rel:conditional_includes'?: ConditionalInclude[];
  'rel:in_lieu_of'?: string[];
  'rel:excludes'?: string[];
  'rel:exempts'?: string[];
  images?: string[];
  notes?: string;
}

export interface ApplicabilityData {
  known_omissions: { cite: string; what: string; why: string }[];
  entries: Entry[];
}

export interface Arc {
  from_deg: number;
  to_deg: number;
}

export interface LightDef {
  name: string;
  cite: string;
  color: string | null;
  character: string;
  arc_deg: number | null;
  arc: Arc | null;
  composite?: boolean;
  components?: string[];
  side?: string;
  rule21: boolean;
  note?: string;
}

export interface LightsData {
  lights: Record<string, LightDef>;
  visibility: {
    cite: string;
    bands: {
      cite: string;
      when: Predicate;
      ranges_nm?: Record<string, number>;
      overrides_nm?: Record<string, number>;
      refines?: string;
    }[];
  };
}

export interface Paragraph {
  path: string;
  rule: string;
  rule_title: string;
  jurisdiction: string;
  text: string;
}

export interface RulesData {
  source: string;
  source_url: string;
  retrieved: string;
  gaps: { path: string; reason: string }[];
  paragraphs: Record<string, Paragraph>;
}

export type { Display, DisplayLight, DisplayEvaluation as Evaluation } from 'colregs-engine';
