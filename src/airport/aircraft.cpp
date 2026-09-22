// aircraft.cpp -- the given aircraft models and their footprint geometry.
#include "planning/airport/aircraft.hpp"

namespace planning::airport {

Vec2 AircraftModel::noseGear(const Pose& pose) const {
  return pose.p + pose.forward() * noseGearAhead;
}

Vec2 AircraftModel::leftMainGear(const Pose& pose) const {
  return pose.p + pose.left() * (0.5 * mainGearTrack);
}

Vec2 AircraftModel::rightMainGear(const Pose& pose) const {
  return pose.p - pose.left() * (0.5 * mainGearTrack);
}

Vec2 AircraftModel::noseTip(const Pose& pose) const {
  return pose.p + pose.forward() * noseToMainGear;
}

Vec2 AircraftModel::tailTip(const Pose& pose) const {
  return pose.p - pose.forward() * mainGearToTail;
}

Vec2 AircraftModel::leftWingtip(const Pose& pose) const {
  return pose.p + pose.left() * (0.5 * wingspan);
}

Vec2 AircraftModel::rightWingtip(const Pose& pose) const {
  return pose.p - pose.left() * (0.5 * wingspan);
}

Polygon AircraftModel::footprint(const Pose& pose) const {
  // Nose, right wingtip, tail, left wingtip: a diamond that contains the
  // fuselage and both wings.  Crude, and deliberately conservative.
  return makeCounterClockwise(
      Polygon{noseTip(pose), rightWingtip(pose), tailTip(pose), leftWingtip(pose)});
}

std::vector<Vec2> AircraftModel::gearPoints(const Pose& pose) const {
  return {noseGear(pose), leftMainGear(pose), rightMainGear(pose)};
}

AircraftModel a320() { return AircraftModel{}; }

AircraftModel dash8() {
  AircraftModel m;
  m.type = "DH8D";
  m.icaoCode = 'C';
  m.wingspan = 28.4;
  m.noseToMainGear = 9.5;
  m.mainGearToTail = 23.0;
  m.mainGearTrack = 7.9;
  m.noseGearAhead = 9.5;
  m.minTurnRadius = 15.0;
  m.preferredRadius = 30.0;
  m.wingtipMargin = 4.5;
  m.apronWingtipMargin = 7.5;
  return m;
}

AircraftModel b777() {
  AircraftModel m;
  m.type = "B77W";
  m.icaoCode = 'E';
  m.wingspan = 64.8;
  m.noseToMainGear = 26.0;
  m.mainGearToTail = 48.0;
  m.mainGearTrack = 12.9;
  m.noseGearAhead = 26.0;
  m.minTurnRadius = 32.0;
  m.preferredRadius = 60.0;
  m.wingtipMargin = 7.5;
  m.apronWingtipMargin = 10.5;
  return m;
}

}  // namespace planning::airport
