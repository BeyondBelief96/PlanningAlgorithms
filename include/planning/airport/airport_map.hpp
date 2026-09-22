// airport_map.hpp -- the capstone airport, and the scenarios that run on it.
//
// Part of the *given* library.  Everything is rectangles on a plane, in metres,
// x east and y north.  It is a toy, but it has one of everything the twelve
// steps need: two runways, a protected area around each, two routes between the
// apron and the runway, a hotspot, a de-icing pad, a closed area, a service
// road, shoulders, a terminal to clip a wingtip on, and four holding positions.
//
// The full coordinate table is in docs/capstone/07-the-map.md.
#pragma once

#include <string>
#include <vector>

#include "planning/airport/aircraft.hpp"
#include "planning/airport/graph.hpp"
#include "planning/airport/zones.hpp"

namespace planning::airport::maps {

struct Airport {
  std::string name;
  ZoneLayer zones;
  // The *raw* guidance-line graph, straight from the chart: no gate vertices,
  // no zone tags.  Exercise 02 turns it into the gated graph.
  TaxiGraph graph;
};

// Kilo Field, the capstone airport.  Built once and cached.
const Airport& kilo();

// A fresh copy, for tests that want to modify it.
Airport buildKilo();

}  // namespace planning::airport::maps

namespace planning::airport::scenarios {

struct Scenario {
  std::string name;
  std::string description;
  Pose start;
  AircraftModel aircraft;
  std::string clearance;
  std::string expectation;  // what the pipeline should report, in words
};

// Pushed back from stand 2 and facing east down the apron lane: the ordinary
// departure, and the one every guide walks through.
Scenario standDeparture();
// Still nose-in at stand 3, facing the terminal.  There is no forward exit.
Scenario noseInStand();
// Parked on the apron well off any guidance line, facing north-east.
Scenario apronOffLine();
// On taxiway A, six metres left of the centreline and eight degrees off.
Scenario taxiwayCapture();
// Rolling out on runway 09 at midfield.  The only exits are ahead.
Scenario landingRollout();
// Rolling out on runway 27 near the west end.  Nothing ahead but the threshold.
Scenario landingNoExit();
// On taxiway B between the two runway-36 holding positions, without a crossing
// clearance.  The planner must not merge back across the holding position.
Scenario insideRunwayProtected();
// A Boeing 777 at stand 2.  Too wide for the capstone taxiways.
Scenario oversizeAircraft();

std::vector<Scenario> all();
// Case-insensitive lookup; returns standDeparture() when the name is unknown.
Scenario byName(const std::string& name);

}  // namespace planning::airport::scenarios
