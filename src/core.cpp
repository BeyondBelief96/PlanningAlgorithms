#include "planning/core.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace planning {

std::string Problem::name(State x) const { return "x" + std::to_string(x); }

Heuristic zeroHeuristic() {
  return [](State) { return 0.0; };
}

std::string validate(const Problem& problem, const Plan& plan) {
  if (!plan.found) return "plan is not marked as found";
  if (plan.states.empty()) return "plan has no states";
  if (plan.states.size() != plan.actions.size() + 1)
    return "expected states.size() == actions.size() + 1, got " +
           std::to_string(plan.states.size()) + " and " + std::to_string(plan.actions.size());
  if (plan.states.front() != problem.initialState())
    return "plan does not start at the initial state";
  if (!problem.isGoal(plan.states.back())) return "plan does not end in the goal set";

  double total = 0.0;
  for (std::size_t k = 0; k < plan.actions.size(); ++k) {
    const State x = plan.states[k];
    const Action u = plan.actions[k];
    if (u == kTerminate) return "the termination action must not appear inside a plan";
    bool matched = false;
    for (const Transition& t : problem.successors(x)) {
      if (t.u != u) continue;
      if (t.x != plan.states[k + 1])
        return "action " + std::to_string(u) + " at step " + std::to_string(k) +
               " does not lead to the recorded next state";
      total += t.cost;
      matched = true;
      break;
    }
    if (!matched)
      return "action " + std::to_string(u) + " is not available at step " + std::to_string(k);
  }
  if (std::abs(total - plan.cost) > 1e-9)
    return "recorded cost " + std::to_string(plan.cost) + " but the actions sum to " +
           std::to_string(total);
  return "";
}

namespace {

// Cost of the edge that action u takes out of state x, or infinity when that
// action is not available there.
double edgeCost(const Problem& problem, State x, Action u, State expected) {
  for (const Transition& t : problem.successors(x))
    if (t.u == u && t.x == expected) return t.cost;
  return kInfinity;
}

}  // namespace

Plan reconstructForward(const Problem& problem, State goal, const std::vector<State>& parent,
                        const std::vector<Action>& parentAction) {
  Plan plan;
  if (goal == kNoState) return plan;

  std::vector<State> states;
  std::vector<Action> actions;
  State x = goal;
  while (x != kNoState) {
    states.push_back(x);
    const State p = parent[x];
    if (p == kNoState) break;
    actions.push_back(parentAction[x]);
    x = p;
  }
  std::reverse(states.begin(), states.end());
  std::reverse(actions.begin(), actions.end());

  plan.found = true;
  plan.states = std::move(states);
  plan.actions = std::move(actions);
  plan.cost = 0.0;
  for (std::size_t k = 0; k < plan.actions.size(); ++k)
    plan.cost += edgeCost(problem, plan.states[k], plan.actions[k], plan.states[k + 1]);
  return plan;
}

Plan reconstructBackward(const Problem& problem, State start, const std::vector<State>& next,
                         const std::vector<Action>& nextAction) {
  Plan plan;
  if (start == kNoState) return plan;

  plan.found = true;
  State x = start;
  plan.states.push_back(x);
  while (!problem.isGoal(x)) {
    const State n = next[x];
    if (n == kNoState) return Plan{};
    plan.cost += edgeCost(problem, x, nextAction[x], n);
    plan.actions.push_back(nextAction[x]);
    plan.states.push_back(n);
    x = n;
  }
  return plan;
}

Plan concatenate(const Problem& problem, const Plan& first, const Plan& second) {
  if (!first.found || !second.found) return Plan{};
  if (first.states.empty() || second.states.empty()) return Plan{};
  if (first.states.back() != second.states.front()) return Plan{};

  Plan plan;
  plan.found = true;
  plan.states = first.states;
  plan.states.insert(plan.states.end(), second.states.begin() + 1, second.states.end());
  plan.actions = first.actions;
  plan.actions.insert(plan.actions.end(), second.actions.begin(), second.actions.end());
  plan.cost = 0.0;
  for (std::size_t k = 0; k < plan.actions.size(); ++k)
    plan.cost += edgeCost(problem, plan.states[k], plan.actions[k], plan.states[k + 1]);
  (void)problem;
  return plan;
}

std::string toString(const Problem& problem, const Plan& plan) {
  std::ostringstream out;
  if (!plan.found) {
    out << "FAILURE (expanded " << plan.expanded << ", generated " << plan.generated << ")";
    return out.str();
  }
  out << "cost " << plan.cost << ", " << plan.length() << " actions, expanded " << plan.expanded
      << ", generated " << plan.generated << "\n  ";
  for (std::size_t i = 0; i < plan.states.size(); ++i) {
    if (i) out << " -> ";
    out << problem.name(plan.states[i]);
  }
  return out.str();
}

namespace {
std::string cell(double v) {
  if (v == kInfinity) return "inf";
  std::ostringstream s;
  s << v;
  return s.str();
}
}  // namespace

std::string formatCostTable(const Problem& problem,
                            const std::vector<std::string>& rowLabels,
                            const std::vector<std::vector<double>>& rows) {
  const int n = problem.numStates();
  std::size_t labelWidth = 0;
  for (const std::string& l : rowLabels) labelWidth = std::max(labelWidth, l.size());

  std::vector<std::size_t> colWidth(n);
  for (int x = 0; x < n; ++x) {
    colWidth[x] = problem.name(x).size();
    for (const auto& row : rows)
      if (x < static_cast<int>(row.size())) colWidth[x] = std::max(colWidth[x], cell(row[x]).size());
  }

  std::ostringstream out;
  out << std::string(labelWidth, ' ');
  for (int x = 0; x < n; ++x) {
    const std::string h = problem.name(x);
    out << "  " << std::string(colWidth[x] - h.size(), ' ') << h;
  }
  out << "\n";
  for (std::size_t r = 0; r < rows.size(); ++r) {
    const std::string label = r < rowLabels.size() ? rowLabels[r] : std::string();
    out << label << std::string(labelWidth - label.size(), ' ');
    for (int x = 0; x < n && x < static_cast<int>(rows[r].size()); ++x) {
      const std::string v = cell(rows[r][x]);
      out << "  " << std::string(colWidth[x] - v.size(), ' ') << v;
    }
    out << "\n";
  }
  return out.str();
}

}  // namespace planning
