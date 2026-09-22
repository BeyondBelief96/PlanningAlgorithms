// render.hpp -- ASCII pictures of the airport, for the demo.
//
// Given, but it is *not* part of planning_core: it calls zoneAt(), so it has to
// be compiled against whichever implementation is under test.
#pragma once

#include <string>

#include "planning/airport/airport_map.hpp"
#include "planning/airport/route.hpp"
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

struct RenderOptions {
  int width = 108;
  int height = 30;
  const Route* route = nullptr;
  const Pose* aircraft = nullptr;
  bool legend = true;
};

std::string renderAscii(const ZoneLayer& layer, const RenderOptions& options = RenderOptions{});

// One line per vertex or edge, for reading what Exercise 02 produced.
std::string describeGates(const TaxiGraph& gated);
std::string describeRoute(const TaxiGraph& gated, const Route& route);
std::string describeLocalization(const Localization& localization);

}  // namespace planning::airport
