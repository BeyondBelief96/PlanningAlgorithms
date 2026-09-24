// Reference solution -- Exercise 01: the zone layer (Step 1).
//
// Three queries, and the whole capstone leans on them.  zoneAt() is called
// hundreds of thousands of times by the sweep check and by hybrid A*, so the
// broadphase matters; classifyFootprint() is what Step 3 localizes with; and
// configurationSpace() is the trick that turns a footprint test into a point
// test, which is what makes the free-space search affordable at all.

import {
  type AircraftModel,
  gearInflation,
  leftMainGear,
  leftWingtip,
  noseGear,
  offsetConvex,
  policyFor,
  polygonContains,
  rightMainGear,
  rightWingtip,
  type Pose,
  type Vec2,
  type ZoneClass,
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
  const query = emptyZoneQuery();
  let best = -1;
  for (const id of layer.candidatesAt(p)) {
    const poly = layer.polygon(id);
    if (!polygonContains(poly.outline, p)) continue;

    // Overlays are flags, not geometry.  A hotspot painted over a taxiway
    // leaves it a taxiway; it just costs more and is driven more slowly.
    if (poly.hotspot) query.hotspot = true;
    if (poly.closed) query.closed = true;
    if (poly.overlay) continue;

    const priority = zonePriority(poly.zone);
    if (priority <= best) continue;
    best = priority;
    query.zone = poly.zone;
    query.polygonId = id;
  }
  return query;
}

export function classifyFootprint(
  layer: ZoneLayer,
  aircraft: AircraftModel,
  pose: Pose,
): FootprintZones {
  const f = emptyFootprintZones();
  f.reference = zoneAt(layer, pose.p);
  f.noseGear = zoneAt(layer, noseGear(aircraft, pose));
  f.leftMainGear = zoneAt(layer, leftMainGear(aircraft, pose));
  f.rightMainGear = zoneAt(layer, rightMainGear(aircraft, pose));
  f.leftWingtip = zoneAt(layer, leftWingtip(aircraft, pose));
  f.rightWingtip = zoneAt(layer, rightWingtip(aircraft, pose));

  const gear = [f.noseGear, f.leftMainGear, f.rightMainGear];
  f.allGearLoadBearing = true;
  f.gearConsistent = true;
  for (const g of gear) {
    if (!policyFor(g.zone).loadBearing) f.allGearLoadBearing = false;
    if (g.zone !== gear[0]!.zone) f.gearConsistent = false;
  }
  f.gearZone = f.gearConsistent ? gear[0]!.zone : 'unknown';

  f.wingtipViolation =
    policyFor(f.leftWingtip.zone).wingtipForbidden ||
    policyFor(f.rightWingtip.zone).wingtipForbidden;
  return f;
}

export function configurationSpace(layer: ZoneLayer, aircraft: AircraftModel): ZoneLayer {
  const out = new ZoneLayer();
  out.name = `${layer.name} (C-space)`;

  // Everything the gear may stand on shrinks by the combined error budget, so
  // that a point inside the shrunken polygon guarantees all three tyres are
  // inside the real one.  Everything the aircraft must stay out of grows, by
  // the gear budget for shoulders and by half a wingspan plus separation for
  // structures.
  const gearMargin = gearInflation(aircraft);
  const wingMargin = 0.5 * aircraft.wingspan + aircraft.wingtipMargin;

  for (const poly of layer.polygons) {
    if (poly.overlay) {
      // Overlays carry no clearance meaning, so they keep their shape.
      out.add({ ...poly });
      continue;
    }

    const policy = policyFor(poly.zone);
    let delta = 0;
    if (policy.wingtipForbidden) delta = wingMargin;
    else if (policy.loadBearing) delta = -gearMargin;
    else if ((poly.zone as ZoneClass) === 'shoulder') delta = gearMargin;

    if (delta !== 0) {
      const outline = offsetConvex(poly.outline, delta);
      // A polygon that collapses is one this aircraft simply does not fit in.
      if (outline.length === 0) continue;
      out.add({ ...poly, outline });
    } else {
      out.add({ ...poly });
    }
  }

  // Holding positions are lines, not areas: they do not move.
  for (const line of layer.holdShortLines) out.addHoldShort(line);
  out.build();
  return out;
}
