// strips.hpp -- Describing a task instead of drawing its state space.
//
// The taxi is only half of a turnaround.  Before an aeroplane can go anywhere
// somebody has to load the hold and shut the door, connect and then pull the
// ground power, fit and then remove the towbar, take out the chocks.  Those
// jobs have preconditions and effects rather than coordinates, and writing
// their state space down by hand is hopeless: ten yes/no facts about a
// turnaround already make 1024 states.
//
// So you describe the facts and the jobs, and let the state space be implied.
// That description is what Section 2.4 formalises.  The data types and the two
// example models below are given; turning one into a state space you can search
// (Section 2.4.2) is Exercise 09.
//
// [book] LaValle Section 2.4, Formulation 2.4.
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

// Loading the hold: two containers to go in, and the door has to end up shut.
//
//   atoms:      Closed(Door, Hold), Loaded(ULD1, Hold), Loaded(ULD2, Hold)
//   operators:  CloseDoor, OpenDoor, Load(ULD1), Load(ULD2)
//   S = {Closed(Door, Hold)}                     the aeroplane arrives shut
//   G = {Closed(Door, Hold), Loaded(ULD1, Hold), Loaded(ULD2, Hold)}
//
// The shortest plan is (OpenDoor, Load(ULD1), Load(ULD2), CloseDoor) -- four
// jobs, and the first of them *undoes* part of the goal.  A planner that
// refuses to move away from the goal never solves this, which is the whole
// reason the example is here.
//
// A ULD is a unit load device, the container an aeroplane's hold is loaded in.
//
// [book] LaValle Example 2.6, the flashlight, relabelled atom for atom:
// On(Cap) -> Closed(Door), In(Battery_i) -> Loaded(ULD_i).
StripsProblem cargoHoldProblem();

// Ground power: the aeroplane is running off its own battery, and somebody has
// to walk to the panel and connect the ground power unit.
//
//   atoms:      At(Crew, Panel), Connected(Gpu, Aircraft), OnBattery(Aircraft)
//   operators:  WalkToPanel, WalkAway, ConnectGpu, DisconnectGpu
//   S = {OnBattery(Aircraft)}
//   G = {Connected(Gpu, Aircraft), !OnBattery(Aircraft)}
//
// Small enough to trace by hand, and the plan is (WalkToPanel, ConnectGpu).
// Note that the goal names a *negative* literal, which the cargo hold does not.
//
// [book] LaValle book Exercise 14, the light switch: At(Robot, Switch) ->
// At(Crew, Panel), On(Light) -> Connected(Gpu), Dark(Room) -> OnBattery.
StripsProblem groundPowerProblem();

// --- Exercise 09 -----------------------------------------------------------

// Adapts a StripsProblem to the same Problem interface the taxi graphs use, so
// that every search method you wrote for Section 2.2 runs on a turnaround
// description unchanged.  States are the bit masks above, reinterpreted as
// integers in [0, 2^|atoms|).
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
