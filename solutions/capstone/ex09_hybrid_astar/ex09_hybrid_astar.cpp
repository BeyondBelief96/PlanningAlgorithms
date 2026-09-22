// Reference solution -- Exercise 09: hybrid A* clipped to the start zone
// (Step 8, last rung).
//
// This is Chapter 2 Exercise 03 again -- the same priority queue, the same
// dead-state bookkeeping, the same admissible heuristic -- run over poses
// instead of integers.  Two things make it a *motion* planner rather than a
// graph search:
//
//   * the successors are motion primitives the aircraft can actually fly, so
//     every edge of the search tree is a feasible piece of path; and
//   * the search space is clipped to the polygons of the start zone, which is
//     what makes it physically unable to wander into another zone.
//
// The analytic expansion at the top of the loop is what makes the result exact:
// A* gets near the goal, and a Dubins curve finishes the job on the nose.
#include <algorithm>
#include <cmath>
#include <queue>
#include <unordered_map>
#include <vector>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

struct Node {
  Pose pose;
  double g = 0.0;
  int parent = -1;
  DubinsSegment move;  // the primitive that produced this node
};

long long latticeKey(const Pose& pose, const HybridAStarParams& params) {
  const double res = std::max(params.positionResolution, 0.1);
  const long long ix = static_cast<long long>(std::floor(pose.p.x / res));
  const long long iy = static_cast<long long>(std::floor(pose.p.y / res));
  const double binSize = 2.0 * kPi / static_cast<double>(std::max(params.headingBins, 1));
  const long long ih = static_cast<long long>(std::floor(wrapAngle2Pi(pose.heading) / binSize));
  return ((ix * 100003LL) + iy) * 1000LL + ih;
}

bool zoneAllowed(const ZoneLayer& cspace, const Vec2& p, const std::vector<ZoneClass>& allowed) {
  const ZoneClass zone = zoneAt(cspace, p).zone;
  return std::find(allowed.begin(), allowed.end(), zone) != allowed.end();
}

bool pathAllowed(const ZoneLayer& cspace, const Path& path, const std::vector<ZoneClass>& allowed) {
  if (path.empty()) return false;
  for (double s = 0.0; s <= path.length() + 1e-9; s += 2.0)
    if (!zoneAllowed(cspace, path.at(s).p, allowed)) return false;
  return zoneAllowed(cspace, path.samples.back().p, allowed);
}

}  // namespace

MergePath planHybridAStar(const ZoneLayer& cspace, const Pose& start,
                          const MergeCandidate& candidate,
                          const std::vector<ZoneClass>& allowedZones,
                          const HybridAStarParams& params) {
  MergePath result;
  if (allowedZones.empty()) return result;
  if (!zoneAllowed(cspace, start.p, allowedZones)) return result;

  // The three primitives: straight, and one arc each way at a fixed radius.
  const double step = std::max(params.primitiveLength, 1.0);
  const double radius = std::max(params.radius, 1.0);
  const double sweep = step / radius;
  DubinsSegment moves[3];
  moves[0].isArc = false;
  moves[0].length = step;
  moves[1] = DubinsSegment{true, radius, sweep, step};
  moves[2] = DubinsSegment{true, -radius, -sweep, step};

  std::vector<Node> nodes;
  std::unordered_map<long long, double> best;
  using Entry = std::pair<double, int>;
  std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> open;

  nodes.push_back(Node{start, 0.0, -1, DubinsSegment{}});
  best[latticeKey(start, params)] = 0.0;
  open.push({distance(start.p, candidate.target.p), 0});

  int expansions = 0;
  int reached = -1;
  Path tail;
  while (!open.empty() && expansions < params.maxExpansions) {
    const auto [priority, index] = open.top();
    open.pop();
    (void)priority;
    const Node node = nodes[static_cast<std::size_t>(index)];
    const auto found = best.find(latticeKey(node.pose, params));
    if (found != best.end() && node.g > found->second + 1e-9) continue;  // stale entry
    ++expansions;

    // Analytic expansion: try to finish exactly, with a Dubins curve.
    const DubinsPath dubins = dubinsShortestPath(node.pose, candidate.target, radius);
    if (dubins.found) {
      Path closing = renderDubins(node.pose, dubins, 1.0);
      if (!closing.empty() && pathAllowed(cspace, closing, allowedZones)) {
        reached = index;
        tail = std::move(closing);
        break;
      }
    }

    for (const DubinsSegment& move : moves) {
      Path segment = move.isArc ? arcPath(node.pose, move.signedRadius, move.sweep, 1.0)
                                : straightPath(node.pose, move.length, 1.0);
      if (segment.empty()) continue;
      if (!pathAllowed(cspace, segment, allowedZones)) continue;

      Node child;
      child.pose = advance(node.pose, move);
      child.g = node.g + move.length * (move.isArc ? params.turnPenalty : 1.0);
      child.parent = index;
      child.move = move;

      const long long key = latticeKey(child.pose, params);
      const auto seen = best.find(key);
      if (seen != best.end() && seen->second <= child.g + 1e-9) continue;
      best[key] = child.g;
      nodes.push_back(child);
      // Euclidean distance never overestimates the arclength that remains, so
      // the search is optimal on the lattice for the same reason A* is.
      open.push({child.g + distance(child.pose.p, candidate.target.p),
                 static_cast<int>(nodes.size()) - 1});
    }
  }

  if (reached < 0) {
    result.detail = "hybrid A* exhausted " + std::to_string(expansions) + " expansions";
    return result;
  }

  // Walk the parents back and render the primitives forward.
  std::vector<int> chain;
  for (int i = reached; i >= 0; i = nodes[static_cast<std::size_t>(i)].parent) chain.push_back(i);
  std::reverse(chain.begin(), chain.end());

  std::vector<Path> parts;
  for (std::size_t i = 1; i < chain.size(); ++i) {
    const Node& node = nodes[static_cast<std::size_t>(chain[i])];
    const Node& from = nodes[static_cast<std::size_t>(chain[i - 1])];
    parts.push_back(node.move.isArc
                        ? arcPath(from.pose, node.move.signedRadius, node.move.sweep, 1.0)
                        : straightPath(from.pose, node.move.length, 1.0));
  }
  parts.push_back(tail);

  result.found = true;
  result.method = MergeMethod::HybridAStar;
  result.path = concatenatePaths(parts);
  result.cost = result.path.length() + 20.0 * result.path.totalTurning();
  result.detail = "hybrid A* in " + std::to_string(expansions) +
                  (expansions == 1 ? " expansion" : " expansions");
  return result;
}

}  // namespace planning::airport
