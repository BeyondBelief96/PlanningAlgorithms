// surface_demo -- Every search method, on the same piece of airport.
//
// Pick a surface, plan the same taxi on it eleven ways, and look at what each
// method cost you to get there.  Cost is minutes; expanded and generated are
// how much pavement the planner had to think about.
//
//   surface_demo                 all three surfaces
//   surface_demo pier            just the dead-end pier
//   surface_demo stand --render  also draw the route
//
// [book] LaValle Section 2.2, and the harness for book Exercises 18-21.
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

#include "planning/grid.hpp"
#include "planning/search.hpp"
#include "planning/value_iteration.hpp"

using namespace planning;

namespace {

void row(const std::string& label, const GridProblem& problem, const Plan& plan, bool render) {
  std::cout << "  " << std::left << std::setw(22) << label << std::right;
  if (!plan.found) {
    std::cout << "  FAILURE\n";
    return;
  }
  std::cout << std::setw(9) << std::fixed << std::setprecision(3) << plan.cost << std::setw(8)
            << plan.length() << std::setw(11) << plan.expanded << std::setw(11) << plan.generated
            << "\n";
  if (render) std::cout << problem.render(plan) << "\n";
}

void runMap(const std::string& name, const std::vector<std::string>& ascii, bool render) {
  const GridProblem problem = GridProblem::fromAscii(ascii);
  std::cout << "\n=== " << name << " (" << problem.width() << "x" << problem.height()
            << " squares, " << problem.numStates() << " of them) ===\n\n";
  std::cout << "  " << std::left << std::setw(22) << "method" << std::right << std::setw(9)
            << "minutes" << std::setw(8) << "moves" << std::setw(11) << "expanded" << std::setw(11)
            << "generated" << "\n";

  row("breadth first", problem, breadthFirstSearch(problem), render);
  row("depth first", problem, depthFirstSearch(problem), render);
  row("Dijkstra", problem, dijkstra(problem), render);
  row("A* (Manhattan)", problem, aStar(problem, problem.manhattan()), render);
  row("A* (Euclidean)", problem, aStar(problem, problem.euclidean()), render);
  row("A* (zero == Dijkstra)", problem, aStar(problem, zeroHeuristic()), render);
  row("best first", problem, bestFirstSearch(problem, problem.manhattan()), render);
  // Iterative deepening keeps no record of where it has already been, so its
  // running time is exponential in the number of moves.  That is a fine trade
  // when a state is rarely reachable two ways -- and a grid of pavement is the
  // exact opposite of that, so only run it where it will finish this century.
  const Plan shortest = breadthFirstSearch(problem);
  if (shortest.found && shortest.length() <= 12) {
    row("iterative deepening", problem, iterativeDeepening(problem, 40), render);
    row("IDA* (Manhattan)", problem, iterativeDeepeningAStar(problem, problem.manhattan()), render);
  } else {
    std::cout << "  " << std::left << std::setw(22) << "iterative deepening" << std::right
              << "  skipped: the shortest route is " << shortest.length()
              << " moves, and depth-limited search with no visited set is exponential in that"
              << std::endl;
  }
  row("backward Dijkstra", problem, backwardDijkstra(problem), render);
  row("bidirectional", problem, bidirectionalSearch(problem), render);

  try {
    const Stationary stationary = backwardValueIterationStationary(problem);
    const Plan plan = planFromPolicy(problem, stationary);
    row("value iteration", problem, plan, render);
    std::cout << "  (that took " << stationary.iterations
              << " sweeps of every square on the airport; Dijkstra touched a\n"
              << "   fraction of them for the same answer.  What the sweeping buys is a\n"
              << "   route from *every* square, not just this one -- which is what you\n"
              << "   want when the aeroplane turns up somewhere you did not plan for.)\n";
  } catch (const std::exception& e) {
    std::cout << "  value iteration: " << e.what() << "\n";
  }
}

}  // namespace

int main(int argc, char** argv) {
  std::string which;
  bool render = false;
  for (int i = 1; i < argc; ++i) {
    const std::string arg = argv[i];
    if (arg == "--render") render = true;
    else which = arg;
  }

  if (which.empty() || which == "stand") runMap("stand area", maps::standArea(), render);
  if (which.empty() || which == "pier") runMap("dead-end pier", maps::deadEndPier(), render);
  if (which.empty() || which == "open") runMap("open apron", maps::openApron(), render);
  std::cout << "\n";
  return 0;
}
