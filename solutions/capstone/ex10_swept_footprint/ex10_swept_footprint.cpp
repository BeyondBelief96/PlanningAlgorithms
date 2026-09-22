// Reference solution -- Exercise 10: validating the swept footprint (Step 9).
//
// Up to here the planner has reasoned about a *curve*.  This is the first and
// only place it reasons about the *aeroplane*.  Four checks, in the order they
// matter: the tyres are on pavement that carries weight, the wings are clear of
// structures, no part of the outline crosses a holding position it has no
// clearance to cross, and the off-graph part never left the zone it started in.
#include <algorithm>
#include <cmath>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

bool authorizedRunway(const std::vector<std::string>& idents,
                      const std::set<std::string>& enterable) {
  // A runway has two identifiers for one strip: naming either one opens it.
  for (const std::string& id : idents)
    if (enterable.count(id) != 0) return true;
  return false;
}

bool sameZoneFamily(ZoneClass zone, ZoneClass startZone) {
  if (zone == startZone) return true;
  // Rolling out of a stand onto the apron is the one permitted free-space
  // zone change, because the stand exists to be left.
  if (startZone == ZoneClass::Stand && zone == ZoneClass::Apron) return true;
  return false;
}

}  // namespace

const char* toString(SweepViolation::Kind kind) {
  switch (kind) {
    case SweepViolation::Kind::GearOffPavement:
      return "gear off pavement";
    case SweepViolation::Kind::GearOnShoulder:
      return "gear on a shoulder";
    case SweepViolation::Kind::LeftStartZone:
      return "left the start zone off-graph";
    case SweepViolation::Kind::WingtipConflict:
      return "wingtip conflict";
    case SweepViolation::Kind::HoldShortCrossed:
      return "holding position crossed";
    case SweepViolation::Kind::RunwayEntered:
      return "runway entered";
  }
  return "violation";
}

SweepResult validateSweep(const ZoneLayer& layer, const AircraftModel& aircraft, const Path& path,
                          ZoneClass startZone, const PermissionSet& permissions, bool offGraph) {
  SweepResult result;
  if (path.empty()) {
    // A capture-window merge plans no motion at all, and there is nothing to
    // sweep.  That is a pass, not a failure.
    result.ok = true;
    return result;
  }

  const double wingMargin = (startZone == ZoneClass::Apron || startZone == ZoneClass::Stand)
                                ? aircraft.apronWingtipMargin
                                : aircraft.wingtipMargin;
  const auto add = [&](SweepViolation::Kind kind, double s, std::string what) {
    result.violations.push_back(SweepViolation{kind, s, std::move(what)});
  };

  for (double s = 0.0; s <= path.length() + 1e-9; s += kSweepStep) {
    const PathSample sample = path.at(s);
    const Pose pose{sample.p, sample.heading};

    // 1. Gear tracks stay on load-bearing pavement of the right zone.
    for (const Vec2& tyre : aircraft.gearPoints(pose)) {
      const ZoneQuery q = zoneAt(layer, tyre);
      if (q.zone == ZoneClass::Shoulder) {
        add(SweepViolation::Kind::GearOnShoulder, s, "a tyre rolled onto a taxiway shoulder");
      } else if (!policyFor(q.zone).loadBearing) {
        add(SweepViolation::Kind::GearOffPavement, s,
            std::string("a tyre is on ") + toString(q.zone));
      } else if (offGraph && !sameZoneFamily(q.zone, startZone)) {
        add(SweepViolation::Kind::LeftStartZone, s,
            std::string("off-graph motion reached ") + toString(q.zone));
      }
    }

    // 2. Wingtip envelope clear of structures, by ICAO separation.
    for (const Vec2& tip : {aircraft.leftWingtip(pose), aircraft.rightWingtip(pose)}) {
      Aabb box;
      box.extend(tip);
      for (int id : layer.candidates(box.grown(wingMargin))) {
        const ZonePolygon& poly = layer.polygon(id);
        if (poly.overlay || !policyFor(poly.zone).wingtipForbidden) continue;
        if (distanceOutsidePolygon(poly.outline, tip) < wingMargin)
          add(SweepViolation::Kind::WingtipConflict, s,
              "wingtip within " + std::to_string(static_cast<int>(wingMargin)) + " m of " +
                  poly.name);
      }
    }

    // 3. No part of the outline crosses a holding position, or enters a runway
    //    or protected area, without a clearance that names it.  Tested against
    //    the swept outline, not the centreline.
    const Polygon outline = aircraft.footprint(pose);
    const Aabb box = boundsOf(outline);
    for (int id : layer.holdShortCandidates(box)) {
      const HoldShortLine& line = layer.holdShortLine(id);
      if (authorizedRunway(line.protects, permissions.enterableRunways)) continue;
      if (segmentIntersectsPolygon(outline, line.segment))
        add(SweepViolation::Kind::HoldShortCrossed, s, "the outline crosses " + line.name);
    }
    for (int id : layer.candidates(box)) {
      const ZonePolygon& poly = layer.polygon(id);
      if (poly.overlay) continue;
      if (poly.zone != ZoneClass::Runway && poly.zone != ZoneClass::RunwayProtected) continue;
      if (authorizedRunway(poly.idents, permissions.enterableRunways)) continue;
      if (polygonsOverlap(outline, poly.outline))
        add(SweepViolation::Kind::RunwayEntered, s, "the outline entered " + poly.name);
    }
  }

  // The same violation repeats at every sample of a long stretch; one report
  // per kind and message is enough to act on.
  std::sort(result.violations.begin(), result.violations.end(),
            [](const SweepViolation& a, const SweepViolation& b) {
              if (a.what != b.what) return a.what < b.what;
              return a.s < b.s;
            });
  result.violations.erase(std::unique(result.violations.begin(), result.violations.end(),
                                      [](const SweepViolation& a, const SweepViolation& b) {
                                        return a.what == b.what;
                                      }),
                          result.violations.end());
  std::sort(result.violations.begin(), result.violations.end(),
            [](const SweepViolation& a, const SweepViolation& b) { return a.s < b.s; });

  result.ok = result.violations.empty();
  return result;
}

}  // namespace planning::airport
