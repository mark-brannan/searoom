// A pattern in words — "two prolonged blasts, one short blast" — so the
// glyph row has a text equivalent for a reader who cannot hear the signal
// or see the glyphs.

import type { IntlShape } from 'react-intl';
import { patternRuns, type SignalPattern } from '../audio/signalPattern';

export function patternWords(intl: IntlShape, pattern: SignalPattern): string {
  return patternRuns(pattern)
    .map((run) =>
      intl.formatMessage({ id: `sound.word.${run.sound}` }, { count: run.count }),
    )
    .join(', ');
}
