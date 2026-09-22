// graph.hpp -- the guidance-line graph, and the directed-edge state space
// every on-graph search in the capstone runs over.
//
// Part of the *given* library.  The container is given; splitting the raw graph
// at zone boundaries (Step 2) is Exercise 02, and filtering it (Step 5) is
// Exercise 05.
#pragma once

#include <string>
#include <vector>

#include "planning/airport/geometry.hpp"
#include "planning/airport/zones.hpp"

namespace planning::airport {

using VertexId = int;
using EdgeId = int;

inline constexpr VertexId kNoVertex = -1;
inline constexpr EdgeId kNoEdge = -1;

// What crossing this vertex costs you.
//
//   None  an ordinary junction or a mid-line split
//   Soft  passable, but it generates a communication event and possibly a stop
//         (apron/taxiway, the movement/non-movement boundary, stand entry)
//   Hard  impassable unless the clearance names this crossing
enum class GateKind { None, Soft, Hard };

const char* toString(GateKind kind);

struct Vertex {
  VertexId id = kNoVertex;
  Vec2 p;
  std::string name;
  GateKind gate = GateKind::None;
  // For a hard gate: the runway identifiers on the far side, e.g. {"18", "36"}.
  std::vector<std::string> protects;
  // The hold-short line this gate sits on, or -1.  A hard gate without one is
  // a runway edge rather than a painted holding position.
  int holdShortId = -1;
  // What the gate separates, filled in by Exercise 02.
  ZoneClass innerZone = ZoneClass::Unknown;
  ZoneClass outerZone = ZoneClass::Unknown;
};

struct Edge {
  EdgeId id = kNoEdge;
  VertexId from = kNoVertex;
  VertexId to = kNoVertex;
  std::string taxiway;  // "A", "B", "RWY 09/27", "STAND 2", "APRON", "DEICE"
  ZoneClass zone = ZoneClass::Unknown;
  bool hotspot = false;
  bool closed = false;
  bool oneWay = false;        // when true, only from -> to may be travelled
  double maxWingspan = 80.0;  // metres
  double maxWeightTonnes = 600.0;
};

// A state of the on-graph search: an edge *and* the direction it is being
// travelled, so that heading is part of the state and a turn at a junction can
// be checked against the minimum turn radius.  Compare Chapter 2, where the
// state was just a vertex.
struct DirectedEdge {
  EdgeId edge = kNoEdge;
  bool forward = true;

  bool valid() const { return edge != kNoEdge; }
  // A dense index, so cost-to-go can live in a flat vector.
  int index() const { return edge * 2 + (forward ? 0 : 1); }
  DirectedEdge reversed() const { return {edge, !forward}; }
};

inline bool operator==(const DirectedEdge& a, const DirectedEdge& b) {
  return a.edge == b.edge && a.forward == b.forward;
}
inline bool operator!=(const DirectedEdge& a, const DirectedEdge& b) { return !(a == b); }

class TaxiGraph {
 public:
  VertexId addVertex(const Vec2& p, std::string name);
  EdgeId addEdge(VertexId from, VertexId to, std::string taxiway);

  int numVertices() const { return static_cast<int>(vertices_.size()); }
  int numEdges() const { return static_cast<int>(edges_.size()); }
  int numDirectedEdges() const { return 2 * numEdges(); }

  const std::vector<Vertex>& vertices() const { return vertices_; }
  const std::vector<Edge>& edges() const { return edges_; }
  // Bounds checked on purpose.  A half-written exercise hands these a kNoVertex
  // sooner or later, and a std::out_of_range the harness can report beats a
  // segfault that takes the rest of the test run with it.
  const Vertex& vertex(VertexId v) const { return vertices_.at(static_cast<std::size_t>(v)); }
  Vertex& vertex(VertexId v) { return vertices_.at(static_cast<std::size_t>(v)); }
  const Edge& edge(EdgeId e) const { return edges_.at(static_cast<std::size_t>(e)); }
  Edge& edge(EdgeId e) { return edges_.at(static_cast<std::size_t>(e)); }

  VertexId findVertex(const std::string& name) const;
  // The vertex within `tol` of p, or kNoVertex.
  VertexId vertexAt(const Vec2& p, double tol = 1e-6) const;

  Segment geometry(EdgeId e) const;
  double length(EdgeId e) const;

  // Tail and head of a directed edge, and the heading along it.
  VertexId tail(const DirectedEdge& d) const;
  VertexId head(const DirectedEdge& d) const;
  Vec2 tailPoint(const DirectedEdge& d) const;
  Vec2 headPoint(const DirectedEdge& d) const;
  double heading(const DirectedEdge& d) const;
  // The pose at arclength s from the tail.
  Pose poseAlong(const DirectedEdge& d, double s) const;
  // Arclength of the closest point on the edge to q, clamped to the edge.
  double projectOnto(const DirectedEdge& d, const Vec2& q) const;

  const std::vector<EdgeId>& incident(VertexId v) const;
  // Every directed edge that leaves v, honouring the one-way flag.
  std::vector<DirectedEdge> leaving(VertexId v) const;
  // Every directed edge that arrives at v, honouring the one-way flag.
  std::vector<DirectedEdge> arriving(VertexId v) const;

  // Rebuilds the incidence lists.  Call after a batch of addEdge() calls.
  void build();

 private:
  std::vector<Vertex> vertices_;
  std::vector<Edge> edges_;
  std::vector<std::vector<EdgeId>> incident_;
};

}  // namespace planning::airport
