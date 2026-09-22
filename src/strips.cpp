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

StripsProblem flashlightProblem() {
  StripsProblem p;
  enum Inst { kBattery1, kBattery2, kCap, kFlashlight };
  enum Pred { kOn, kIn };
  p.instances = {"Battery1", "Battery2", "Cap", "Flashlight"};
  p.predicates = {"On", "In"};

  const Literal onCap = lit(kOn, {kCap, kFlashlight});
  const Literal in1 = lit(kIn, {kBattery1, kFlashlight});
  const Literal in2 = lit(kIn, {kBattery2, kFlashlight});
  p.atoms = {onCap, in1, in2};

  // Note that In(Battery1, Battery2) and friends are deliberately absent: the
  // predicates of Formulation 2.4 are only *partial* functions of the instances.
  p.operators = {
      {"PlaceCap", {onCap.negated()}, {onCap}},
      {"RemoveCap", {onCap}, {onCap.negated()}},
      {"Insert(Battery1)", {onCap.negated(), in1.negated()}, {in1}},
      {"Insert(Battery2)", {onCap.negated(), in2.negated()}, {in2}},
  };
  p.initial = {onCap};
  p.goal = {onCap, in1, in2};
  return p;
}

StripsProblem lightSwitchProblem() {
  StripsProblem p;
  enum Inst { kRobot, kSwitch, kLight, kRoom };
  enum Pred { kAt, kOn, kDark };
  p.instances = {"Robot", "Switch", "Light", "Room"};
  p.predicates = {"At", "On", "Dark"};

  const Literal atSwitch = lit(kAt, {kRobot, kSwitch});
  const Literal onLight = lit(kOn, {kLight});
  const Literal darkRoom = lit(kDark, {kRoom});
  p.atoms = {atSwitch, onLight, darkRoom};

  p.operators = {
      {"MoveToSwitch", {atSwitch.negated()}, {atSwitch}},
      {"MoveAway", {atSwitch}, {atSwitch.negated()}},
      {"FlipOn", {atSwitch, onLight.negated()}, {onLight, darkRoom.negated()}},
      {"FlipOff", {atSwitch, onLight}, {onLight.negated(), darkRoom}},
  };
  p.initial = {darkRoom};
  p.goal = {onLight, darkRoom.negated()};
  return p;
}

}  // namespace planning
