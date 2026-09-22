// grid_demo -- Compare the search methods of Section 2.2 on a grid world.
//
// This is the harness for book Exercises 18-21: pick a map, run every search
// method, and look at what each one costs you.
//
//   grid_demo                 all maps
//   grid_demo bugtrap         just one map
//   grid_demo tiny --render   also draw the path
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
  std::cout << "\n=== " << name << " (" << problem.width() << "x" << problem.height() << ", "
            << problem.numStates() << " states) ===\n\n";
  std::cout << "  " << std::left << std::setw(22) << "method" << std::right << std::setw(9)
            << "cost" << std::setw(8) << "steps" << std::setw(11) << "expanded" << std::setw(11)
            << "generated" << "\n";

  row("breadth first", problem, breadthFirstSearch(problem), render);
  row("depth first", problem, depthFirstSearch(problem), render);
  row("Dijkstra", problem, dijkstra(problem), render);
  row("A* (Manhattan)", problem, aStar(problem, problem.manhattan()), render);
  row("A* (Euclidean)", problem, aStar(problem, problem.euclidean()), render);
  row("A* (zero == Dijkstra)", problem, aStar(problem, zeroHeuristic()), render);
  row("best first", problem, bestFirstSearch(problem, problem.manhattan()), render);
  // Iterative deepening keeps no global visited set, so its running time is
  // exponential in the plan length.  That is fine when the branching factor is
  // large and states are rarely revisited -- and a grid is the opposite of
  // that, so we only run it where it will finish this century.
  const Plan shortest = breadthFirstSearch(problem);
  if (shortest.found && shortest.length() <= 12) {
    row("iterative deepening", problem, iterativeDeepening(problem, 40), render);
    row("IDA* (Manhattan)", problem, iterativeDeepeningAStar(problem, problem.manhattan()), render);
  } else {
    std::cout << "  " << std::left << std::setw(22) << "iterative deepening" << std::right
              << "  skipped: the shortest plan is " << shortest.length()
              << " actions, and depth-limited DFS with no visited set is exponential in that"
              << std::endl;
  }
  row("backward Dijkstra", problem, backwardDijkstra(problem), render);
  row("bidirectional", problem, bidirectionalSearch(problem), render);

  try {
    const Stationary stationary = backwardValueIterationStationary(problem);
    const Plan plan = planFromPolicy(problem, stationary);
    row("value iteration", problem, plan, render);
    std::cout << "  (value iteration swept the whole state space " << stationary.iterations
              << " times; Dijkstra touched far fewer states for the same answer -- Section 2.3.3)\n";
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

  if (which.empty() || which == "tiny") runMap("tiny", maps::tiny(), render);
  if (which.empty() || which == "bugtrap") runMap("bugTrap", maps::bugTrap(), render);
  if (which.empty() || which == "openroom") runMap("openRoom", maps::openRoom(), render);
  std::cout << "\n";
  return 0;
}
