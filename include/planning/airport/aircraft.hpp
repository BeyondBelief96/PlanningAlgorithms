// aircraft.hpp -- the moving body.
//
// Part of the *given* library.  The reference point of every Pose in the
// capstone is the **main gear centre**, because that is what a taxi guidance
// controller actually tracks: keeping the main gear centre on the centreline is
// what keeps the aeroplane on the pavement through a turn.
#pragma once

#include <string>
#include <vector>

#include "planning/airport/geometry.hpp"

namespace planning::airport {

struct AircraftModel {
  std::string type = "A320";
  char icaoCode = 'C';  // ICAO Annex 14 aerodrome reference code letter

  double wingspan = 35.8;         // tip to tip
  double noseToMainGear = 12.6;   // along the fuselage, main gear centre forward
  double mainGearToTail = 25.0;   // main gear centre to the tail
  double mainGearTrack = 7.6;     // lateral separation of the two main gears
  double noseGearAhead = 12.6;    // nose gear ahead of the main gear centre
  double minTurnRadius = 20.0;    // of the main gear centre, at taxi speed
  double preferredRadius = 45.0;  // what a pilot would actually use

  // Uncertainty and margin, all metres.  Step 1 shrinks the allowed polygons by
  // the sum of these so that a point test becomes a configuration-space test.
  double navigationError = 1.5;
  double mapError = 1.0;
  double gearMargin = 1.5;

  // ICAO Annex 14 wingtip separation.  Aprons get the larger number.
  double wingtipMargin = 4.5;
  double apronWingtipMargin = 7.5;

  double maxLateralAccel = 0.8;  // m/s^2, what makes a turn comfortable
  double maxDecel = 1.0;         // m/s^2, normal service braking

  // Key footprint points, in world coordinates, for a pose of the main gear
  // centre.  These are the points Step 3 and Step 9 test against the zone layer.
  Vec2 mainGearCentre(const Pose& pose) const { return pose.p; }
  Vec2 noseGear(const Pose& pose) const;
  Vec2 leftMainGear(const Pose& pose) const;
  Vec2 rightMainGear(const Pose& pose) const;
  Vec2 noseTip(const Pose& pose) const;
  Vec2 tailTip(const Pose& pose) const;
  Vec2 leftWingtip(const Pose& pose) const;
  Vec2 rightWingtip(const Pose& pose) const;

  // Nose, both wingtips, tail -- the outline the wing sweeps over.
  Polygon footprint(const Pose& pose) const;
  // Just the three tyres, which is what has to stay on load-bearing pavement.
  std::vector<Vec2> gearPoints(const Pose& pose) const;
  // The total margin a polygon must be shrunk by before a gear point test is
  // a valid configuration-space test.
  double gearInflation() const { return navigationError + mapError + gearMargin; }

  double totalLength() const { return noseToMainGear + mainGearToTail; }
};

AircraftModel a320();   // code C, the workhorse
AircraftModel dash8();  // code C but small: fits where the A320 does not
AircraftModel b777();   // code E: too wide for the capstone taxiways

}  // namespace planning::airport
