// Human-readable description of a fact record, via the message catalog —
// identifiers never render raw in learner-facing copy (REQ-LANG-2 keeps
// them language-neutral; the catalog supplies the words).

import type { IntlShape } from 'react-intl';
import type { FactRecord } from '../engine/types';

export function describeFacts(intl: IntlShape, facts: FactRecord): string {
  const parts: string[] = [];
  const enumLabel = (v: unknown) => {
    if (typeof v !== 'string') return undefined;
    const [prefix, suffix] = v.split(':');
    return intl.formatMessage({ id: `${prefix}.${suffix}` });
  };
  const p = enumLabel(facts['fact:propulsion']);
  const a = enumLabel(facts['fact:activity']);
  const pos = enumLabel(facts['fact:position']);
  if (a && facts['fact:activity'] !== 'activity:none') parts.push(a);
  if (p) parts.push(p.toLowerCase());
  if (typeof facts['fact:length_m'] === 'number')
    parts.push(
      intl.formatMessage(
        { id: 'quiz.scenario.length' },
        { length: facts['fact:length_m'] },
      ),
    );
  if (pos) parts.push(pos.toLowerCase());
  if (facts['fact:making_way'] === false)
    parts.push(`(${intl.formatMessage({ id: 'fact.makingWay' }).toLowerCase()}: ✗)`);
  if (typeof facts['fact:tow_length_m'] === 'number')
    parts.push(`tow ${facts['fact:tow_length_m']} m`);
  if (typeof facts['fact:gear_extent_m'] === 'number' && Number(facts['fact:gear_extent_m']) > 0)
    parts.push(`gear ${facts['fact:gear_extent_m']} m`);
  return parts.join(', ');
}
