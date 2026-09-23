// turnaround_demo -- One turnaround task, described three ways.
//
// A taxi route is a path through a map.  A turnaround is not: it is a set of
// jobs with preconditions, and its state space is far too big to draw.  This
// walks the same task through all three treatments of Sections 2.4 and 2.5 --
// as a description, as a state space to search, as a reachability graph, and
// as a Boolean formula.
//
//   turnaround_demo          loading the hold (two containers and a door)
//   turnaround_demo power    connecting ground power
//
// [book] LaValle Sections 2.4 and 2.5; Example 2.6 and book Exercise 14.
#include <iostream>
#include <string>

#include "planning/planning_graph.hpp"
#include "planning/sat.hpp"
#include "planning/search.hpp"
#include "planning/strips.hpp"

using namespace planning;

int main(int argc, char** argv) {
  const std::string which = argc > 1 ? argv[1] : "cargo";
  const StripsProblem problem = which == "power" ? groundPowerProblem() : cargoHoldProblem();

  std::cout << "=== the description: what is true, and what the jobs do ===\n\n";
  std::cout << "instances:";
  for (const std::string& i : problem.instances) std::cout << " " << i;
  std::cout << "\natoms:";
  for (const Literal& a : problem.atoms) std::cout << " " << problem.toString(a);
  std::cout << "\noperators:\n";
  for (const Operator& o : problem.operators) std::cout << "  " << problem.toString(o) << "\n";
  std::cout << "S = " << maskToString(problem, initialMask(problem)) << "\nG =";
  for (const Literal& g : problem.goal) std::cout << " " << problem.toString(g);
  std::cout << "\n";

  std::cout << "\n=== as a state space, so the search methods can run on it ===\n\n";
  const StripsStateSpace space(problem);
  std::cout << "|X| = " << space.numStates() << ", x_I = " << space.name(space.initialState())
            << "\n";
  const Plan plan = breadthFirstSearch(space);
  if (plan.found) {
    std::cout << "breadth-first plan (" << plan.length() << " jobs):\n";
    for (Action u : plan.actions) std::cout << "  " << problem.operators[u].name << "\n";
  } else {
    std::cout << "breadth-first search found no plan (is Exercise 01 still a stub?)\n";
  }

  std::cout << "\n=== as a planning graph: how early could this possibly finish? ===\n\n";
  const PlanningGraph graph = buildPlanningGraph(problem);
  std::cout << toString(problem, graph);
  std::cout << "everything the job needs is first possible together at layer "
            << (firstGoalLayer(problem, graph) + 1)
            << " -- a lower bound on the turnaround, found without searching\n";

  std::cout << "\n=== as a Boolean formula: is there a plan of exactly this length? ===\n\n";
  for (int K = 0; K <= 6; ++K) {
    const SatEncoding encoding = encodePlanningAsSat(problem, K);
    const auto assignment = dpll(encoding.cnf);
    std::cout << "K = " << K << ": " << encoding.cnf.numVars << " variables, "
              << encoding.cnf.clauses.size() << " clauses -> "
              << (assignment ? "SATISFIABLE" : "unsatisfiable") << "\n";
    if (!assignment) continue;
    for (int o : extractPlan(encoding, *assignment))
      std::cout << "    " << problem.operators[o].name << "\n";
    break;
  }
  std::cout << "\n";
  return 0;
}
