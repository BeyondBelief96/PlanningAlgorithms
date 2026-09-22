#include <algorithm>
#include <vector>

#include "planning/sat.hpp"
#include "test_harness.hpp"

using namespace planning;

namespace {

// Applies a plan by hand, so this test does not depend on Exercise 09.
// Returns false if any operator is inapplicable or the goal is not reached.
bool planWorks(const StripsProblem& problem, const std::vector<int>& plan) {
  StripsState mask = initialMask(problem);
  for (int o : plan) {
    if (o < 0 || o >= static_cast<int>(problem.operators.size())) return false;
    const Operator& op = problem.operators[o];
    for (const Literal& pre : op.preconditions) {
      const int a = problem.atomIndex(pre);
      if (a < 0) return false;
      if ((((mask >> a) & StripsState{1}) != 0) != pre.positive) return false;
    }
    for (const Literal& eff : op.effects) {
      const int a = problem.atomIndex(eff);
      if (a < 0) continue;
      if (eff.positive) mask |= (StripsState{1} << a);
      else mask &= ~(StripsState{1} << a);
    }
  }
  for (const Literal& g : problem.goal) {
    const int a = problem.atomIndex(g);
    if (a < 0) return false;
    if ((((mask >> a) & StripsState{1}) != 0) != g.positive) return false;
  }
  return true;
}

}  // namespace

TEST(the_variable_count_matches_the_stage_tagging) {
  // 3 atoms over K + 1 = 3 stages, plus 4 operators over K = 2 stages.
  const SatEncoding encoding = encodePlanningAsSat(lightSwitchProblem(), 2);
  CHECK_EQ(encoding.cnf.numVars, 3 * 3 + 4 * 2);
  CHECK(!encoding.cnf.clauses.empty());
}

TEST(two_stages_are_enough_for_the_light_switch) {
  const StripsProblem problem = lightSwitchProblem();
  const SatEncoding encoding = encodePlanningAsSat(problem, 2);
  const auto assignment = dpll(encoding.cnf);

  CHECK(assignment.has_value());
  CHECK(encoding.cnf.satisfiedBy(*assignment));

  const std::vector<int> plan = extractPlan(encoding, *assignment);
  CHECK_EQ(plan.size(), std::size_t{2});
  CHECK_EQ(problem.operators[plan[0]].name, std::string("MoveToSwitch"));
  CHECK_EQ(problem.operators[plan[1]].name, std::string("FlipOn"));
  CHECK(planWorks(problem, plan));
}

TEST(one_stage_is_not_enough_for_the_light_switch) {
  // The robot has to walk to the switch before it can flip it.
  const SatEncoding encoding = encodePlanningAsSat(lightSwitchProblem(), 1);
  CHECK(!dpll(encoding.cnf).has_value());
}

TEST(zero_stages_works_only_if_the_goal_already_holds) {
  CHECK(!dpll(encodePlanningAsSat(lightSwitchProblem(), 0).cnf).has_value());
  CHECK(!dpll(encodePlanningAsSat(flashlightProblem(), 0).cnf).has_value());
}

TEST(the_flashlight_needs_four_stages_and_no_fewer) {
  CHECK(!dpll(encodePlanningAsSat(flashlightProblem(), 3).cnf).has_value());
  CHECK(dpll(encodePlanningAsSat(flashlightProblem(), 4).cnf).has_value());
}

TEST(the_search_over_K_finds_the_shortest_plan) {
  const StripsProblem problem = flashlightProblem();
  const auto plan = planAsSatisfiability(problem, 6);

  CHECK(plan.has_value());
  CHECK_EQ(plan->size(), std::size_t{4});
  CHECK(planWorks(problem, *plan));

  // Equation (2.24): take the cap off, put both batteries in, put the cap back.
  // Which battery goes first is genuinely free, so do not assume an order.
  CHECK_EQ(problem.operators[plan->front()].name, std::string("RemoveCap"));
  CHECK_EQ(problem.operators[plan->back()].name, std::string("PlaceCap"));
  std::vector<int> middle{(*plan)[1], (*plan)[2]};
  std::sort(middle.begin(), middle.end());
  CHECK_EQ(middle[0], 2);  // Insert(Battery1)
  CHECK_EQ(middle[1], 3);  // Insert(Battery2)
}

TEST(a_satisfiable_formula_yields_a_complete_assignment) {
  const SatEncoding encoding = encodePlanningAsSat(lightSwitchProblem(), 3);
  const auto assignment = dpll(encoding.cnf);
  CHECK(assignment.has_value());
  CHECK_EQ(assignment->size(), static_cast<std::size_t>(encoding.cnf.numVars));
}

TEST(dpll_handles_the_trivial_cases) {
  CnfFormula empty;
  empty.numVars = 3;
  CHECK(dpll(empty).has_value());

  CnfFormula contradiction;
  contradiction.numVars = 1;
  contradiction.addClause({1});
  contradiction.addClause({-1});
  CHECK(!dpll(contradiction).has_value());
}
