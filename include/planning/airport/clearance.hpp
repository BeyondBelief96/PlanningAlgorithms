// clearance.hpp -- what ATC said, and what the planner is therefore allowed to
// do (Step 4).
//
// The parser is given: turning words into a struct is not planning.  Turning
// the struct into a permission set over the gated graph is Exercise 04.
#pragma once

#include <set>
#include <string>
#include <vector>

#include "planning/airport/graph.hpp"

namespace planning::airport {

// The structured form of a taxi clearance.
//
//   "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27"
//
// becomes destination "27", destinationIsRunway, route {A, D, B, E},
// crossings {"36"}, holdShort {"27"}.
struct Clearance {
  std::string raw;
  std::string destination;  // "27", or "2" for a stand
  bool destinationIsRunway = true;
  std::vector<std::string> route;          // taxiway labels, in the order given
  std::set<std::string> crossings;         // runways we may cross
  std::set<std::string> holdShort;         // runways we must hold short of
  bool clearedToEnterDestination = false;  // "LINE UP AND WAIT" / takeoff clearance
  bool deIcingRequested = false;           // "VIA DEICE"
};

// A forgiving, case-insensitive parser for the phrases the capstone uses:
//
//   TAXI TO RUNWAY <id> | TAXI TO STAND <id>
//   VIA <label> <label> ...
//   CROSS RUNWAY <id>
//   HOLD SHORT RUNWAY <id>   (also: HOLD SHORT OF RUNWAY <id>)
//   LINE UP AND WAIT | CLEARED FOR TAKEOFF
//
// Unknown words inside VIA become route labels, which is how DEICE gets in.
Clearance parseClearance(const std::string& text);

std::string toString(const Clearance& clearance);

// The output of Step 4: everything the search is allowed to do on this mission.
struct PermissionSet {
  // Taxiway labels in the order the clearance gave them.  An empty route means
  // "no route constraint", and the search may use any open edge.
  std::vector<std::string> routeLabels;

  // Hard gates this clearance opens.  Every other hard gate is closed and gets
  // infinite cost for this mission.
  std::set<VertexId> authorizedGates;

  // Hold-short gates the aircraft must come to a stop at, whether or not the
  // route reaches them.  Step 10 turns the ones on the route into stop points.
  std::set<VertexId> mandatoryStops;

  // Runway identifiers the clearance named, kept for reporting.
  std::set<std::string> authorizedCrossings;

  // Runways whose holding position the footprint may legally pass: the
  // authorized crossings, plus the destination when we are cleared to enter it.
  // Step 9 tests the swept outline against exactly this set.
  std::set<std::string> enterableRunways;

  bool deIcingInMission = false;

  // Where the mission ends: a hold-short gate, a runway entry vertex, or a
  // stand gate.  kNoVertex when the clearance names no reachable destination.
  VertexId goal = kNoVertex;
  std::string detail;

  bool allowsGate(VertexId v) const { return authorizedGates.count(v) != 0; }
};

}  // namespace planning::airport
