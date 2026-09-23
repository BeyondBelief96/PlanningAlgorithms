#include "planning/strips.hpp"

#include <algorithm>
#include <sstream>

namespace planning {

int StripsProblem::atomIndex(const Literal& l) const {
  for (std::size_t i = 0; i < atoms.size(); ++i)
    if (atoms[i].sameAtom(l)) return static_cast<int>(i);
  return -1;
}

std::string StripsProblem::toString(const Literal& l) const {
  std::ostringstream out;
  if (!l.positive) out << "!";
  out << (l.predicate >= 0 && l.predicate < static_cast<int>(predicates.size())
              ? predicates[l.predicate]
              : "?");
  out << "(";
  for (std::size_t i = 0; i < l.args.size(); ++i) {
    if (i) out << ", ";
    const int a = l.args[i];
    out << (a >= 0 && a < static_cast<int>(instances.size()) ? instances[a] : "?");
  }
  out << ")";
  return out.str();
}

std::string StripsProblem::toString(const Operator& o) const {
  std::ostringstream out;
  out << o.name << "\n    pre:";
  for (const Literal& l : o.preconditions) out << " " << toString(l);
  out << "\n    eff:";
  for (const Literal& l : o.effects) out << " " << toString(l);
  return out.str();
}

StripsState initialMask(const StripsProblem& problem) {
  StripsState mask = 0;
  for (const Literal& l : problem.initial) {
    const int a = problem.atomIndex(l);
    if (a >= 0 && l.positive) mask |= (StripsState{1} << a);
  }
  return mask;
}

std::string maskToString(const StripsProblem& problem, StripsState mask) {
  std::ostringstream out;
  out << "{";
  bool first = true;
  for (std::size_t a = 0; a < problem.atoms.size(); ++a) {
    if (!(mask & (StripsState{1} << a))) continue;
    if (!first) out << ", ";
    first = false;
    out << problem.toString(problem.atoms[a]);
  }
  out << "}";
  return out.str();
}

namespace {

Literal lit(int predicate, std::vector<int> args, bool positive = true) {
  Literal l;
  l.predicate = predicate;
  l.args = std::move(args);
  l.positive = positive;
  return l;
}

}  // namespace

StripsProblem cargoHoldProblem() {
  StripsProblem p;
  enum Inst { kUld1, kUld2, kDoor, kHold };
  enum Pred { kClosed, kLoaded };
  p.instances = {"ULD1", "ULD2", "Door", "Hold"};
  p.predicates = {"Closed", "Loaded"};

  const Literal doorShut = lit(kClosed, {kDoor, kHold});
  const Literal loaded1 = lit(kLoaded, {kUld1, kHold});
  const Literal loaded2 = lit(kLoaded, {kUld2, kHold});
  p.atoms = {doorShut, loaded1, loaded2};

  // Note what is deliberately absent: Loaded(ULD1, ULD2), Closed(Hold, Door),
  // Loaded(Door, Hold).  A predicate is only a *partial* function of the
  // instances -- most combinations of a predicate and its arguments are simply
  // not facts about anything, and listing them would be the first step towards
  // the state space blow-up the whole representation exists to avoid.
  p.operators = {
      {"CloseDoor", {doorShut.negated()}, {doorShut}},
      {"OpenDoor", {doorShut}, {doorShut.negated()}},
      {"Load(ULD1)", {doorShut.negated(), loaded1.negated()}, {loaded1}},
      {"Load(ULD2)", {doorShut.negated(), loaded2.negated()}, {loaded2}},
  };
  p.initial = {doorShut};
  p.goal = {doorShut, loaded1, loaded2};
  return p;
}

StripsProblem groundPowerProblem() {
  StripsProblem p;
  enum Inst { kCrew, kPanel, kGpu, kAircraft };
  enum Pred { kAt, kConnected, kOnBattery };
  p.instances = {"Crew", "Panel", "Gpu", "Aircraft"};
  p.predicates = {"At", "Connected", "OnBattery"};

  const Literal atPanel = lit(kAt, {kCrew, kPanel});
  const Literal connected = lit(kConnected, {kGpu, kAircraft});
  const Literal onBattery = lit(kOnBattery, {kAircraft});
  p.atoms = {atPanel, connected, onBattery};

  // Connecting and disconnecting both require somebody standing at the panel,
  // which is what stops the plan being one job long.
  p.operators = {
      {"WalkToPanel", {atPanel.negated()}, {atPanel}},
      {"WalkAway", {atPanel}, {atPanel.negated()}},
      {"ConnectGpu", {atPanel, connected.negated()}, {connected, onBattery.negated()}},
      {"DisconnectGpu", {atPanel, connected}, {connected.negated(), onBattery}},
  };
  p.initial = {onBattery};
  p.goal = {connected, onBattery.negated()};
  return p;
}

}  // namespace planning
