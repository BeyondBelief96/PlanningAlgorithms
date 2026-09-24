// Reference solution -- Exercise 04: the clearance and the permission set
// (Step 4).
//
// The clearance is the only thing in the whole system that can open a runway
// gate.  Everything here is bookkeeping in service of that one sentence.

import {
  type Clearance,
  emptyPermissions,
  NO_VERTEX,
  type PermissionSet,
  type TaxiGraph,
  type VertexId,
  type ZoneLayer,
} from '../../airport/index.js';
import { zoneAt } from './ex01-zone-layer.js';

function namesAny(idents: readonly string[], set: ReadonlySet<string>): boolean {
  return idents.some((id) => set.has(id));
}

function incidentLabel(graph: TaxiGraph, v: VertexId, label: string): boolean {
  return graph.incident(v).some((e) => graph.edge(e).taxiway === label);
}

export function buildPermissions(
  gated: TaxiGraph,
  layer: ZoneLayer,
  clearance: Clearance,
): PermissionSet {
  const ps = emptyPermissions();
  ps.routeLabels = [...clearance.route];
  ps.authorizedCrossings = new Set(clearance.crossings);
  ps.enterableRunways = new Set(clearance.crossings);
  ps.deIcingInMission = clearance.deIcingRequested;

  // "Hold short of 27" and "cleared to enter 27" are the same runway and
  // opposite permissions, so the destination only joins the enterable set when
  // the clearance actually says we may go in.
  if (clearance.destinationIsRunway && clearance.clearedToEnterDestination)
    ps.enterableRunways.add(clearance.destination);

  for (const v of gated.vertices) {
    if (v.gate !== 'hard') continue;
    if (namesAny(v.protects, ps.enterableRunways)) ps.authorizedGates.add(v.id);
    else if (v.holdShortId >= 0) ps.mandatoryStops.add(v.id);
  }

  // Where does the mission end?
  const lastLabel = ps.routeLabels[ps.routeLabels.length - 1] ?? '';
  if (clearance.destinationIsRunway) {
    for (const v of gated.vertices) {
      if (v.gate !== 'hard') continue;
      if (!v.protects.includes(clearance.destination)) continue;
      if (lastLabel !== '' && !incidentLabel(gated, v.id, lastLabel)) continue;
      // Holding position when we must hold short; the runway edge itself when
      // we are cleared to enter.
      const wantHoldShort = !clearance.clearedToEnterDestination;
      const isHoldShort = v.holdShortId >= 0;
      if (wantHoldShort !== isHoldShort) continue;
      if (!wantHoldShort && v.outerZone !== 'runway') continue;
      ps.goal = v.id;
      break;
    }
    ps.detail =
      ps.goal === NO_VERTEX
        ? `no holding position for runway ${clearance.destination} is reachable from the cleared route`
        : `hold at ${gated.vertex(ps.goal).name}`;
  } else {
    // A stand: stop at the parking position itself, not at the stand entry.
    const label = `STAND ${clearance.destination}`;
    for (const v of gated.vertices) {
      if (!incidentLabel(gated, v.id, label)) continue;
      if (zoneAt(layer, v.p).zone !== 'stand') continue;
      if (gated.incident(v.id).length !== 1) continue; // the far end of the lead-in line
      ps.goal = v.id;
      break;
    }
    ps.detail =
      ps.goal === NO_VERTEX
        ? `stand ${clearance.destination} is not on the map`
        : `park at ${label}`;
  }
  return ps;
}
