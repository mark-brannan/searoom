// The cheat sheet (searoom#121): one page for the companionway — her lawful
// displays in each situation she will meet, in three views — the lights
// alone from ahead, abeam and astern, her profile, and the arcs overhead —
// each with the paragraphs that require it. The page is the fact record in
// view, so its link is the sheet; the print stylesheet fits it to one page,
// and the browser's print dialog saves it as a PDF.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Arcs, Scene } from '../components/Scene';
import { describeFacts } from '../components/factLabel';
import { useBoatName } from '../components/MyBoat';
import { boatSheet } from '../engine/myBoat';
import { selectHull } from 'nav-wright';
import { useApp, useSituation } from '../state/store';

/** Ahead, starboard beam, astern, port beam. */
const ASPECTS = [
  [0, 'ahead'],
  [90, 'starboard-beam'],
  [180, 'astern'],
  [270, 'port-beam'],
] as const;

export function Sheet() {
  const intl = useIntl();
  const { jurisdiction, facts } = useSituation();
  const setMode = useApp((s) => s.setMode);
  const name = useBoatName(facts);
  // every situation is drawn on her own hull, not the one its record selects
  // (aground would draw a ship, under engine a motor boat)
  const hull = useMemo(() => selectHull(facts), [facts]);
  const rows = useMemo(
    () => boatSheet(jurisdiction, facts),
    [jurisdiction, facts],
  );
  const [note, setNote] = useState<string | null>(null);
  // she is named by kind and length; where she lies is each situation's
  const vessel = useMemo(() => {
    const { 'fact:position': _p, 'fact:making_way': _m, ...kind } = facts;
    return describeFacts(intl, kind as typeof facts);
  }, [intl, facts]);

  const share = () => {
    const href = window.location.href;
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(href))
      .then(
        () => setNote(intl.formatMessage({ id: 'sheet.copied' })),
        () => setNote(href),
      );
  };

  return (
    <main className="panel cheat-sheet">
      <div className="sheet-head">
        <h2>
          {name ? (
            <FormattedMessage id="sheet.titleNamed" values={{ name, vessel }} />
          ) : (
            <FormattedMessage id="sheet.title" values={{ vessel }} />
          )}
        </h2>
        <p className="corpus-line">
          <FormattedMessage
            id="sheet.jurisdiction"
            values={{
              jurisdiction: intl.formatMessage({
                id: `jurisdiction.${jurisdiction}`,
                defaultMessage: jurisdiction,
              }),
            }}
          />
        </p>
        <div className="chips no-print">
          <button type="button" className="chip" onClick={() => window.print()}>
            <FormattedMessage id="sheet.print" />
          </button>
          <button type="button" className="chip" onClick={share}>
            <FormattedMessage id="sheet.share" />
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setMode('sandbox')}
          >
            <FormattedMessage id="sheet.edit" />
          </button>
          {note && (
            <span role="status" className="elim">
              {note}
            </span>
          )}
        </div>
      </div>
      {rows.map(({ situation, displays }) => (
        <section key={situation.id} className="sheet-situation">
          <h3>
            <FormattedMessage id={`myBoat.situation.${situation.id}`} />
          </h3>
          {displays.length === 0 ? (
            <p className="elim">
              <FormattedMessage id="sheet.noLights" />
            </p>
          ) : (
            displays.map(({ display, cite }, i) => (
              <div
                key={i}
                className="sheet-display"
                data-testid="sheet-display"
              >
                <p className="sheet-cite">
                  {displays.length > 1 && (
                    <FormattedMessage
                      id="sheet.option"
                      values={{ n: i + 1, total: displays.length }}
                    />
                  )}{' '}
                  <strong>{cite}</strong>
                </p>
                <div className="sheet-views">
                  {ASPECTS.map(([theta, aspect]) => (
                    <figure key={theta}>
                      <Scene
                        presentation="mini"
                        facts={situation.facts}
                        lights={display.lights}
                        settings={{ view: 'model', theta }}
                        hull={hull}
                      />
                      <figcaption>
                        <FormattedMessage id={`aspect.${aspect}`} />
                      </figcaption>
                    </figure>
                  ))}
                  <figure>
                    <Scene
                      presentation="mini"
                      facts={situation.facts}
                      lights={display.lights}
                      settings={{ view: 'profile', theta: 90 }}
                      hull={hull}
                    />
                    <figcaption>
                      <FormattedMessage id="view.profile" />
                    </figcaption>
                  </figure>
                  <figure>
                    <Arcs
                      facts={situation.facts}
                      lights={display.lights}
                      theta={0}
                      onTheta={() => {}}
                    />
                    <figcaption>
                      <FormattedMessage id="view.plan" />
                    </figcaption>
                  </figure>
                </div>
              </div>
            ))
          )}
        </section>
      ))}
      <p className="elim sheet-foot">
        <FormattedMessage id="sheet.foot" />
      </p>
    </main>
  );
}
