// The Part D mode stub — a signposted dead end that is content: the
// actual open question, not "coming soon".

import { FormattedMessage } from 'react-intl';
import type { Patch } from '../App';
import { findSignpost } from '../data/signposts';

export function Sound({ patch }: { patch: (p: Patch) => void }) {
  const sp = findSignpost('part-d')!;
  return (
    <div className="panel">
      <h2>
        <FormattedMessage id="sound.title" />
      </h2>
      <span className={`status-chip status-${sp.status}`}>
        <FormattedMessage id={`signpost.status.${sp.status}`} />
      </span>
      {sp.bodyKeys.map((k) => (
        <p key={k}>
          <FormattedMessage id={k} />
        </p>
      ))}
      {sp.blockers.map((b) => (
        <p key={b.id} className="blocker">
          <span className="bid">{b.id}</span>
          <FormattedMessage id={b.textKey} />
        </p>
      ))}
      <p>
        <a href={sp.link} target="_blank" rel="noreferrer">
          <FormattedMessage id="signpost.upstream" />
        </a>
        {' · '}
        <button
          className="chip"
          onClick={() => patch({ signpost: 'part-b' })}
        >
          <FormattedMessage id="sp.part-b.label" />
        </button>
      </p>
    </div>
  );
}
