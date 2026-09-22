// logic_demo -- Sections 2.4 and 2.5 end to end on one problem.
//
//   logic_demo            the flashlight (Example 2.6)
//   logic_demo switch     the light-switch problem (book Exercise 14)
#include <iostream>
#include <string>

#include "planning/planning_graph.hpp"
#include "planning/sat.hpp"
#include "planning/search.hpp"
#include "planning/strips.hpp"

using namespace planning;

int main(int argc, char** argv) {
  const std::string which = argc > 1 ? argv[1] : "flashlight";
  const StripsProblem problem = which == "switch" ? lightSwitchProblem() : flashlightProblem();

  std::cout << "=== Formulation 2.4 ===\n\n";
  std::cout << "instances:";
  for (const std::string& i : problem.instances) std::cout << " " << i;
  std::cout << "\natoms:";
  for (const Literal& a : problem.atoms) std::cout << " " << problem.toString(a);
  std::cout << "\noperators:\n";
  for (const Operator& o : problem.operators) std::cout << "  " << problem.toString(o) << "\n";
  std::cout << "S = " << maskToString(problem, initialMask(problem)) << "\nG =";
  for (const Literal& g : problem.goal) std::cout << " " << problem.toString(g);
  std::cout << "\n";

  std::cout << "\n=== Section 2.4.2: as a state space ===\n\n";
  const StripsStateSpace space(problem);
  std::cout << "|X| = " << space.numStates() << ", x_I = " << space.name(space.initialState())
            << "\n";
  const Plan plan = breadthFirstSearch(space);
  if (plan.found) {
    std::cout << "breadth-first plan (" << plan.length() << " actions):\n";
    for (Action u : plan.actions) std::cout << "  " << problem.operators[u].name << "\n";
  } else {
    std::cout << "breadth-first search found no plan (is Exercise 01 still a stub?)\n";
  }

  std::cout << "\n=== Section 2.5.2: the planning graph ===\n\n";
  const PlanningGraph graph = buildPlanningGraph(problem);
  std::cout << toString(problem, graph);
  std::cout << "the goal first becomes possible at layer " << (firstGoalLayer(problem, graph) + 1)
            << "\n";

  std::cout << "\n=== Section 2.5.3: as satisfiability ===\n\n";
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
