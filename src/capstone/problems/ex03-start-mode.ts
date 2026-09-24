// Exercise 03 -- localization and start mode (Step 3).
// Brief: docs/capstone/ex03-start-mode.md

import {
  type AircraftModel,
  centroidOf,
  crossTrack,
  distanceToBoundary,
  type Pose,
  reversed,
  type TaxiGraph,
  wrapAngle,
  type ZoneLayer,
} from '../../airport/index.js';
import { emptyLocalization, type Localization, MODE_HYSTERESIS } from '../types.js';
import { classifyFootprint } from './ex01-zone-layer.js';

export function localize(
  layer: ZoneLayer,
  gated: TaxiGraph,
  aircraft: AircraftModel,
  pose: Pose,
  previous?: Localization,
): Localization {
  // TODO(you): where is the aeroplane, and what kind of planning does that
  // allow?  In order:
  //
  //   1  classifyFootprint().  A wingtip in a structure, a tyre off
  //      load-bearing pavement, or three tyres that disagree about the zone are
  //      each a Fault -- and each needs a `detail` a human can act on.
  //   2  The zone the three tyres agree on decides the mode.  A protected area
  //      counts as runway: no free-space planning between the holding position
  //      and the runway edge.
  //   3  Hysteresis.  If `previous` is given and the mode would change, only
  //      let it change once the whole footprint is MODE_HYSTERESIS metres
  //      inside the new zone.  Without this, a metre of position noise flips
  //      the planner between apron and taxiway on successive replans.
  //   4  The nearest guidance line *of this zone*, and which way along it.  In
  //      stand mode that is always the way that leads OUT of the stand -- which
  //      is what makes a nose-in parking position show up as a 180 degree
  //      heading error rather than as a separate flag.
  //   5  crossTrack, headingError, and whether that is inside the capture
  //      window (2 m and 10 degrees).
  void layer;
  void gated;
  void aircraft;
  void previous;
  void classifyFootprint;
  void MODE_HYSTERESIS;
  void centroidOf;
  void crossTrack;
  void distanceToBoundary;
  void reversed;
  void wrapAngle;
  return emptyLocalization(pose);
}
