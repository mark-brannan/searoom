import type React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { rovingKeyDown } from './roving';
import { entryById } from './entryById';
import { gatesOf, lightParts, reasonParts } from './displayReason';
import type { Gate, LightPart } from './displayReason';
import type {
  Display,
  DisplayLight,
  DisplayEvaluation,
  Modality,
} from '../engine/types';

const OP_SYMBOL: Record<Gate['op'], string> = {
  lt: '<',
  lte: '\u2264',
  gt: '>',
  gte: '\u2265',
};

// `fact:length_m` -> `m`, `fact:max_speed_kn` -> `kn`: the unit is the fact
// id's own suffix, so a new scalar fact needs no table here.
function unitFor(fact: string): string {
  const suffix = fact.split('_').pop() ?? '';
  return suffix;
}

/** The lawful alternatives as chips, the optional additions, and the
 * elimination lines: any evaluation result, any mode. */
export function DisplayChips({
  evaln,
  displayIndex,
  onDisplayIndex,
  additionsOn,
  onAdditionsOn,
}: {
  evaln: DisplayEvaluation;
  displayIndex: number;
  onDisplayIndex: (i: number) => void;
  additionsOn: string[];
  onAdditionsOn: (ids: string[]) => void;
}) {
  const intl = useIntl();
  const current = Math.min(displayIndex, evaln.displays.length - 1);

  // `< 50 m`, `<= 7 kn`: symbols and SI units, not prose, so the only
  // translated part is the "no gate" case.
  const gateText = (gates: Gate[]) =>
    gates.length === 0
      ? intl.formatMessage({ id: 'sandbox.display.gate.any' })
      : gates
          .map((g) => `${OP_SYMBOL[g.op]} ${g.value} ${unitFor(g.fact)}`)
          .join(', ');

  // What the chip shows, in the package catalog's own words: "1 × white
  // all-round light + sidelights". The light's label is the package's
  // (`light.all_round`), lowercased into the phrase; colour, character and
  // count are composed around it by the app's messages, since word order is
  // the language's to decide (REQ-LANG-6).
  const lightText = (lights: readonly DisplayLight[]) => {
    const parts = lightParts(lights);
    if (parts.length === 0)
      return intl.formatMessage({ id: 'sandbox.display.light.none' });
    const one = (p: LightPart) => {
      let light = intl
        .formatMessage({ id: `light.${p.light.replace(/^light:/, '')}` })
        .toLocaleLowerCase(intl.locale);
      if (p.color)
        light = intl.formatMessage(
          { id: 'sandbox.display.light.colored' },
          { color: intl.formatMessage({ id: `color.${p.color}` }), light },
        );
      if (p.character === 'flashing')
        light = intl.formatMessage(
          { id: 'sandbox.display.light.flashing' },
          { light },
        );
      if (p.count !== undefined)
        light = intl.formatMessage(
          { id: 'sandbox.display.light.counted' },
          { count: p.count, light },
        );
      return light;
    };
    const joined = parts.map(one).join(' + ');
    return parts.some((p) => p.combined)
      ? intl.formatMessage(
          { id: 'sandbox.display.light.combined' },
          { lights: joined },
        )
      : joined;
  };

  const modalityText = (m: Modality) =>
    intl.formatMessage({ id: `modality.${m.replace(/^modality:/, '')}` });

  // Why: one line per chip, read from the entry that makes this display
  // differ from its neighbours: cite, modality, gate. "30(b) · Permitted ·
  // < 50 m". Entries that share a modality and gate share the line —
  // "23(a)(i) + 23(a)(iii)-(iv) · Required · any length".
  const whyText = (d: Display) => {
    const lines = reasonParts(
      d,
      evaln.displays,
      entryById,
      evaln.modalities,
    ).map((part) => ({
      cite: part.cite,
      modality: modalityText(part.modality),
      gate: gateText(part.gates),
    }));
    const first = lines[0];
    if (
      first &&
      lines.every((l) => l.modality === first.modality && l.gate === first.gate)
    )
      return intl.formatMessage(
        { id: 'sandbox.display.reason' },
        { ...first, cite: lines.map((l) => l.cite).join(' + ') },
      );
    return lines
      .map((l) => intl.formatMessage({ id: 'sandbox.display.reason' }, l))
      .join(' + ');
  };

  // a lawful addition's why: its own cite, modality and gate
  const additionWhyText = (id: string, cite: string) => {
    const entry = entryById.get(id);
    return intl.formatMessage(
      { id: 'sandbox.display.reason' },
      {
        cite,
        modality: modalityText(
          evaln.modalities[id] ?? entry?.modality ?? 'modality:may',
        ),
        gate: gateText(entry ? gatesOf(entry) : []),
      },
    );
  };

  // elimination lines for the alternatives in play
  const elimination: React.ReactNode[] = [];
  const activeIds = new Set(evaln.displays.flatMap((d) => d.entries));
  for (const id of activeIds) {
    const e = entryById.get(id);
    if (!e) continue;
    const inLieu = (e['rel:in_lieu_of'] ?? []).filter((r) => activeIds.has(r));
    if (inLieu.length > 0) {
      elimination.push(
        <p className="elim" key={`il-${id}`}>
          <FormattedMessage
            id="sandbox.elimination.inLieu"
            values={{
              winner: e.cite,
              losers: inLieu.map((r) => entryById.get(r)?.cite ?? r).join(', '),
              cite: e.cite,
            }}
          />
        </p>,
      );
    }
    for (const r of e['rel:excludes'] ?? []) {
      if (activeIds.has(r) && id < r) {
        elimination.push(
          <p className="elim" key={`ex-${id}-${r}`}>
            <span className="x">✕ </span>
            <FormattedMessage
              id="sandbox.elimination.excludes"
              values={{
                a: e.cite,
                b: entryById.get(r)?.cite ?? r,
                cite: e.cite,
              }}
            />
          </p>,
        );
      }
    }
  }

  return (
    <div className="panel">
      <h2>
        <FormattedMessage
          id="sandbox.displays.title"
          values={{ count: evaln.displays.length }}
        />
      </h2>
      {evaln.displays.length > 1 && (
        <p className="elim">
          <FormattedMessage id="sandbox.displays.explain" />
        </p>
      )}
      <div
        className="chips"
        role="radiogroup"
        onKeyDown={rovingKeyDown}
        aria-label={intl.formatMessage(
          { id: 'sandbox.displays.title' },
          { count: evaln.displays.length },
        )}
      >
        {evaln.displays.map((d, i) => (
          <button
            key={i}
            className={`chip stacked${i === current ? ' active' : ''}`}
            role="radio"
            aria-checked={i === current}
            tabIndex={i === current ? 0 : -1}
            onClick={() => onDisplayIndex(i)}
          >
            <span className="chip-what">
              {lightText(d.lights)}
              {i === 0 && evaln.displays.length > 1 && (
                <span className="badge usual">
                  <FormattedMessage id="sandbox.display.usual" />
                </span>
              )}
            </span>
            <span className="chip-why">{whyText(d)}</span>
          </button>
        ))}
      </div>
      {evaln.displays.length > 1 && (
        <p className="elim usual-why">
          <FormattedMessage id="sandbox.display.usual.why" />
        </p>
      )}
      {evaln.displays[current]?.lights.length === 0 && (
        <p className="elim">
          <FormattedMessage id="sandbox.noDisplays" />
        </p>
      )}
      {elimination.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.elimination.title" />
          </h3>
          {elimination}
        </>
      )}
      {evaln.optionalAdditions.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.additions.title" />
          </h3>
          <p className="elim">
            <FormattedMessage id="sandbox.additions.explain" />
          </p>
          <div className="chips">
            {evaln.optionalAdditions.map((a) => {
              const on = additionsOn.includes(a.id);
              return (
                <button
                  key={a.id}
                  className={`chip stacked addition${on ? ' active' : ''}`}
                  aria-pressed={on}
                  onClick={() =>
                    onAdditionsOn(
                      on
                        ? additionsOn.filter((x) => x !== a.id)
                        : [...additionsOn, a.id],
                    )
                  }
                >
                  <span className="chip-what">{lightText(a.lights)}</span>
                  <span className="chip-why">
                    {additionWhyText(a.id, a.cite)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {evaln.exempted.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.exempted.title" />
          </h3>
          {evaln.exempted.map((x) => (
            <p className="elim" key={x.id}>
              <s>
                <FormattedMessage
                  id="sandbox.exempted.item"
                  values={{
                    id: x.id,
                    cite: entryById.get(x.id)?.cite ?? '',
                    by: entryById.get(x.by)?.cite ?? x.by,
                  }}
                />
              </s>
            </p>
          ))}
        </>
      )}
      {evaln.overridden.length > 0 && (
        <>
          <h3>
            <FormattedMessage id="sandbox.overridden.title" />
          </h3>
          {evaln.overridden.map((x) => (
            <p className="elim" key={x.id}>
              <span className="x">✕ </span>
              <FormattedMessage
                id="sandbox.overridden.item"
                values={{
                  id: x.id,
                  cite: entryById.get(x.id)?.cite ?? '',
                  by: entryById.get(x.by)?.cite ?? x.by,
                }}
              />
            </p>
          ))}
        </>
      )}
    </div>
  );
}
