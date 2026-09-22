// taxi_demo.cpp -- the capstone end to end, on every scenario.
//
//   taxi_demo                  every scenario, one paragraph each
//   taxi_demo map              the airport, drawn
//   taxi_demo gates            what Exercise 02 made of the raw graph
//   taxi_demo hybrid           the closed-form merge and the search, side by side
//   taxi_demo <scenario>       one scenario, with the route drawn on the map
//   taxi_demo <scenario> -v    ...and every event, stop and speed
//
// Scenario names: stand-departure, nose-in-stand, apron-off-line,
// taxiway-capture, landing-rollout, landing-no-exit, inside-protected, oversize.
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

#include "planning/airport/render.hpp"

using namespace planning::airport;

namespace {

void runScenario(const scenarios::Scenario& scenario, bool draw, bool verbose) {
  const maps::Airport& airport = maps::kilo();
  const Clearance clearance = parseClearance(scenario.clearance);

  std::cout << "== " << scenario.name << " (" << scenario.aircraft.type << ")\n"
            << "   " << scenario.description << "\n"
            << "   clearance: " << toString(clearance) << "\n"
            << "   expected:  " << scenario.expectation << "\n";

  const PlanResult result =
      planTaxi(airport.zones, airport.graph, scenario.aircraft, scenario.start, clearance);

  std::cout << "   result:    " << toString(result.status) << " -- " << result.detail << "\n";
  if (result.ok())
    std::cout << describeRoute(buildGatedGraph(airport.graph, airport.zones), result.route);

  if (draw) {
    RenderOptions options;
    options.route = result.ok() ? &result.route : nullptr;
    options.aircraft = &scenario.start;
    std::cout << "\n" << renderAscii(airport.zones, options);
  }
  if (verbose) {
    const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
    std::cout << "\n   localization:\n"
              << describeLocalization(
                     localize(airport.zones, gated, scenario.aircraft, scenario.start));
    if (result.ok()) {
      std::cout << "   speed profile (every 100 m):\n" << std::fixed << std::setprecision(1);
      for (double s = 0.0; s <= result.route.path.length(); s += 100.0)
        std::cout << "     " << std::setw(8) << s << " m   " << result.route.speedAt(s) << " m/s\n";
    }
  }
  std::cout << "\n";
}

// The ladder almost always stops before the last rung, which makes hybrid A*
// easy to forget about.  This runs both on the same merge, so you can see what
// the search buys and what it costs.
void compareMergePlanners() {
  const maps::Airport& airport = maps::kilo();
  const scenarios::Scenario scenario = scenarios::apronOffLine();
  const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
  const Clearance clearance = parseClearance(scenario.clearance);
  const PermissionSet permissions = buildPermissions(gated, airport.zones, clearance);
  const EdgeFilter filter = filterGraph(gated, scenario.aircraft, permissions);
  const CostToGo costToGo = computeCostToGo(gated, permissions, filter, scenario.aircraft);
  const Localization localization =
      localize(airport.zones, gated, scenario.aircraft, scenario.start);
  const std::vector<MergeCandidate> candidates = generateMergeCandidates(
      gated, airport.zones, scenario.aircraft, localization, permissions, filter, costToGo);

  if (candidates.empty()) {
    std::cout << "no merge candidates\n";
    return;
  }
  const MergeCandidate& candidate = candidates.front();
  const MergeParams params = paramsFor(localization.mode, scenario.aircraft);

  std::cout << std::fixed << std::setprecision(1) << "merging from (" << scenario.start.p.x << ", "
            << scenario.start.p.y << ") at " << scenario.start.heading * 180.0 / kPi
            << " deg onto (" << candidate.target.p.x << ", " << candidate.target.p.y << ") at "
            << candidate.target.heading * 180.0 / kPi << " deg\n\n";

  const MergePath closedForm = planMerge(scenario.start, candidate, params);
  std::cout << "  ladder:     ";
  if (closedForm.found)
    std::cout << toString(closedForm.method) << ", " << closedForm.path.length() << " m, "
              << closedForm.path.totalTurning() * 180.0 / kPi << " deg of turning\n";
  else
    std::cout << "no closed form fits\n";

  const ZoneLayer cspace = configurationSpace(airport.zones, scenario.aircraft);
  HybridAStarParams hybridParams;
  hybridParams.radius = std::max(scenario.aircraft.minTurnRadius, params.preferredRadius);
  const MergePath searched =
      planHybridAStar(cspace, scenario.start, candidate, {ZoneClass::Apron}, hybridParams);
  std::cout << "  hybrid A*:  ";
  if (searched.found)
    std::cout << searched.path.length() << " m, " << searched.path.totalTurning() * 180.0 / kPi
              << " deg of turning (" << searched.detail << ")\n";
  else
    std::cout << "not found (" << searched.detail << ")\n";

  std::cout << "\nOn an open apron the analytic expansion usually solves it at the root, so\n"
               "the search looks cheap and sometimes even shorter.  The ladder is still\n"
               "first, for two reasons: the closed forms cost microseconds rather than\n"
               "milliseconds, and a pilot watching from the flight deck can tell what the\n"
               "aeroplane is about to do.  Put something in the way -- see the wall in\n"
               "tests/capstone/test_ex09_hybrid_astar.cpp -- and the numbers change.\n";
}

}  // namespace

int main(int argc, char** argv) {
  const std::string command = argc > 1 ? argv[1] : "";
  const bool verbose = argc > 2 && std::string(argv[2]) == "-v";

  if (command == "map") {
    std::cout << "Kilo Field\n\n" << renderAscii(maps::kilo().zones);
    return 0;
  }
  if (command == "gates") {
    const maps::Airport& airport = maps::kilo();
    const TaxiGraph gated = buildGatedGraph(airport.graph, airport.zones);
    std::cout << "raw graph:   " << airport.graph.numVertices() << " vertices, "
              << airport.graph.numEdges() << " edges\n"
              << "gated graph: " << gated.numVertices() << " vertices, " << gated.numEdges()
              << " edges\n\n"
              << describeGates(gated);
    return 0;
  }
  if (command == "hybrid") {
    compareMergePlanners();
    return 0;
  }
  if (command.empty()) {
    for (const scenarios::Scenario& scenario : scenarios::all())
      runScenario(scenario, /*draw=*/false, /*verbose=*/false);
    return 0;
  }
  runScenario(scenarios::byName(command), /*draw=*/true, verbose);
  return 0;
}
