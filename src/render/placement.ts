// Turns a lawful display into placed lights on an idealized hull.
// Coordinates: fx fore-aft in [-1, 1] (bow = +1), py athwartships
// (starboard = +), z height above waterline (normalized). Idealized
// placement is fine per the design doc; arcs come verbatim from
// lights.json and are the exam-faithful part.

import { lights as lightsData } from '../data/colregs';
import type { Arc, DisplayLight, FactRecord } from '../engine/types';
import type { HullSpec } from './hulls';

export interface PlacedLight {
  key: string;
  lightId: string;
  color: string;
  character: 'steady' | 'flashing';
  arc: Arc | null;
  fx: number;
  py: number;
  z: number;
  sourceEntry: string;
  combined?: boolean;
  ifPracticable?: boolean;
}

const STACK_DZ = 0.13;

function arcOf(lightId: string): Arc | null {
  return lightsData.lights[lightId]?.arc ?? null;
}

function characterOf(dl: DisplayLight): 'steady' | 'flashing' {
  const c = dl.spec.character ?? lightsData.lights[dl.spec.light]?.character;
  return c === 'flashing' ? 'flashing' : 'steady';
}

/**
 * Place every light of a display on the given hull. Deterministic; the
 * same display always renders the same scene.
 */
export function placeLights(
  displayLights: DisplayLight[],
  hull: HullSpec,
  facts: FactRecord,
): PlacedLight[] {
  const placed: PlacedLight[] = [];
  // all-round stacks share the mast; track occupancy so 27(b)(i)'s
  // red-white-red and an anchor light don't collide. Forward masthead
  // lights claim the top of the column first, whatever the entry order.
  let mastStackTop = hull.mastTopZ;
  for (const dl of displayLights) {
    if (
      dl.spec.light === 'light:masthead' &&
      !dl.spec.position?.includes('abaft')
    ) {
      mastStackTop = Math.min(
        mastStackTop,
        hull.mastTopZ - (dl.spec.count ?? 1) * STACK_DZ,
      );
    }
  }
  const ifPract = (dl: DisplayLight) =>
    dl.modality === 'shall-if-practicable' || undefined;

  // sort: identity stacks (upper/middle/lower) first so they take the
  // masthead region top-down in their declared order.
  const ordered = [...displayLights].sort((a, b) => {
    const rank = (l: DisplayLight) =>
      l.spec.position?.includes('upper')
        ? 0
        : l.spec.position?.includes('middle')
          ? 1
          : l.spec.position?.includes('lower')
            ? 2
            : 3;
    return rank(a) - rank(b);
  });

  for (const dl of ordered) {
    const { spec } = dl;
    const key = `${dl.sourceEntry}:${spec.light}:${spec.position ?? ''}:${spec.color ?? ''}`;
    const base = {
      sourceEntry: dl.sourceEntry,
      character: characterOf(dl),
      ifPracticable: ifPract(dl),
    };

    switch (spec.light) {
      case 'light:sidelights': {
        if (spec.combined) {
          // tricolor's sidelight halves, combined at the masthead
          placed.push(
            {
              ...base,
              key: key + ':stbd',
              lightId: 'light:sidelight_starboard',
              color: 'green',
              arc: arcOf('light:sidelight_starboard'),
              fx: hull.mastX,
              py: 0.02,
              z: hull.mastTopZ + 0.06,
              combined: true,
            },
            {
              ...base,
              key: key + ':port',
              lightId: 'light:sidelight_port',
              color: 'red',
              arc: arcOf('light:sidelight_port'),
              fx: hull.mastX,
              py: -0.02,
              z: hull.mastTopZ + 0.06,
              combined: true,
            },
          );
        } else {
          placed.push(
            {
              ...base,
              key: key + ':stbd',
              lightId: 'light:sidelight_starboard',
              color: 'green',
              arc: arcOf('light:sidelight_starboard'),
              fx: hull.sideLightX,
              py: hull.beam,
              z: hull.sideLightZ,
            },
            {
              ...base,
              key: key + ':port',
              lightId: 'light:sidelight_port',
              color: 'red',
              arc: arcOf('light:sidelight_port'),
              fx: hull.sideLightX,
              py: -hull.beam,
              z: hull.sideLightZ,
            },
          );
        }
        break;
      }

      case 'light:sternlight': {
        const combined = spec.combined;
        placed.push({
          ...base,
          key,
          lightId: 'light:sternlight',
          color: 'white',
          arc: arcOf('light:sternlight'),
          fx: combined ? hull.mastX : hull.sternX,
          py: 0,
          z: combined ? hull.mastTopZ + 0.06 : hull.sternZ,
          combined,
        });
        break;
      }

      case 'light:towing': {
        placed.push({
          ...base,
          key,
          lightId: 'light:towing',
          color: 'yellow',
          arc: arcOf('light:towing'),
          fx: hull.sternX,
          py: 0,
          z: hull.sternZ + STACK_DZ,
        });
        break;
      }

      case 'light:masthead': {
        const abaft = spec.position?.includes('abaft');
        const count = spec.count ?? 1;
        if (abaft) {
          placed.push({
            ...base,
            key,
            lightId: 'light:masthead',
            color: 'white',
            arc: arcOf('light:masthead'),
            fx: hull.aftMastX,
            py: 0,
            z: hull.aftMastTopZ,
          });
        } else {
          // one, two or three in a vertical line at the foremast
          for (let i = 0; i < count; i++) {
            placed.push({
              ...base,
              key: `${key}:${i}`,
              lightId: 'light:masthead',
              color: 'white',
              arc: arcOf('light:masthead'),
              fx: hull.mastX,
              py: 0,
              z: hull.mastTopZ - i * STACK_DZ,
            });
          }
          mastStackTop = Math.min(
            mastStackTop,
            hull.mastTopZ - count * STACK_DZ,
          );
        }
        break;
      }

      case 'light:all_round': {
        const count = spec.count ?? 1;
        const pos = spec.position ?? '';
        const arc = arcOf('light:all_round');
        if (pos.includes('side on which')) {
          // 27(d): pairs on the obstruction / clear side
          const obstructionPort =
            facts['fact:obstruction_side'] === 'obstruction_side:port';
          const isObstruction = spec.color === 'red';
          const side = isObstruction === obstructionPort ? -1 : 1;
          for (let i = 0; i < count; i++) {
            placed.push({
              ...base,
              key: `${key}:${i}`,
              lightId: 'light:all_round',
              color: spec.color ?? 'white',
              arc,
              fx: hull.mastX - 0.12,
              py: side * hull.beam * 1.5,
              z: hull.mastTopZ * 0.55 - i * STACK_DZ,
            });
          }
          break;
        }
        if (pos.includes('fore yard')) {
          // 27(f): one near the foremast head, one at each fore yard end
          placed.push(
            {
              ...base,
              key: key + ':head',
              lightId: 'light:all_round',
              color: spec.color ?? 'green',
              arc,
              fx: hull.mastX,
              py: 0,
              z: mastStackTop,
            },
            {
              ...base,
              key: key + ':yard-s',
              lightId: 'light:all_round',
              color: spec.color ?? 'green',
              arc,
              fx: hull.mastX,
              py: hull.beam * 1.6,
              z: mastStackTop - STACK_DZ,
            },
            {
              ...base,
              key: key + ':yard-p',
              lightId: 'light:all_round',
              color: spec.color ?? 'green',
              arc,
              fx: hull.mastX,
              py: -hull.beam * 1.6,
              z: mastStackTop - STACK_DZ,
            },
          );
          mastStackTop -= 2 * STACK_DZ;
          break;
        }
        if (pos.includes('fore part')) {
          // 30(a) forward anchor light
          placed.push({
            ...base,
            key,
            lightId: 'light:all_round',
            color: spec.color ?? 'white',
            arc,
            fx: hull.bowX - 0.08,
            py: 0,
            z: hull.sideLightZ + 0.18,
          });
          break;
        }
        if (pos.includes('stern')) {
          // 30(a) after anchor light, lower than the fore one
          placed.push({
            ...base,
            key,
            lightId: 'light:all_round',
            color: spec.color ?? 'white',
            arc,
            fx: hull.sternX + 0.06,
            py: 0,
            z: hull.sternZ + 0.08,
          });
          break;
        }
        if (pos.includes('direction of the gear')) {
          // 26(c)(ii): white toward the outlying gear — render to starboard
          placed.push({
            ...base,
            key,
            lightId: 'light:all_round',
            color: spec.color ?? 'white',
            arc,
            fx: hull.mastX + 0.18,
            py: hull.beam,
            z: hull.mastTopZ * 0.45,
          });
          break;
        }
        // default: vertical stack on the mast, in declared order
        for (let i = 0; i < count; i++) {
          placed.push({
            ...base,
            key: `${key}:${i}`,
            lightId: 'light:all_round',
            color: spec.color ?? 'white',
            arc,
            fx: hull.mastX,
            py: 0,
            z: mastStackTop - i * STACK_DZ,
          });
        }
        mastStackTop -= count * STACK_DZ;
        break;
      }

      case 'light:flashing': {
        placed.push({
          ...base,
          key,
          lightId: 'light:flashing',
          color: spec.color ?? 'white',
          arc: arcOf('light:flashing'),
          fx: hull.mastX,
          py: 0,
          z: mastStackTop,
          character: 'flashing',
        });
        mastStackTop -= STACK_DZ;
        break;
      }

      case 'light:torch': {
        placed.push({
          ...base,
          key,
          lightId: 'light:torch',
          color: 'white',
          arc: null,
          fx: hull.sternX + 0.25,
          py: 0.08,
          z: hull.sideLightZ + 0.12,
        });
        break;
      }

      case 'light:deck_lights': {
        placed.push({
          ...base,
          key,
          lightId: 'light:deck_lights',
          color: 'white',
          arc: null,
          fx: (hull.mastX + hull.sternX) / 2,
          py: 0,
          z: hull.sideLightZ + 0.1,
        });
        break;
      }

      default: {
        // Unknown light id: render nothing rather than invent (the data
        // drawer still lists it). Should be unreachable for intl data.
        break;
      }
    }
  }
  return placed;
}

/**
 * Is a bearing inside an arc (degrees clockwise from right ahead)?
 * An arc whose from_deg exceeds its to_deg wraps through the bow
 * (lights.json bearing_convention), and 360 ≡ 0: the port sidelight's
 * 247.5–360.0 includes dead ahead. Boundaries are inclusive.
 */
export function bearingInArc(bearing: number, arc: Arc | null): boolean {
  if (arc === null) return true; // torch / deck lights: no prescribed arc
  const b = ((bearing % 360) + 360) % 360;
  const { from_deg: f, to_deg: t } = arc;
  let extent = t - f;
  if (extent <= 0) extent += 360;
  const rel = ((b - f) % 360 + 360) % 360;
  return rel <= extent;
}
