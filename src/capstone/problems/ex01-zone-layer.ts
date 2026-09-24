// Exercise 01 -- the zone layer (Step 1).
// Brief: docs/capstone/ex01-zone-layer.md

import {
  type AircraftModel,
  gearInflation,
  offsetConvex,
  policyFor,
  polygonContains,
  type Pose,
  type Vec2,
  ZoneLayer,
  zonePriority,
} from '../../airport/index.js';
import {
  emptyFootprintZones,
  emptyZoneQuery,
  type FootprintZones,
  type ZoneQuery,
} from '../types.js';

export function zoneAt(layer: ZoneLayer, p: Vec2): ZoneQuery {
  // TODO(you): resolve every polygon covering p into one answer.
  //
  //   layer.candidatesAt(p)    the broadphase: ids whose bbox contains p
  //   polygonContains(...)     the exact test
  //   zonePriority(zone)       higher wins; "most restrictive first"
  //
  // Overlay polygons (poly.overlay) never decide the zone class -- they only
  // contribute the hotspot and closed flags.  A hotspot painted over a taxiway
  // leaves it a taxiway.
  void layer;
  void p;
  void polygonContains;
  void zonePriority;
  return emptyZoneQuery();
}

export function classifyFootprint(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  pose: Pose,
): FootprintZones {
  // TODO(you): zoneAt() for the reference point, the three tyres and the two
  // wingtips, then the three summary flags:
  //
  //   allGearLoadBearing  every tyre on pavement with policyFor(z).loadBearing
  //   gearConsistent      all three tyres in the same zone class
  //   wingtipViolation    a wingtip is somewhere policyFor(z).wingtipForbidden
  //
  // Testing only pose.p is the single most common way to write a planner that
  // taxis a wingtip through a jet bridge.
  void layer;
  void aircraft;
  void pose;
  void policyFor;
  return emptyFootprintZones();
}

export function configurationSpace(layer: ZoneLayer, aircraft: AircraftModel): ZoneLayer {
  // TODO(you): shrink what the gear may stand on, grow what the aircraft must
  // stay out of, so that a *point* test on the result is a *footprint* test on
  // the original.  offsetConvex(outline, delta) does the geometry: delta > 0
  // grows, delta < 0 shrinks, and it returns an empty polygon when a shrink
  // collapses the shape -- which means this aircraft does not fit there.
  //
  //   load-bearing zones    -gearInflation(aircraft)
  //   structures            +0.5 * wingspan + wingtipMargin
  //   shoulders             +gearInflation(aircraft)
  //   overlays              unchanged: they are flags, not geometry
  //
  // Remember to copy the holding positions across and to call build().
  void layer;
  void aircraft;
  void offsetConvex;
  void gearInflation;
  return new ZoneLayer();
}
