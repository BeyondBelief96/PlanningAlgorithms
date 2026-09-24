// The moving body.
//
// Part of the *given* library.  The reference point of every Pose in the
// capstone is the **main gear centre**, because that is what a taxi guidance
// controller actually tracks: keeping the main gear centre on the centreline is
// what keeps the aeroplane on the pavement through a turn.
//
// Note that this is a different, much richer aeroplane than Part 1's, which had
// three numbers and a name.  Part 1 routed a point along lines; the capstone
// sweeps a shape along a curve, and twenty numbers is what that costs.

import {
  add,
  forwardOf,
  leftOf,
  makeCounterClockwise,
  type Polygon,
  type Pose,
  scale,
  sub,
  type Vec2,
} from './geometry.js';

export interface AircraftModel {
  readonly type: string;
  /** ICAO Annex 14 aerodrome reference code letter. */
  readonly icaoCode: string;

  /** Tip to tip. */
  readonly wingspan: number;
  /** Along the fuselage, main gear centre forward. */
  readonly noseToMainGear: number;
  /** Main gear centre to the tail. */
  readonly mainGearToTail: number;
  /** Lateral separation of the two main gears. */
  readonly mainGearTrack: number;
  /** Nose gear ahead of the main gear centre. */
  readonly noseGearAhead: number;
  /** Of the main gear centre, at taxi speed. */
  readonly minTurnRadius: number;
  /** What a pilot would actually use. */
  readonly preferredRadius: number;

  // Uncertainty and margin, all metres.  Step 1 shrinks the allowed polygons by
  // the sum of these so that a point test becomes a configuration-space test.
  readonly navigationError: number;
  readonly mapError: number;
  readonly gearMargin: number;

  // ICAO Annex 14 wingtip separation.  Aprons get the larger number.
  readonly wingtipMargin: number;
  readonly apronWingtipMargin: number;

  /** m/s^2, what makes a turn comfortable. */
  readonly maxLateralAccel: number;
  /** m/s^2, normal service braking. */
  readonly maxDecel: number;
}

// Key footprint points, in world coordinates, for a pose of the main gear
// centre.  These are the points Step 3 and Step 9 test against the zone layer.

export function mainGearCentre(_ac: AircraftModel, pose: Pose): Vec2 {
  return pose.p;
}

export function noseGear(ac: AircraftModel, pose: Pose): Vec2 {
  return add(pose.p, scale(forwardOf(pose), ac.noseGearAhead));
}

export function leftMainGear(ac: AircraftModel, pose: Pose): Vec2 {
  return add(pose.p, scale(leftOf(pose), 0.5 * ac.mainGearTrack));
}

export function rightMainGear(ac: AircraftModel, pose: Pose): Vec2 {
  return sub(pose.p, scale(leftOf(pose), 0.5 * ac.mainGearTrack));
}

export function noseTip(ac: AircraftModel, pose: Pose): Vec2 {
  return add(pose.p, scale(forwardOf(pose), ac.noseToMainGear));
}

export function tailTip(ac: AircraftModel, pose: Pose): Vec2 {
  return sub(pose.p, scale(forwardOf(pose), ac.mainGearToTail));
}

export function leftWingtip(ac: AircraftModel, pose: Pose): Vec2 {
  return add(pose.p, scale(leftOf(pose), 0.5 * ac.wingspan));
}

export function rightWingtip(ac: AircraftModel, pose: Pose): Vec2 {
  return sub(pose.p, scale(leftOf(pose), 0.5 * ac.wingspan));
}

/** Nose, both wingtips, tail -- the outline the wing sweeps over. */
export function footprintOf(ac: AircraftModel, pose: Pose): Polygon {
  // Nose, right wingtip, tail, left wingtip: a diamond that contains the
  // fuselage and both wings.  Crude, and deliberately conservative.
  return makeCounterClockwise([
    noseTip(ac, pose),
    rightWingtip(ac, pose),
    tailTip(ac, pose),
    leftWingtip(ac, pose),
  ]);
}

/** Just the three tyres, which is what has to stay on load-bearing pavement. */
export function gearPoints(ac: AircraftModel, pose: Pose): Vec2[] {
  return [noseGear(ac, pose), leftMainGear(ac, pose), rightMainGear(ac, pose)];
}

/**
 * The total margin a polygon must be shrunk by before a gear point test is a
 * valid configuration-space test.
 */
export function gearInflation(ac: AircraftModel): number {
  return ac.navigationError + ac.mapError + ac.gearMargin;
}

export function totalLength(ac: AircraftModel): number {
  return ac.noseToMainGear + ac.mainGearToTail;
}

// --- the three aeroplanes the capstone flies --------------------------------

/** Code C, the workhorse. */
export function a320(): AircraftModel {
  return {
    type: 'A320',
    icaoCode: 'C',
    wingspan: 35.8,
    noseToMainGear: 12.6,
    mainGearToTail: 25.0,
    mainGearTrack: 7.6,
    noseGearAhead: 12.6,
    minTurnRadius: 20.0,
    preferredRadius: 45.0,
    navigationError: 1.5,
    mapError: 1.0,
    gearMargin: 1.5,
    wingtipMargin: 4.5,
    apronWingtipMargin: 7.5,
    maxLateralAccel: 0.8,
    maxDecel: 1.0,
  };
}

/** Code C but small: fits where the A320 does not. */
export function dash8(): AircraftModel {
  return {
    ...a320(),
    type: 'DH8D',
    icaoCode: 'C',
    wingspan: 28.4,
    noseToMainGear: 9.5,
    mainGearToTail: 23.0,
    mainGearTrack: 7.9,
    noseGearAhead: 9.5,
    minTurnRadius: 15.0,
    preferredRadius: 30.0,
    wingtipMargin: 4.5,
    apronWingtipMargin: 7.5,
  };
}

/** Code E: too wide for the capstone taxiways. */
export function b777(): AircraftModel {
  return {
    ...a320(),
    type: 'B77W',
    icaoCode: 'E',
    wingspan: 64.8,
    noseToMainGear: 26.0,
    mainGearToTail: 48.0,
    mainGearTrack: 12.9,
    noseGearAhead: 26.0,
    minTurnRadius: 32.0,
    preferredRadius: 60.0,
    wingtipMargin: 7.5,
    apronWingtipMargin: 10.5,
  };
}
