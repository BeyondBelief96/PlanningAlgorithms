// Reference solution -- Exercise 02: gated boundaries in the graph (Step 2).
//
// This is the exercise that makes the invariant enforceable.  After it runs,
// there is exactly one way for a route to change zone: through a vertex that is
// marked as a gate.  Everything downstream -- the permission set, the edge
// filter, the events, the stop points -- keys off those vertices.
#include <algorithm>
#include <cmath>
#include <set>

#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {
namespace {

// Where along [0, len] the zone class changes, to kZoneSplitTolerance.
std::vector<double> findZoneBreaks(const ZoneLayer& layer, const Vec2& a, const Vec2& b) {
  std::vector<double> breaks;
  const double len = distance(a, b);
  if (len < 2.0 * kZoneSplitTolerance) return breaks;
  const Vec2 u = (b - a) * (1.0 / len);
  const auto zoneAtS = [&](double s) { return zoneAt(layer, a + u * s).zone; };

  const int n = std::max(1, static_cast<int>(std::ceil(len / kZoneScanStep)));
  double previousS = 0.5 * len / n;
  ZoneClass previous = zoneAtS(previousS);
  for (int i = 1; i < n; ++i) {
    const double s = (static_cast<double>(i) + 0.5) * len / n;
    const ZoneClass here = zoneAtS(s);
    if (here != previous) {
      // Bisect for the boundary.  Every polygon is convex and the edge is a
      // straight line, so there is exactly one crossing in the bracket.
      double lo = previousS, hi = s;
      while (hi - lo > kZoneSplitTolerance) {
        const double mid = 0.5 * (lo + hi);
        if (zoneAtS(mid) == previous)
          lo = mid;
        else
          hi = mid;
      }
      breaks.push_back(0.5 * (lo + hi));
      previous = here;
    }
    previousS = s;
  }
  return breaks;
}

// Hotspot and closed flags for the sub-edge [s0, s1]: any sample counts.
void scanFlags(const ZoneLayer& layer, const Vec2& a, const Vec2& u, double s0, double s1,
               bool* hotspot, bool* closed) {
  const int n = std::max(1, static_cast<int>(std::ceil((s1 - s0) / kZoneScanStep)));
  for (int i = 0; i <= n; ++i) {
    const double s = s0 + (s1 - s0) * static_cast<double>(i) / static_cast<double>(n);
    const ZoneQuery q = zoneAt(layer, a + u * s);
    if (q.hotspot) *hotspot = true;
    if (q.closed) *closed = true;
  }
}

}  // namespace

TaxiGraph buildGatedGraph(const TaxiGraph& raw, const ZoneLayer& layer) {
  TaxiGraph out;
  for (const Vertex& v : raw.vertices()) out.addVertex(v.p, v.name);

  int splitCount = 0;
  for (const Edge& e : raw.edges()) {
    const Vec2 a = raw.vertex(e.from).p;
    const Vec2 b = raw.vertex(e.to).p;
    const double len = distance(a, b);
    if (len < kEps) continue;
    const Vec2 u = (b - a) * (1.0 / len);

    std::vector<double> cuts = findZoneBreaks(layer, a, b);
    std::vector<VertexId> chain{e.from};
    for (double s : cuts)
      chain.push_back(out.addVertex(a + u * s, "X" + std::to_string(++splitCount)));
    chain.push_back(e.to);

    std::vector<double> stations{0.0};
    stations.insert(stations.end(), cuts.begin(), cuts.end());
    stations.push_back(len);

    for (std::size_t i = 0; i + 1 < chain.size(); ++i) {
      const EdgeId id = out.addEdge(chain[i], chain[i + 1], e.taxiway);
      Edge& made = out.edge(id);
      made.oneWay = e.oneWay;
      made.maxWingspan = e.maxWingspan;
      made.maxWeightTonnes = e.maxWeightTonnes;
      made.zone = zoneAt(layer, a + u * (0.5 * (stations[i] + stations[i + 1]))).zone;
      scanFlags(layer, a, u, stations[i], stations[i + 1], &made.hotspot, &made.closed);
    }
  }
  out.build();

  // A vertex whose incident edges do not all agree on the zone is a boundary,
  // and a boundary on the graph is a gate.
  for (int vid = 0; vid < out.numVertices(); ++vid) {
    Vertex& v = out.vertex(vid);
    std::set<ZoneClass> zones;
    for (EdgeId id : out.incident(v.id)) zones.insert(out.edge(id).zone);
    if (zones.size() < 2) continue;

    ZoneClass inner = *zones.begin();
    ZoneClass outer = *zones.begin();
    for (ZoneClass z : zones) {
      if (zonePriority(z) < zonePriority(inner)) inner = z;
      if (zonePriority(z) > zonePriority(outer)) outer = z;
    }
    v.innerZone = inner;
    v.outerZone = outer;
    v.gate = policyFor(outer).requiresClearance ? GateKind::Hard : GateKind::Soft;

    // Which runway is on the far side?  Ask the zone layer at the midpoint of
    // an incident edge that lies in the outer zone, and read its identifiers.
    // While we are there, give the split vertex a name worth printing.
    for (EdgeId id : out.incident(v.id)) {
      if (out.edge(id).zone != outer) continue;
      const Segment g = out.geometry(id);
      const ZoneQuery q = zoneAt(layer, (g.a + g.b) * 0.5);
      if (v.name.empty() || v.name[0] == 'X') {
        v.name = policyFor(outer).requiresClearance && q.polygonId >= 0
                     ? "EDGE " + layer.polygon(q.polygonId).name
                     : out.edge(id).taxiway + " gate";
      }
      if (q.polygonId >= 0) v.protects = layer.polygon(q.polygonId).idents;
      if (!v.protects.empty()) break;
    }

    // Is there a painted holding position here?  That is what turns a zone
    // boundary into the thing a clearance can name.
    Aabb box;
    box.extend(v.p);
    for (int id : layer.holdShortCandidates(box.grown(1.0))) {
      const HoldShortLine& line = layer.holdShortLine(id);
      if (distancePointSegment(v.p, line.segment) > 0.5) continue;
      v.holdShortId = id;
      v.name = line.name;
      if (!line.protects.empty()) v.protects = line.protects;
      break;
    }
  }
  return out;
}

}  // namespace planning::airport
