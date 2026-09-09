// A small label interface for the scene views (BearingView, PlanView,
// ProfileView), so they can render without an app IntlProvider around
// them. English defaults live here; a consumer (searoom's Sandbox) wires
// its own react-intl catalog by building a SceneLabels from useIntl and
// passing it down.

export type Aspect =
  | 'ahead'
  | 'starboard-bow'
  | 'starboard-beam'
  | 'starboard-quarter'
  | 'astern'
  | 'port-quarter'
  | 'port-beam'
  | 'port-bow';

export interface SceneLabels {
  bearingAlt: (theta: number) => string;
  bearingNoLights: string;
  bearingThetaLabel: string;
  bearingThetaValue: (theta: number, aspect: string) => string;
  aspect: Record<Aspect, string>;
  planAlt: string;
  profileAlt: string;
}

export const defaultSceneLabels: SceneLabels = {
  bearingAlt: (theta) =>
    `Bearing view: her lights as seen from relative bearing ${theta} degrees`,
  bearingNoLights: 'No lights visible from this bearing',
  bearingThetaLabel: 'Relative bearing θ',
  bearingThetaValue: (theta, aspect) => `${theta} degrees, ${aspect}`,
  aspect: {
    ahead: 'seen from ahead',
    'starboard-bow': 'on her starboard bow',
    'starboard-beam': 'on her starboard beam',
    'starboard-quarter': 'on her starboard quarter',
    astern: 'seen from astern',
    'port-quarter': 'on her port quarter',
    'port-beam': 'on her port beam',
    'port-bow': 'on her port bow',
  },
  planAlt: "Plan view: each light's arc of visibility around the hull",
  profileAlt: 'Profile view: the vessel from abeam with her lights',
};
