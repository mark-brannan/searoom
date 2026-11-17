// My boat (searoom#121): save the fact record in view under a name, bring a
// saved one back, and the vessel filter the quiz, the flashcards and the
// rules reference share. A filter always reads the fact record in view, so a
// link carries her; picking a saved boat loads her into it.

import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { describeFacts } from './factLabel';
import { sameFacts } from '../engine/myBoat';
import type { FactRecord } from '../engine/types';
import { deleteBoat, NAME_MAX, saveBoat, useMyBoats } from '../state/myBoats';
import { useApp, usePatch, useSituation } from '../state/store';

/** The saved boat whose record this is, if any. */
export function useBoatName(facts: FactRecord): string | undefined {
  return useMyBoats().find((b) => sameFacts(b.facts, facts))?.name;
}

/** The Sandbox's panel: name and save her, load or delete a saved boat. */
export function MyBoatPanel() {
  const intl = useIntl();
  const { facts } = useSituation();
  const patch = usePatch();
  const setMode = useApp((s) => s.setMode);
  const boats = useMyBoats();
  const current = useBoatName(facts);
  const [name, setName] = useState('');
  const save = () => {
    saveBoat(name, facts);
    setName('');
  };
  return (
    <section className="panel my-boat">
      <h2>
        <FormattedMessage id="myBoat.title" />
      </h2>
      <form
        className="chips"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          type="text"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder={
            current ?? intl.formatMessage({ id: 'myBoat.name.placeholder' })
          }
          aria-label={intl.formatMessage({ id: 'myBoat.name.label' })}
        />
        <button type="submit" className="chip" disabled={!name.trim()}>
          <FormattedMessage id="myBoat.save" />
        </button>
        <button type="button" className="chip" onClick={() => setMode('sheet')}>
          <FormattedMessage id="myBoat.sheet" />
        </button>
      </form>
      {boats.length === 0 ? (
        <p className="elim">
          <FormattedMessage id="myBoat.none" />
        </p>
      ) : (
        <ul className="chips my-boat-list">
          {boats.map((b) => (
            <li key={b.name}>
              <button
                type="button"
                className={`chip${b.name === current ? ' active' : ''}`}
                aria-pressed={b.name === current}
                title={describeFacts(intl, b.facts)}
                onClick={() => patch({ facts: b.facts })}
              >
                {b.name}
              </button>
              <button
                type="button"
                className="chip my-boat-delete"
                aria-label={intl.formatMessage(
                  { id: 'myBoat.delete' },
                  { name: b.name },
                )}
                onClick={() => deleteBoat(b.name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const IN_VIEW = '@';

/**
 * All vessels, or her: the vessel in view, or a saved boat (which loads her
 * into the fact record). `mine` is whether the filter is on.
 */
export function BoatFilter({
  mine,
  onMine,
}: {
  mine: boolean;
  onMine: (mine: boolean) => void;
}) {
  const intl = useIntl();
  const { facts } = useSituation();
  const patch = usePatch();
  const boats = useMyBoats();
  const current = useBoatName(facts);
  const value = !mine ? '' : (current ?? IN_VIEW);
  return (
    <label>
      <FormattedMessage id="myBoat.filter.label" />{' '}
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const boat = boats.find((b) => b.name === v);
          if (boat) patch({ facts: boat.facts });
          onMine(v !== '');
        }}
      >
        <option value="">
          {intl.formatMessage({ id: 'myBoat.filter.all' })}
        </option>
        {!current && (
          <option value={IN_VIEW}>
            {intl.formatMessage(
              { id: 'myBoat.filter.inView' },
              { vessel: describeFacts(intl, facts) },
            )}
          </option>
        )}
        {boats.map((b) => (
          <option key={b.name} value={b.name}>
            {intl.formatMessage(
              { id: 'myBoat.filter.saved' },
              { name: b.name },
            )}
          </option>
        ))}
      </select>
    </label>
  );
}
