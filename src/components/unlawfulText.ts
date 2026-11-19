// What changed in an unlawful display, in words: shared by Quiz and Identify.

import type { IntlShape } from 'react-intl';
import type { LightToken, UnlawfulReason } from '../engine/unlawful';

export function lightName(intl: IntlShape, t: LightToken): string {
  const colour = intl.formatMessage({ id: `color.${t.color}` });
  return t.flashing
    ? intl.formatMessage({ id: 'unlawful.light.flashing' }, { colour })
    : colour;
}

export function reasonText(intl: IntlShape, r: UnlawfulReason): string {
  return intl.formatMessage(
    { id: `unlawful.reason.${r.kind}` },
    {
      lawful: r.lawful ? lightName(intl, r.lawful) : '',
      shown: r.shown ? lightName(intl, r.shown) : '',
    },
  );
}
