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

// Planning as satisfiability: stop searching for the turnaround and instead
// write down a Boolean formula that is true exactly when a K-job turnaround
// exists, then hand it to a SAT solver.  Every fact gets one variable per
// stage, every job gets one per step, and the clauses say what has to hold.

TEST(the_variable_count_matches_the_stage_tagging) {
  // 3 facts over K + 1 = 3 stages, plus 4 jobs over K = 2 steps.
  const SatEncoding encoding = encodePlanningAsSat(groundPowerProblem(), 2);
  CHECK_EQ(encoding.cnf.numVars, 3 * 3 + 4 * 2);
  CHECK(!encoding.cnf.clauses.empty());
}

TEST(two_steps_are_enough_to_get_the_ground_power_on) {
  const StripsProblem problem = groundPowerProblem();
  const SatEncoding encoding = encodePlanningAsSat(problem, 2);
  const auto assignment = dpll(encoding.cnf);

  CHECK(assignment.has_value());
  CHECK(encoding.cnf.satisfiedBy(*assignment));

  const std::vector<int> plan = extractPlan(encoding, *assignment);
  CHECK_EQ(plan.size(), std::size_t{2});
  CHECK_EQ(problem.operators[plan[0]].name, std::string("WalkToPanel"));
  CHECK_EQ(problem.operators[plan[1]].name, std::string("ConnectGpu"));
  CHECK(planWorks(problem, plan));
}

TEST(one_step_is_not_enough) {
  // Somebody has to walk to the panel before they can connect anything, and
  // the formula is unsatisfiable rather than approximately satisfiable.  A SAT
  // encoding cannot fudge a precondition.
  const SatEncoding encoding = encodePlanningAsSat(groundPowerProblem(), 1);
  CHECK(!dpll(encoding.cnf).has_value());
}

TEST(zero_steps_only_works_if_the_job_is_already_done) {
  CHECK(!dpll(encodePlanningAsSat(groundPowerProblem(), 0).cnf).has_value());
  CHECK(!dpll(encodePlanningAsSat(cargoHoldProblem(), 0).cnf).has_value());
}

TEST(the_hold_needs_four_steps_and_no_fewer) {
  CHECK(!dpll(encodePlanningAsSat(cargoHoldProblem(), 3).cnf).has_value());
  CHECK(dpll(encodePlanningAsSat(cargoHoldProblem(), 4).cnf).has_value());
}

TEST(trying_each_K_in_turn_finds_the_shortest_turnaround) {
  const StripsProblem problem = cargoHoldProblem();
  const auto plan = planAsSatisfiability(problem, 6);

  CHECK(plan.has_value());
  CHECK_EQ(plan->size(), std::size_t{4});
  CHECK(planWorks(problem, *plan));

  // Open the door, load both containers, shut the door.  Which container goes
  // in first is genuinely free, so the test must not assume an order -- and
  // neither should a ramp agent reading the plan.
  // [book] equation (2.24).
  CHECK_EQ(problem.operators[plan->front()].name, std::string("OpenDoor"));
  CHECK_EQ(problem.operators[plan->back()].name, std::string("CloseDoor"));
  std::vector<int> middle{(*plan)[1], (*plan)[2]};
  std::sort(middle.begin(), middle.end());
  CHECK_EQ(middle[0], 2);  // Load(ULD1)
  CHECK_EQ(middle[1], 3);  // Load(ULD2), in either order
}

TEST(a_satisfiable_formula_assigns_every_variable) {
  const SatEncoding encoding = encodePlanningAsSat(groundPowerProblem(), 3);
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
