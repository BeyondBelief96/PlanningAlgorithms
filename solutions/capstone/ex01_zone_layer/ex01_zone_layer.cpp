// Reference solution -- Exercise 01: the zone layer (Step 1).
//
// Three queries, and the whole capstone leans on them.  zoneAt() is called
// hundreds of thousands of times by the sweep check and by hybrid A*, so the
// broadphase matters; classifyFootprint() is what Step 3 localizes with; and
// configurationSpace() is the trick that turns a footprint test into a point
// test, which is what makes the free-space search affordable at all.
#include <algorithm>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

ZoneQuery zoneAt(const ZoneLayer& layer, const Vec2& p) {
  ZoneQuery query;
  int best = -1;
  for (int id : layer.candidates(p)) {
    const ZonePolygon& poly = layer.polygon(id);
    if (!polygonContains(poly.outline, p)) continue;

    // Overlays are flags, not geometry.  A hotspot painted over a taxiway
    // leaves it a taxiway; it just costs more and is driven more slowly.
    if (poly.hotspot) query.hotspot = true;
    if (poly.closed) query.closed = true;
    if (poly.overlay) continue;

    const int priority = zonePriority(poly.zone);
    if (priority <= best) continue;
    best = priority;
    query.zone = poly.zone;
    query.polygonId = id;
  }
  return query;
}

FootprintZones classifyFootprint(const ZoneLayer& layer, const AircraftModel& aircraft,
                                 const Pose& pose) {
  FootprintZones f;
  f.reference = zoneAt(layer, pose.p);
  f.noseGear = zoneAt(layer, aircraft.noseGear(pose));
  f.leftMainGear = zoneAt(layer, aircraft.leftMainGear(pose));
  f.rightMainGear = zoneAt(layer, aircraft.rightMainGear(pose));
  f.leftWingtip = zoneAt(layer, aircraft.leftWingtip(pose));
  f.rightWingtip = zoneAt(layer, aircraft.rightWingtip(pose));

  const ZoneQuery gear[3] = {f.noseGear, f.leftMainGear, f.rightMainGear};
  f.allGearLoadBearing = true;
  f.gearConsistent = true;
  for (const ZoneQuery& g : gear) {
    if (!policyFor(g.zone).loadBearing) f.allGearLoadBearing = false;
    if (g.zone != gear[0].zone) f.gearConsistent = false;
  }
  f.gearZone = f.gearConsistent ? gear[0].zone : ZoneClass::Unknown;

  f.wingtipViolation = policyFor(f.leftWingtip.zone).wingtipForbidden ||
                       policyFor(f.rightWingtip.zone).wingtipForbidden;
  return f;
}

ZoneLayer configurationSpace(const ZoneLayer& layer, const AircraftModel& aircraft) {
  ZoneLayer out;
  out.setName(layer.name() + " (C-space)");

  // Everything the gear may stand on shrinks by the combined error budget, so
  // that a point inside the shrunken polygon guarantees all three tyres are
  // inside the real one.  Everything the aircraft must stay out of grows,
  // by the gear budget for shoulders and by half a wingspan plus separation
  // for structures.
  const double gearMargin = aircraft.gearInflation();
  const double wingMargin = 0.5 * aircraft.wingspan + aircraft.wingtipMargin;

  for (const ZonePolygon& poly : layer.polygons()) {
    ZonePolygon copy = poly;
    if (poly.overlay) {
      // Overlays carry no clearance meaning, so they keep their shape.
      out.add(std::move(copy));
      continue;
    }

    const ZonePolicy policy = policyFor(poly.zone);
    double delta = 0.0;
    if (policy.wingtipForbidden)
      delta = wingMargin;
    else if (policy.loadBearing)
      delta = -gearMargin;
    else if (poly.zone == ZoneClass::Shoulder)
      delta = gearMargin;

    if (delta != 0.0) {
      copy.outline = offsetConvex(poly.outline, delta);
      // A polygon that collapses is one this aircraft simply does not fit in.
      if (copy.outline.empty()) continue;
    }
    out.add(std::move(copy));
  }

  // Holding positions are lines, not areas: they do not move.
  for (const HoldShortLine& line : layer.holdShortLines()) out.addHoldShort(line);
  out.build();
  return out;
}

}  // namespace planning::airport
