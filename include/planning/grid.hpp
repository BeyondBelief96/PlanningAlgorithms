// grid.hpp -- The airport surface as an occupancy grid.
//
// Given library code, and the workhorse problem for the search exercises.  Long
// before anyone draws a guidance line, a surface is a coarse grid of squares
// that are either pavement you may use or something you may not drive over:
// grass, a building, a stand that is occupied, pavement that is closed for
// works.  That is the crudest useful model of an airport, and it is enough to
// make every search method of Section 2.2 behave differently.
//
// [book] LaValle Example 2.1, the 2D grid labyrinth; book Exercises 18-21 are
// the heuristic comparisons the maps below are built for.
#pragma once

#include <string>
#include <utility>
#include <vector>

#include "planning/core.hpp"

namespace planning {

// An aircraft on a grid of pavement squares.  From (i, j) it may move to the
// four (optionally eight) neighbouring squares that are on the map and paved.
// Every move costs 1, except diagonal moves, which cost sqrt(2) when
// eight-connectivity is on.
//
// The aeroplane is a point here, it can turn on the spot, and a square is
// either wholly usable or wholly not.  All three of those are lies, and the
// capstone spends twelve exercises undoing them.  They buy you a state space
// small enough to print.
//
// States are row-major indices: index(r, c) == r * width + c.  Unpaved squares
// still occupy a state index -- they simply have no successors and no
// predecessors -- which keeps |X| equal to width * height and makes the value
// iteration tables easy to read.
class GridProblem : public Problem {
 public:
  // Builds a surface from ASCII rows:
  //   '.'  pavement the aircraft may use
  //   '#'  not movement area: grass, a building, closed or occupied pavement
  //   'S'  where the aircraft is now (paved)
  //   'G'  where it is trying to get to -- a holding position or a stand (paved)
  // Multiple 'G' squares are allowed; exactly one 'S' is required.
  static GridProblem fromAscii(const std::vector<std::string>& rows, bool eightConnected = false);

  int width() const { return width_; }
  int height() const { return height_; }
  bool blocked(int r, int c) const;
  State index(int r, int c) const { return r * width_ + c; }
  std::pair<int, int> coords(State x) const { return {x / width_, x % width_}; }

  int numStates() const override;
  State initialState() const override;
  bool isGoal(State x) const override;
  std::vector<State> goalStates() const override;
  std::vector<Transition> successors(State x) const override;
  std::vector<Transition> predecessors(State x) const override;
  std::string name(State x) const override;

  // |i - i'| + |j - j'| to the nearest goal: how far it would be if the
  // pavement between here and there were clear and you could only turn square
  // corners.  Never an overestimate on a 4-connected grid with unit moves.
  // [book] Exercise 18(a).
  Heuristic manhattan() const;

  // sqrt((i - i')^2 + (j - j')^2) to the nearest goal -- the straight line an
  // aeroplane cannot actually taxi.  Admissible, but weaker.  [book] 18(b).
  Heuristic euclidean() const;

  // Draws the surface with the taxi route marked by '*'.
  std::string render(const Plan& plan) const;

 private:
  int width_ = 0;
  int height_ = 0;
  bool eightConnected_ = false;
  std::vector<bool> blocked_;
  State initial_ = kNoState;
  std::vector<State> goals_;
};

// Three ready-made surfaces, so tests, demos and guides agree on what they are
// talking about.  Each exists to make a different search method look bad.
namespace maps {

// 7x5.  A stand, a pier building between it and the taxiway, one way round.
// Small enough to trace an algorithm on by hand.
const std::vector<std::string>& standArea();

// 21x10.  A row of stands walled in by a pier on three sides, opening away from
// the holding position.  Punishes any method that only steers towards the goal.
const std::vector<std::string>& deadEndPier();

// 20x12.  Wide-open apron: hundreds of routes of exactly equal cost, which is
// where a good heuristic earns its keep.
const std::vector<std::string>& openApron();

}  // namespace maps

}  // namespace planning
