// Reference solution -- Exercise 03: localization and start mode (Step 3).
//
// The reference point of a Pose is the main gear centre, but the zone the
// aircraft is *in* is decided by all three tyres.  Testing only the reference
// point is the single most common way to write a planner that taxis a wingtip
// through a jet bridge.
#include <cmath>
#include <limits>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

StartMode modeForZone(ZoneClass zone) {
  switch (zone) {
    case ZoneClass::Stand:
      return StartMode::Stand;
    case ZoneClass::Apron:
    case ZoneClass::DeIcing:
      return StartMode::Apron;
    case ZoneClass::Taxiway:
      return StartMode::TaxiwayCapture;
    // A protected area is treated as runway: no free-space planning at all.
    case ZoneClass::Runway:
    case ZoneClass::RunwayProtected:
      return StartMode::Runway;
    default:
      return StartMode::Fault;
  }
}

bool zoneMatches(ZoneClass edgeZone, ZoneClass startZone, StartMode mode) {
  if (edgeZone == startZone) return true;
  // A stand is reached from the apron, and the stand lead-out line runs into
  // it, so a stand start may also look at apron taxilanes.
  if (mode == StartMode::Stand && edgeZone == ZoneClass::Apron) return true;
  if (mode == StartMode::Runway &&
      (edgeZone == ZoneClass::Runway || edgeZone == ZoneClass::RunwayProtected))
    return true;
  return false;
}

// How far inside its own zone polygon the whole footprint sits.  Zero when any
// key point is outside.  This is what the hysteresis test is made of.
double depthInZone(const ZoneLayer& layer, const AircraftModel& aircraft, const Pose& pose,
                   ZoneClass zone) {
  double depth = std::numeric_limits<double>::infinity();
  for (const Vec2& g : aircraft.gearPoints(pose)) {
    const ZoneQuery q = zoneAt(layer, g);
    if (q.zone != zone || q.polygonId < 0) return 0.0;
    depth = std::min(depth, distanceToBoundary(layer.polygon(q.polygonId).outline, g));
  }
  return depth;
}

}  // namespace

const char* toString(StartMode mode) {
  switch (mode) {
    case StartMode::Stand:
      return "stand";
    case StartMode::Apron:
      return "apron";
    case StartMode::TaxiwayCapture:
      return "taxiway capture";
    case StartMode::Runway:
      return "runway";
    case StartMode::Fault:
      return "fault";
  }
  return "fault";
}

Localization localize(const ZoneLayer& layer, const TaxiGraph& gated, const AircraftModel& aircraft,
                      const Pose& pose, const Localization* previous) {
  Localization loc;
  loc.pose = pose;
  loc.footprint = classifyFootprint(layer, aircraft, pose);
  const FootprintZones& f = loc.footprint;

  if (f.wingtipViolation) {
    loc.detail = "a wingtip is inside a structure";
    return loc;  // Fault
  }
  if (!f.allGearLoadBearing) {
    loc.detail = "gear is off load-bearing pavement";
    return loc;
  }
  if (!f.gearConsistent) {
    loc.detail = std::string("gear straddles ") + toString(f.noseGear.zone) + " and " +
                 toString(f.leftMainGear.zone != f.noseGear.zone ? f.leftMainGear.zone
                                                                 : f.rightMainGear.zone);
    return loc;
  }

  loc.zone = f.gearZone;
  loc.polygonId = f.noseGear.polygonId;
  loc.mode = modeForZone(loc.zone);
  if (loc.mode == StartMode::Fault) {
    loc.detail = std::string("zone ") + toString(loc.zone) + " is not a place to start from";
    return loc;
  }

  // Hysteresis.  A boundary crossing only takes effect once the footprint is
  // properly inside the new zone, otherwise a metre of position noise makes the
  // mode flip between apron and taxiway on successive replans.
  if (previous != nullptr && previous->mode != StartMode::Fault && previous->mode != loc.mode &&
      depthInZone(layer, aircraft, pose, loc.zone) < kModeHysteresis) {
    loc.mode = previous->mode;
    loc.zone = previous->zone;
    loc.detail = "holding the previous mode (within the hysteresis band)";
  }

  // The nearest guidance line that belongs to this zone.
  double best = std::numeric_limits<double>::infinity();
  for (const Edge& e : gated.edges()) {
    if (!zoneMatches(e.zone, loc.zone, loc.mode)) continue;
    const DirectedEdge forward{e.id, true};
    const double s = gated.projectOnto(forward, pose.p);
    const double d = distance(gated.poseAlong(forward, s).p, pose.p);
    if (d >= best) continue;
    best = d;
    loc.nearestEdge = forward;
    loc.nearestS = s;
  }

  if (loc.nearestEdge.valid()) {
    // Which way along it?  In stand mode, always the way that leads *out* of
    // the stand -- that is what makes a nose-in parking position detectable.
    const DirectedEdge reversed = loc.nearestEdge.reversed();
    if (loc.mode == StartMode::Stand) {
      const ZoneQuery here = zoneAt(layer, pose.p);
      const Vec2 centre =
          here.polygonId >= 0 ? centroidOf(layer.polygon(here.polygonId).outline) : pose.p;
      if (distance(gated.headPoint(loc.nearestEdge), centre) <
          distance(gated.tailPoint(loc.nearestEdge), centre)) {
        loc.nearestEdge = reversed;
        loc.nearestS = gated.length(loc.nearestEdge.edge) - loc.nearestS;
      }
    } else if (std::fabs(wrapAngle(gated.heading(reversed) - pose.heading)) <
               std::fabs(wrapAngle(gated.heading(loc.nearestEdge) - pose.heading))) {
      loc.nearestEdge = reversed;
      loc.nearestS = gated.length(loc.nearestEdge.edge) - loc.nearestS;
    }

    const Pose line = gated.poseAlong(loc.nearestEdge, loc.nearestS);
    loc.crossTrack = crossTrack(line, pose.p);
    loc.headingError = wrapAngle(pose.heading - line.heading);
    loc.onGuidanceLine =
        std::fabs(loc.crossTrack) <= 2.0 && std::fabs(loc.headingError) <= 10.0 * kPi / 180.0;
  }

  if (loc.detail.empty())
    loc.detail = std::string("in ") + toString(loc.zone) +
                 (loc.onGuidanceLine ? ", on the guidance line" : ", off the guidance line");
  return loc;
}

}  // namespace planning::airport
