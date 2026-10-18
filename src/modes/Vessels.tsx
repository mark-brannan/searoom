// The traced vessels: every real sailing vessel nav-wright has lofted from a
// published drawing, each in the 3D bearing view lit as a sailing vessel of
// her own length. The list is nav-wright's `tracedVessels`; nothing here
// names a vessel.

import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { tracedVessels } from 'nav-wright';
import type { TracedVessel } from 'nav-wright';
import { selectHull } from 'nav-wright';
import { BearingModelView } from 'nav-wright/benchy';
import { lights as lightCatalog } from '../data/colregs';
import { evaluateDisplayIn } from '../engine/evaluate';
import type { FactRecord } from '../engine/types';
import { placeLights } from '../render/navWright';
import { shippedModelUrl } from '../render/hullModels';
import { useSceneLabels } from '../components/Scene';
import { useAppState } from '../state/store';

/** Her mesh URL, or undefined when nav-wright does not ship the file. */
export const vesselModelUrl = (v: TracedVessel) => shippedModelUrl(v.model);

/** Traced vessels by length, smallest first. */
export const vesselsByLength = [...tracedVessels].sort(
  (a, b) => a.loaM - b.loaM,
);

function Vessel({ vessel }: { vessel: TracedVessel }) {
  const intl = useIntl();
  const { jurisdiction } = useAppState();
  const labels = useSceneLabels();
  const [theta, setTheta] = useState(300);
  const [tilt, setTilt] = useState(12);
  const modelUrl = vesselModelUrl(vessel);
  const facts = useMemo(
    (): FactRecord => ({
      'fact:position': 'position:underway',
      'fact:making_way': true,
      'fact:propulsion': 'propulsion:sail',
      'fact:activity': 'activity:none',
      'fact:length_m': Math.round(vessel.loaM * 10) / 10,
    }),
    [vessel.loaM],
  );
  const hull = useMemo(() => selectHull(facts), [facts]);
  const placed = useMemo(() => {
    const display = evaluateDisplayIn(jurisdiction, facts).displays[0];
    return display
      ? placeLights(display.lights, hull.spec, facts, lightCatalog)
      : [];
  }, [jurisdiction, facts, hull]);
  return (
    <section className="vessel-card" id={vessel.id}>
      <h2>
        {vessel.name}
        {vessel.rig ? <span className="muted"> · {vessel.rig}</span> : null}
      </h2>
      <p className="muted">
        {intl.formatMessage(
          { id: 'vessels.dims' },
          {
            loa: vessel.loaM.toFixed(1),
            beam: vessel.beamM.toFixed(1),
            draft: vessel.draftM.toFixed(1),
          },
        )}
      </p>
      {modelUrl ? (
        <BearingModelView
          modelUrl={modelUrl}
          hull={hull}
          placed={placed}
          facts={facts}
          theta={theta}
          onTheta={setTheta}
          tilt={tilt}
          onTilt={setTilt}
          hullHint={1}
          sky={0.35}
          labels={labels}
        />
      ) : (
        <p role="status">
          <FormattedMessage id="vessels.noMesh" />
        </p>
      )}
    </section>
  );
}

export function Vessels() {
  return (
    <main className="vessels">
      <h2>
        <FormattedMessage id="vessels.title" />
      </h2>
      <p>
        <FormattedMessage
          id="vessels.intro"
          values={{ count: vesselsByLength.length }}
        />
      </p>
      {vesselsByLength.map((v) => (
        <Vessel key={v.id} vessel={v} />
      ))}
    </main>
  );
}
