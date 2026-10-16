import { FormattedMessage } from 'react-intl';
import { entryById } from './entryById';
import { colregsVersion } from '../data/colregs';
import { corpusHandle } from '../data/corpusText';
import { useCorpus } from '../state/corpusContext';
import type { DisplayEvaluation, FactRecord } from '../engine/types';

export function DataDrawer({
  evaln,
  facts,
  jurisdiction,
  open,
  onOpen,
}: {
  evaln: DisplayEvaluation;
  facts: FactRecord;
  jurisdiction: string;
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const applied = evaln.applied.map((id) => entryById.get(id));
  const corpus = useCorpus();
  return (
    <div className="panel drawer">
      <details
        open={open}
        onToggle={(e) => onOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          <FormattedMessage id="drawer.title" />
        </summary>
        <h3>
          <FormattedMessage id="drawer.package" />
        </h3>
        <p className="corpus-line">
          <FormattedMessage
            id="drawer.packageLine"
            values={{
              version: colregsVersion,
              jurisdiction: jurisdiction,
              corpus: `${corpusHandle(corpus)} ${corpus.edition}`,
              tier: corpus.tier,
              language: corpus.language,
            }}
          />
        </p>
        <h3>
          <FormattedMessage id="drawer.factRecord" />
        </h3>
        <pre>{JSON.stringify(facts, null, 1)}</pre>
        <h3>
          <FormattedMessage id="drawer.applied" />
        </h3>
        <pre>{JSON.stringify(applied, null, 1)}</pre>
      </details>
    </div>
  );
}
