// graphs.hpp -- Explicitly enumerated state transition graphs.
//
// Given library code.  Two hand-sized taxi graphs: a departure taxi out to the
// holding position, and a route choice between a long leg and a bypass.  They
// are sketches -- minutes on a napkin, not metres on a chart -- and they exist
// so that you can check a cost table by eye.
//
// Both are relabellings of the worked examples in LaValle Chapter 2 (Figures
// 2.8 and 2.21), edge for edge and cost for cost, so every number the book
// prints is still a number your code has to produce.  See docs/ch02/00-notation.md.
#pragma once

#include <string>
#include <vector>

#include "planning/core.hpp"

namespace planning {

// A Problem backed by an adjacency list.  The action index u is simply the
// position of the edge in the out-edge list of the originating state, so
// U(x) = {0, 1, ..., outDegree(x) - 1}.
class GraphProblem : public Problem {
 public:
  GraphProblem(std::vector<std::string> stateNames, State initial, std::vector<State> goals);

  void addEdge(State from, State to, double cost);
  void addEdge(const std::string& from, const std::string& to, double cost);

  State stateByName(const std::string& n) const;  // kNoState if unknown

  int numStates() const override;
  State initialState() const override;
  bool isGoal(State x) const override;
  std::vector<State> goalStates() const override;
  std::vector<Transition> successors(State x) const override;
  std::vector<Transition> predecessors(State x) const override;
  std::string name(State x) const override;

  void setInitialState(State x) { initial_ = x; }
  void setGoalStates(std::vector<State> g) { goals_ = std::move(g); }

 private:
  struct Edge {
    State to;
    double cost;
  };
  std::vector<std::string> names_;
  std::vector<std::vector<Edge>> out_;
  State initial_;
  std::vector<State> goals_;
};

// The departure taxi.  An aeroplane on stand 2 has to reach the holding
// position short of runway 27 at taxiway E.
//
//        STAND 2 --(2)-> STAND 2      hold at the stand, engines running
//        STAND 2 --(2)-> APRON        push back and start the taxi
//        APRON   --(1)-> TWY A        turn onto the parallel taxiway
//        APRON   --(4)-> HS 27 E      the long way round, on the apron lanes
//        TWY A   --(1)-> HS 27 E      up to the holding position
//        TWY A   --(1)-> STAND 2      give up and go back to the stand
//        HS 27 E --(1)-> TWY A        abandon the crossing, back onto A
//        HS 27 E --(1)-> RWY 27       line up, once cleared
//
// Costs are minutes.  RWY 27 has no outgoing edges: an aeroplane that has
// entered the runway has left the taxi problem, and there is no legal edge that
// brings it back to the holding position.  That is why every table in Section
// 2.3 shows infinity in the RWY 27 column.
//
// Defaults: x_I = STAND 2, X_G = {HS 27 E} -- a departure taxi is finished when
// the aeroplane is holding short, not when it is airborne.
//
// [book] LaValle Figure 2.8, with a b c d e renamed in that order.
GraphProblem departureTaxi();

// The route choice.  Stand 1 to the holding position short of runway 36 at the
// west side, where the obvious route is not the quick one.
//
//        STAND 1 --(2)-> APRON
//        APRON   --(1)-> STAND 1      return to stand
//        APRON   --(4)-> TWY A
//        TWY A   --(3)-> TWY B        cut north on the connector
//        TWY A   --(7)-> HS 36 W      stay on A, all the way round the field
//        TWY B   --(1)-> TWY A
//        TWY B   --(1)-> TWY B        hold on B
//        TWY B   --(1)-> HS 36 W
//
// Staying on A is three legs and thirteen minutes.  Cutting north through B is
// four legs and ten.  Fewest turns is not quickest, and this graph is built to
// make an algorithm choose.
//
// Defaults: x_I = STAND 1, X_G = {HS 36 W}.
//
// [book] LaValle Figure 2.21, the graph of book Exercise 1.
GraphProblem bypassTaxi();

}  // namespace planning
