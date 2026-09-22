// grid.hpp -- Example 2.1, the 2D grid labyrinth.
//
// Given library code.  This is the workhorse problem for the search exercises
// (and for book Exercises 18-21, which ask you to compare heuristics).
#pragma once

#include <string>
#include <utility>
#include <vector>

#include "planning/core.hpp"

namespace planning {

// A robot on an integer grid.  From (i, j) it may step to the four (optionally
// eight) neighbours that are inside the grid and not blocked.  Every step costs
// 1, except diagonal steps which cost sqrt(2) when eight-connectivity is on.
//
// States are row-major indices: index(r, c) == r * width + c.  Blocked cells
// still occupy a state index -- they simply have no successors and no
// predecessors -- which keeps |X| equal to width * height and makes the value
// iteration tables easy to read.
class GridProblem : public Problem {
 public:
  // Builds a grid from ASCII rows:
  //   '.' free    '#' blocked    'S' start (free)    'G' goal (free)
  // Multiple 'G' cells are allowed; exactly one 'S' is required.
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

  // |i - i'| + |j - j'| to the nearest goal.  Admissible for 4-connected grids
  // with unit step cost (book Exercise 18a).
  Heuristic manhattan() const;

  // sqrt((i - i')^2 + (j - j')^2) to the nearest goal (book Exercise 18b).
  Heuristic euclidean() const;

  // Draws the map with the plan's path marked by '*'.
  std::string render(const Plan& plan) const;

 private:
  int width_ = 0;
  int height_ = 0;
  bool eightConnected_ = false;
  std::vector<bool> blocked_;
  State initial_ = kNoState;
  std::vector<State> goals_;
};

// A few ready-made maps, so tests and demos agree on what they are talking about.
namespace maps {
const std::vector<std::string>& tiny();     //  7x5, one wall with a gap
const std::vector<std::string>& bugTrap();  // 15x11, a concave trap that punishes best-first
const std::vector<std::string>& openRoom(); // 20x12, wide open: many equal-cost optima
}  // namespace maps

}  // namespace planning
