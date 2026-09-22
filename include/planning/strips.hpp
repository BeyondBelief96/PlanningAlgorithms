// strips.hpp -- Section 2.4, the STRIPS-like representation (Formulation 2.4).
//
// The data types and the two example models below are given.  The conversion
// to a state space (Section 2.4.2) is Exercise 09.
#pragma once

#include <string>
#include <vector>

#include "planning/core.hpp"

namespace planning {

// A predicate applied to instances, optionally negated.  P(i1, i2) is a
// positive literal; !P(i1, i2) is the matching negative literal.  Together they
// are a "complementary pair"; the positive member of the pair is an *atom*.
struct Literal {
  int predicate = -1;
  std::vector<int> args;
  bool positive = true;

  Literal negated() const {
    Literal l = *this;
    l.positive = !positive;
    return l;
  }
  // True when the two literals are the same complementary pair.
  bool sameAtom(const Literal& other) const {
    return predicate == other.predicate && args == other.args;
  }
  bool operator==(const Literal& other) const {
    return sameAtom(other) && positive == other.positive;
  }
};

// A ground operator: no variables, because the planning graph and the SAT
// encoding of Section 2.5 both require every operator to be fully instantiated.
struct Operator {
  std::string name;
  std::vector<Literal> preconditions;
  std::vector<Literal> effects;
};

struct StripsProblem {
  std::vector<std::string> instances;   // I
  std::vector<std::string> predicates;  // P
  std::vector<Literal> atoms;           // the complementary pairs, in a fixed order
  std::vector<Operator> operators;      // O, ground
  std::vector<Literal> initial;         // S -- positive literals only
  std::vector<Literal> goal;            // G -- positive and negative literals

  // Position of a literal's atom in `atoms`, or -1 when the atom is unknown.
  int atomIndex(const Literal& l) const;

  std::string toString(const Literal& l) const;
  std::string toString(const Operator& o) const;
};

// A state is a bit mask over `atoms`: bit i is set iff atoms[i] holds
// positively.  Section 2.4.2 calls this the binary string representation.
using StripsState = unsigned long long;

StripsState initialMask(const StripsProblem& problem);
std::string maskToString(const StripsProblem& problem, StripsState mask);

// Example 2.6 -- putting two batteries into a flashlight.
//   atoms:      On(Cap, Flashlight), In(Battery1, Flashlight), In(Battery2, Flashlight)
//   operators:  PlaceCap, RemoveCap, Insert(Battery1), Insert(Battery2)
//   S = {On(Cap, Flashlight)}
//   G = {On(Cap, F), In(Battery1, F), In(Battery2, F)}
// The shortest plan is (RemoveCap, Insert(B1), Insert(B2), PlaceCap).
StripsProblem flashlightProblem();

// Book Exercise 14 -- a robot notices the room is dark, walks to the light
// switch, and flips it.
//   atoms:      At(Robot, Switch), On(Light), Dark(Room)
//   operators:  MoveToSwitch, MoveAway, FlipOn, FlipOff
StripsProblem lightSwitchProblem();

// --- Exercise 09 -----------------------------------------------------------

// Adapts a StripsProblem to the Problem interface of Section 2.1, so that the
// search methods of Section 2.2 run on it unchanged.  States are the bit masks
// above, reinterpreted as integers in [0, 2^|atoms|).
class StripsStateSpace : public Problem {
 public:
  explicit StripsStateSpace(StripsProblem problem);

  const StripsProblem& strips() const { return problem_; }

  // True when every precondition of `op` holds in `mask`.
  bool applicable(StripsState mask, const Operator& op) const;

  // The mask that results from applying `op`.  Atoms not mentioned in the
  // effects keep their value.  Undefined unless applicable() is true.
  StripsState apply(StripsState mask, const Operator& op) const;

  int numStates() const override;
  State initialState() const override;
  bool isGoal(State x) const override;
  std::vector<State> goalStates() const override;
  std::vector<Transition> successors(State x) const override;
  std::vector<Transition> predecessors(State x) const override;
  std::string name(State x) const override;

 private:
  StripsProblem problem_;
};

}  // namespace planning
