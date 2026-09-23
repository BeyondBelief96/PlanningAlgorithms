#include "planning/grid.hpp"

#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace planning {
namespace {

// Action ordering: N, E, S, W, then NE, SE, SW, NW.  North is row 0.
constexpr int kDeltaRow[8] = {-1, 0, 1, 0, -1, 1, 1, -1};
constexpr int kDeltaCol[8] = {0, 1, 0, -1, 1, 1, -1, -1};

}  // namespace

GridProblem GridProblem::fromAscii(const std::vector<std::string>& rows, bool eightConnected) {
  if (rows.empty()) throw std::invalid_argument("GridProblem::fromAscii: no rows");
  GridProblem g;
  g.height_ = static_cast<int>(rows.size());
  g.width_ = static_cast<int>(rows[0].size());
  g.eightConnected_ = eightConnected;
  g.blocked_.assign(static_cast<std::size_t>(g.width_) * g.height_, false);

  for (int r = 0; r < g.height_; ++r) {
    if (static_cast<int>(rows[r].size()) != g.width_)
      throw std::invalid_argument("GridProblem::fromAscii: ragged rows");
    for (int c = 0; c < g.width_; ++c) {
      const char ch = rows[r][c];
      const State x = g.index(r, c);
      switch (ch) {
        case '#': g.blocked_[x] = true; break;
        case 'S':
          if (g.initial_ != kNoState)
            throw std::invalid_argument("GridProblem::fromAscii: more than one 'S'");
          g.initial_ = x;
          break;
        case 'G': g.goals_.push_back(x); break;
        case '.': break;
        default: throw std::invalid_argument("GridProblem::fromAscii: unexpected character");
      }
    }
  }
  if (g.initial_ == kNoState) throw std::invalid_argument("GridProblem::fromAscii: no 'S'");
  if (g.goals_.empty()) throw std::invalid_argument("GridProblem::fromAscii: no 'G'");
  return g;
}

bool GridProblem::blocked(int r, int c) const {
  if (r < 0 || r >= height_ || c < 0 || c >= width_) return true;
  return blocked_[index(r, c)];
}

int GridProblem::numStates() const { return width_ * height_; }
State GridProblem::initialState() const { return initial_; }

bool GridProblem::isGoal(State x) const {
  return std::find(goals_.begin(), goals_.end(), x) != goals_.end();
}

std::vector<State> GridProblem::goalStates() const { return goals_; }

std::vector<Transition> GridProblem::successors(State x) const {
  std::vector<Transition> result;
  if (x < 0 || x >= numStates() || blocked_[x]) return result;
  const auto [r, c] = coords(x);
  const int n = eightConnected_ ? 8 : 4;
  for (int u = 0; u < n; ++u) {
    const int nr = r + kDeltaRow[u];
    const int nc = c + kDeltaCol[u];
    if (blocked(nr, nc)) continue;
    const double cost = u < 4 ? 1.0 : std::sqrt(2.0);
    result.push_back({u, index(nr, nc), cost});
  }
  return result;
}

std::vector<Transition> GridProblem::predecessors(State x) const {
  // The grid's action set is symmetric: u leads from x' to x exactly when the
  // opposite action leads from x to x'.  We still report u, the action that
  // must be applied at x' -- that is what Transition means for a predecessor.
  //
  // Enjoy it while it lasts.  The moment the state carries a heading, as it
  // does in the capstone, backwards stops being forwards reversed.
  std::vector<Transition> result;
  if (x < 0 || x >= numStates() || blocked_[x]) return result;
  const auto [r, c] = coords(x);
  const int n = eightConnected_ ? 8 : 4;
  for (int u = 0; u < n; ++u) {
    // x' is the cell you would have to stand in to reach x by applying u.
    const int pr = r - kDeltaRow[u];
    const int pc = c - kDeltaCol[u];
    if (blocked(pr, pc)) continue;
    const double cost = u < 4 ? 1.0 : std::sqrt(2.0);
    result.push_back({u, index(pr, pc), cost});
  }
  return result;
}

std::string GridProblem::name(State x) const {
  const auto [r, c] = coords(x);
  return "(" + std::to_string(r) + "," + std::to_string(c) + ")";
}

Heuristic GridProblem::manhattan() const {
  const int w = width_;
  std::vector<State> goals = goals_;
  return [w, goals](State x) {
    double best = kInfinity;
    for (State g : goals) {
      const double d = std::abs(x / w - g / w) + std::abs(x % w - g % w);
      best = std::min(best, d);
    }
    return best;
  };
}

Heuristic GridProblem::euclidean() const {
  const int w = width_;
  std::vector<State> goals = goals_;
  return [w, goals](State x) {
    double best = kInfinity;
    for (State g : goals) {
      const double dr = x / w - g / w;
      const double dc = x % w - g % w;
      best = std::min(best, std::sqrt(dr * dr + dc * dc));
    }
    return best;
  };
}

std::string GridProblem::render(const Plan& plan) const {
  std::vector<bool> onPath(numStates(), false);
  for (State x : plan.states)
    if (x >= 0 && x < numStates()) onPath[x] = true;

  std::string out;
  for (int r = 0; r < height_; ++r) {
    for (int c = 0; c < width_; ++c) {
      const State x = index(r, c);
      if (x == initial_) out += 'S';
      else if (isGoal(x)) out += 'G';
      else if (blocked_[x]) out += '#';
      else if (onPath[x]) out += '*';
      else out += '.';
    }
    out += '\n';
  }
  return out;
}

namespace maps {

const std::vector<std::string>& standArea() {
  // A stand at the top left, a pier building running down the middle, and the
  // holding position on the far side of it.  The shortest route is nine moves
  // rather than the seven the crow would fly, because the pier is in the way.
  //
  //     .......     row 0   apron lane along the top of the pier
  //     .S..#..     row 1   S on stand, '#' the pier
  //     ....#..     row 2
  //     ....#.G     row 3   G holding short, east of the pier
  //     .......     row 4   apron lane along the bottom
  static const std::vector<std::string> m = {
      ".......",
      ".S..#..",
      "....#..",
      "....#.G",
      ".......",
  };
  return m;
}

const std::vector<std::string>& deadEndPier() {
  // A row of stands inside a pier that is closed on three sides, with its one
  // opening facing west -- away from the holding position in the south-east.
  //
  // Any method that only steers towards the goal taxis east, wedges the
  // aeroplane against the inside of the pier, and has to exhaust the whole
  // pocket before it will accept a move that increases the distance to the
  // goal.  This is the surface equivalent of taxiing into a cul-de-sac between
  // two piers and needing a tow to get out.
  //
  // It still finds the shortest route here, because once it escapes there is
  // only one way round.  Building a surface where the greedy method comes back
  // with a route that is genuinely longer is book Exercise 2 -- see
  // docs/ch02/03-search-methods.md.
  //
  // Straight-line distance from S to G is 14 squares.  The shortest route is 28
  // moves: exactly twice as far, all of it spent getting out of the pier.
  static const std::vector<std::string> m = {
      ".....................",
      ".....................",
      "..###############....",
      "..#.............#....",
      "..#.............#....",
      "........S.......#....",
      "..#.............#....",
      "..###############....",
      ".....................",
      "..................G..",
  };
  return m;
}

const std::vector<std::string>& openApron() {
  // Open apron with one blocked corner -- a closed stand and the pavement
  // behind it.  Nothing here is hard to get round; what makes this surface
  // interesting is that there are hundreds of routes of *exactly* equal cost
  // between S and G, so an uninformed method fans out over the whole apron and
  // an informed one need not.
  static const std::vector<std::string> m = {
      "....................",
      "....................",
      "..S.................",
      "....................",
      "....................",
      "..........#####.....",
      "..........#.........",
      "..........#.........",
      "....................",
      "....................",
      ".................G..",
      "....................",
  };
  return m;
}

}  // namespace maps
}  // namespace planning
