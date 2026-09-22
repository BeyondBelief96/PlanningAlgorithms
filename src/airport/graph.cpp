// graph.cpp -- the given guidance-line graph container.
#include "planning/airport/graph.hpp"

#include <algorithm>

namespace planning::airport {

const char* toString(GateKind kind) {
  switch (kind) {
    case GateKind::None:
      return "none";
    case GateKind::Soft:
      return "soft";
    case GateKind::Hard:
      return "hard";
  }
  return "none";
}

VertexId TaxiGraph::addVertex(const Vec2& p, std::string name) {
  Vertex v;
  v.id = static_cast<VertexId>(vertices_.size());
  v.p = p;
  v.name = std::move(name);
  vertices_.push_back(std::move(v));
  return vertices_.back().id;
}

EdgeId TaxiGraph::addEdge(VertexId from, VertexId to, std::string taxiway) {
  Edge e;
  e.id = static_cast<EdgeId>(edges_.size());
  e.from = from;
  e.to = to;
  e.taxiway = std::move(taxiway);
  edges_.push_back(std::move(e));
  return edges_.back().id;
}

VertexId TaxiGraph::findVertex(const std::string& name) const {
  for (const Vertex& v : vertices_)
    if (v.name == name) return v.id;
  return kNoVertex;
}

VertexId TaxiGraph::vertexAt(const Vec2& p, double tol) const {
  for (const Vertex& v : vertices_)
    if (distance(v.p, p) <= tol) return v.id;
  return kNoVertex;
}

Segment TaxiGraph::geometry(EdgeId id) const {
  const Edge& e = edge(id);
  return Segment{vertex(e.from).p, vertex(e.to).p};
}

double TaxiGraph::length(EdgeId id) const { return geometry(id).length(); }

VertexId TaxiGraph::tail(const DirectedEdge& d) const {
  const Edge& e = edge(d.edge);
  return d.forward ? e.from : e.to;
}

VertexId TaxiGraph::head(const DirectedEdge& d) const {
  const Edge& e = edge(d.edge);
  return d.forward ? e.to : e.from;
}

Vec2 TaxiGraph::tailPoint(const DirectedEdge& d) const { return vertex(tail(d)).p; }
Vec2 TaxiGraph::headPoint(const DirectedEdge& d) const { return vertex(head(d)).p; }

double TaxiGraph::heading(const DirectedEdge& d) const {
  return angleOf(headPoint(d) - tailPoint(d));
}

Pose TaxiGraph::poseAlong(const DirectedEdge& d, double s) const {
  const Vec2 a = tailPoint(d);
  const Vec2 b = headPoint(d);
  const double len = distance(a, b);
  const double t = len < kEps ? 0.0 : std::clamp(s, 0.0, len) / len;
  return Pose{a + (b - a) * t, angleOf(b - a)};
}

double TaxiGraph::projectOnto(const DirectedEdge& d, const Vec2& q) const {
  const Vec2 a = tailPoint(d);
  const Vec2 b = headPoint(d);
  const Vec2 ab = b - a;
  const double dd = dot(ab, ab);
  if (dd < kEps) return 0.0;
  return std::clamp(dot(q - a, ab) / dd, 0.0, 1.0) * std::sqrt(dd);
}

const std::vector<EdgeId>& TaxiGraph::incident(VertexId v) const {
  static const std::vector<EdgeId> kEmpty;
  const std::size_t i = static_cast<std::size_t>(v);
  return i < incident_.size() ? incident_[i] : kEmpty;
}

std::vector<DirectedEdge> TaxiGraph::leaving(VertexId v) const {
  std::vector<DirectedEdge> out;
  for (EdgeId e : incident(v)) {
    const Edge& edgeRef = edge(e);
    if (edgeRef.from == v) out.push_back({e, true});
    if (edgeRef.to == v && !edgeRef.oneWay) out.push_back({e, false});
  }
  return out;
}

std::vector<DirectedEdge> TaxiGraph::arriving(VertexId v) const {
  std::vector<DirectedEdge> out;
  for (EdgeId e : incident(v)) {
    const Edge& edgeRef = edge(e);
    if (edgeRef.to == v) out.push_back({e, true});
    if (edgeRef.from == v && !edgeRef.oneWay) out.push_back({e, false});
  }
  return out;
}

void TaxiGraph::build() {
  incident_.assign(vertices_.size(), {});
  for (const Edge& e : edges_) {
    // .at(), so that an edge pointing at a vertex that does not exist is a
    // reportable error rather than a crash in somebody else's test.
    incident_.at(static_cast<std::size_t>(e.from)).push_back(e.id);
    if (e.to != e.from) incident_.at(static_cast<std::size_t>(e.to)).push_back(e.id);
  }
}

}  // namespace planning::airport
