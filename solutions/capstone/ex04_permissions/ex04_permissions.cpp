// Reference solution -- Exercise 04: the clearance and the permission set
// (Step 4).
//
// The clearance is the only thing in the whole system that can open a runway
// gate.  Everything here is bookkeeping in service of that one sentence.
#include <algorithm>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

bool namesAny(const std::vector<std::string>& idents, const std::set<std::string>& set) {
  for (const std::string& id : idents)
    if (set.count(id) != 0) return true;
  return false;
}

bool incidentLabel(const TaxiGraph& graph, VertexId v, const std::string& label) {
  for (EdgeId e : graph.incident(v))
    if (graph.edge(e).taxiway == label) return true;
  return false;
}

}  // namespace

PermissionSet buildPermissions(const TaxiGraph& gated, const ZoneLayer& layer,
                               const Clearance& clearance) {
  PermissionSet ps;
  ps.routeLabels = clearance.route;
  ps.authorizedCrossings = clearance.crossings;
  ps.enterableRunways = clearance.crossings;
  ps.deIcingInMission = clearance.deIcingRequested;

  // "Hold short of 27" and "cleared to enter 27" are the same runway and
  // opposite permissions, so the destination only joins the enterable set when
  // the clearance actually says we may go in.
  if (clearance.destinationIsRunway && clearance.clearedToEnterDestination)
    ps.enterableRunways.insert(clearance.destination);

  for (const Vertex& v : gated.vertices()) {
    if (v.gate != GateKind::Hard) continue;
    if (namesAny(v.protects, ps.enterableRunways))
      ps.authorizedGates.insert(v.id);
    else if (v.holdShortId >= 0)
      ps.mandatoryStops.insert(v.id);
  }

  // Where does the mission end?
  const std::string lastLabel = ps.routeLabels.empty() ? std::string() : ps.routeLabels.back();
  if (clearance.destinationIsRunway) {
    for (const Vertex& v : gated.vertices()) {
      if (v.gate != GateKind::Hard) continue;
      if (std::find(v.protects.begin(), v.protects.end(), clearance.destination) ==
          v.protects.end())
        continue;
      if (!lastLabel.empty() && !incidentLabel(gated, v.id, lastLabel)) continue;
      // Holding position when we must hold short; the runway edge itself when
      // we are cleared to enter.
      const bool wantHoldShort = !clearance.clearedToEnterDestination;
      const bool isHoldShort = v.holdShortId >= 0;
      if (wantHoldShort != isHoldShort) continue;
      if (!wantHoldShort && v.outerZone != ZoneClass::Runway) continue;
      ps.goal = v.id;
      break;
    }
    ps.detail = ps.goal == kNoVertex ? "no holding position for runway " + clearance.destination +
                                           " is reachable from the cleared route"
                                     : "hold at " + gated.vertex(ps.goal).name;
  } else {
    // A stand: stop at the parking position itself, not at the stand entry.
    const std::string label = "STAND " + clearance.destination;
    for (const Vertex& v : gated.vertices()) {
      if (!incidentLabel(gated, v.id, label)) continue;
      if (zoneAt(layer, v.p).zone != ZoneClass::Stand) continue;
      if (gated.incident(v.id).size() != 1) continue;  // the far end of the lead-in line
      ps.goal = v.id;
      break;
    }
    ps.detail = ps.goal == kNoVertex ? "stand " + clearance.destination + " is not on the map"
                                     : "park at " + label;
  }
  return ps;
}

}  // namespace planning::airport
