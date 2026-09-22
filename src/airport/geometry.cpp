// geometry.cpp -- implementation of the given 2D primitives.
#include "planning/airport/geometry.hpp"

#include <algorithm>
#include <limits>

namespace planning::airport {
namespace {

// Solves  n0 . q = c0,  n1 . q = c1.  Returns false when the lines are parallel.
bool intersectLines(const Vec2& n0, double c0, const Vec2& n1, double c1, Vec2* out) {
  const double det = cross(n0, n1);
  if (std::fabs(det) < 1e-12) return false;
  out->x = (c0 * n1.y - c1 * n0.y) / det;
  out->y = (n0.x * c1 - n1.x * c0) / det;
  return true;
}

int orientation(const Vec2& a, const Vec2& b, const Vec2& c) {
  const double v = cross(b - a, c - a);
  if (v > 1e-12) return 1;
  if (v < -1e-12) return -1;
  return 0;
}

bool onSegment(const Vec2& a, const Vec2& b, const Vec2& p) {
  return std::min(a.x, b.x) - 1e-12 <= p.x && p.x <= std::max(a.x, b.x) + 1e-12 &&
         std::min(a.y, b.y) - 1e-12 <= p.y && p.y <= std::max(a.y, b.y) + 1e-12;
}

}  // namespace

Vec2 normalized(const Vec2& a) {
  const double n = norm(a);
  return n < kEps ? Vec2{0.0, 0.0} : Vec2{a.x / n, a.y / n};
}

Vec2 rotate(const Vec2& a, double theta) {
  const double c = std::cos(theta), s = std::sin(theta);
  return {a.x * c - a.y * s, a.x * s + a.y * c};
}

double wrapAngle(double theta) {
  double t = std::fmod(theta + kPi, 2.0 * kPi);
  if (t <= 0.0) t += 2.0 * kPi;
  return t - kPi;
}

double wrapAngle2Pi(double theta) {
  double t = std::fmod(theta, 2.0 * kPi);
  if (t < 0.0) t += 2.0 * kPi;
  return t;
}

double crossTrack(const Pose& frame, const Vec2& q) { return dot(q - frame.p, frame.left()); }
double alongTrack(const Pose& frame, const Vec2& q) { return dot(q - frame.p, frame.forward()); }

// --- boxes -----------------------------------------------------------------

void Aabb::extend(const Vec2& p) {
  lo.x = std::min(lo.x, p.x);
  lo.y = std::min(lo.y, p.y);
  hi.x = std::max(hi.x, p.x);
  hi.y = std::max(hi.y, p.y);
}

void Aabb::extend(const Aabb& other) {
  if (other.empty()) return;
  extend(other.lo);
  extend(other.hi);
}

bool Aabb::overlaps(const Aabb& other) const {
  if (empty() || other.empty()) return false;
  return lo.x <= other.hi.x && other.lo.x <= hi.x && lo.y <= other.hi.y && other.lo.y <= hi.y;
}

bool Aabb::contains(const Vec2& p) const {
  return !empty() && lo.x <= p.x && p.x <= hi.x && lo.y <= p.y && p.y <= hi.y;
}

// --- segments --------------------------------------------------------------

double distancePointSegment(const Vec2& p, const Segment& s) {
  const Vec2 d = s.delta();
  const double dd = dot(d, d);
  if (dd < kEps) return distance(p, s.a);
  double t = dot(p - s.a, d) / dd;
  t = std::clamp(t, 0.0, 1.0);
  return distance(p, s.at(t));
}

bool segmentsIntersect(const Segment& s, const Segment& t) {
  const int o1 = orientation(s.a, s.b, t.a);
  const int o2 = orientation(s.a, s.b, t.b);
  const int o3 = orientation(t.a, t.b, s.a);
  const int o4 = orientation(t.a, t.b, s.b);
  if (o1 != o2 && o3 != o4) return true;
  if (o1 == 0 && onSegment(s.a, s.b, t.a)) return true;
  if (o2 == 0 && onSegment(s.a, s.b, t.b)) return true;
  if (o3 == 0 && onSegment(t.a, t.b, s.a)) return true;
  if (o4 == 0 && onSegment(t.a, t.b, s.b)) return true;
  return false;
}

// --- polygons --------------------------------------------------------------

Polygon makeRectangle(double x0, double y0, double x1, double y1) {
  return {{x0, y0}, {x1, y0}, {x1, y1}, {x0, y1}};
}

double signedArea(const Polygon& poly) {
  double a = 0.0;
  for (std::size_t i = 0; i < poly.size(); ++i) {
    const Vec2& p = poly[i];
    const Vec2& q = poly[(i + 1) % poly.size()];
    a += cross(p, q);
  }
  return 0.5 * a;
}

Polygon makeCounterClockwise(Polygon poly) {
  if (signedArea(poly) < 0.0) std::reverse(poly.begin(), poly.end());
  return poly;
}

Aabb boundsOf(const Polygon& poly) {
  Aabb box;
  for (const Vec2& p : poly) box.extend(p);
  return box;
}

Vec2 centroidOf(const Polygon& poly) {
  const double a = signedArea(poly);
  if (std::fabs(a) < kEps) {
    Vec2 sum{};
    for (const Vec2& p : poly) sum = sum + p;
    return poly.empty() ? Vec2{} : sum * (1.0 / static_cast<double>(poly.size()));
  }
  Vec2 c{};
  for (std::size_t i = 0; i < poly.size(); ++i) {
    const Vec2& p = poly[i];
    const Vec2& q = poly[(i + 1) % poly.size()];
    c = c + (p + q) * cross(p, q);
  }
  return c * (1.0 / (6.0 * a));
}

bool polygonContains(const Polygon& poly, const Vec2& p) {
  if (poly.size() < 3) return false;
  bool inside = false;
  for (std::size_t i = 0, j = poly.size() - 1; i < poly.size(); j = i++) {
    const Vec2& a = poly[i];
    const Vec2& b = poly[j];
    if ((a.y > p.y) != (b.y > p.y)) {
      const double xCross = (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x;
      if (p.x < xCross) inside = !inside;
    }
  }
  return inside;
}

double distanceToBoundary(const Polygon& poly, const Vec2& p) {
  double best = std::numeric_limits<double>::infinity();
  for (std::size_t i = 0; i < poly.size(); ++i) {
    const Segment e{poly[i], poly[(i + 1) % poly.size()]};
    best = std::min(best, distancePointSegment(p, e));
  }
  return best;
}

double distanceOutsidePolygon(const Polygon& poly, const Vec2& p) {
  if (polygonContains(poly, p)) return 0.0;
  return distanceToBoundary(poly, p);
}

bool segmentIntersectsPolygon(const Polygon& poly, const Segment& s) {
  if (polygonContains(poly, s.a) || polygonContains(poly, s.b)) return true;
  for (std::size_t i = 0; i < poly.size(); ++i) {
    const Segment e{poly[i], poly[(i + 1) % poly.size()]};
    if (segmentsIntersect(e, s)) return true;
  }
  return false;
}

bool polygonsOverlap(const Polygon& a, const Polygon& b) {
  for (const Vec2& p : a)
    if (polygonContains(b, p)) return true;
  for (const Vec2& p : b)
    if (polygonContains(a, p)) return true;
  for (std::size_t i = 0; i < a.size(); ++i) {
    const Segment ea{a[i], a[(i + 1) % a.size()]};
    for (std::size_t j = 0; j < b.size(); ++j) {
      const Segment eb{b[j], b[(j + 1) % b.size()]};
      if (segmentsIntersect(ea, eb)) return true;
    }
  }
  return false;
}

Polygon offsetConvex(const Polygon& poly, double delta) {
  if (poly.size() < 3) return {};
  if (std::fabs(delta) < kEps) return poly;
  const Polygon ccw = makeCounterClockwise(poly);
  const std::size_t n = ccw.size();

  // Outward normal and offset constant for every edge.  With counter-clockwise
  // winding the outward side of an edge is the one perpRight points to.
  std::vector<Vec2> normal(n);
  std::vector<double> constant(n);
  for (std::size_t i = 0; i < n; ++i) {
    const Vec2 d = ccw[(i + 1) % n] - ccw[i];
    normal[i] = normalized(perpRight(d));
    constant[i] = dot(ccw[i], normal[i]) + delta;
  }

  Polygon out;
  out.reserve(n);
  for (std::size_t i = 0; i < n; ++i) {
    const std::size_t prev = (i + n - 1) % n;
    Vec2 q;
    if (!intersectLines(normal[prev], constant[prev], normal[i], constant[i], &q)) continue;
    out.push_back(q);
  }
  if (out.size() < 3) return {};
  if (signedArea(out) <= 1e-6) return {};
  // A shrink that folds the polygon inside out leaves vertices that violate
  // their own half-planes.  Reject the whole result rather than return garbage.
  for (const Vec2& q : out)
    for (std::size_t i = 0; i < n; ++i)
      if (dot(q, normal[i]) > constant[i] + 1e-6) return {};
  return out;
}

Polygon convexHull(std::vector<Vec2> points) {
  if (points.size() < 3) return points;
  std::sort(points.begin(), points.end(),
            [](const Vec2& a, const Vec2& b) { return a.x < b.x || (a.x == b.x && a.y < b.y); });
  points.erase(std::unique(points.begin(), points.end()), points.end());
  if (points.size() < 3) return points;

  Polygon hull(2 * points.size());
  std::size_t k = 0;
  for (std::size_t i = 0; i < points.size(); ++i) {
    while (k >= 2 && orientation(hull[k - 2], hull[k - 1], points[i]) <= 0) --k;
    hull[k++] = points[i];
  }
  const std::size_t lower = k + 1;
  for (std::size_t i = points.size() - 1; i-- > 0;) {
    while (k >= lower && orientation(hull[k - 2], hull[k - 1], points[i]) <= 0) --k;
    hull[k++] = points[i];
  }
  hull.resize(k - 1);
  return hull;
}

// --- paths -----------------------------------------------------------------

Pose Path::startPose() const {
  if (samples.empty()) return {};
  return Pose{samples.front().p, samples.front().heading};
}

Pose Path::endPose() const {
  if (samples.empty()) return {};
  return Pose{samples.back().p, samples.back().heading};
}

PathSample Path::at(double s) const {
  if (samples.empty()) return {};
  if (s <= samples.front().s) return samples.front();
  if (s >= samples.back().s) return samples.back();
  std::size_t hi = 1;
  while (hi + 1 < samples.size() && samples[hi].s < s) ++hi;
  const PathSample& a = samples[hi - 1];
  const PathSample& b = samples[hi];
  const double span = b.s - a.s;
  const double t = span < kEps ? 0.0 : (s - a.s) / span;
  PathSample out;
  out.p = a.p + (b.p - a.p) * t;
  out.heading = a.heading + wrapAngle(b.heading - a.heading) * t;
  out.curvature = a.curvature + (b.curvature - a.curvature) * t;
  out.s = s;
  return out;
}

double Path::maxAbsCurvature() const {
  double best = 0.0;
  for (const PathSample& s : samples) best = std::max(best, std::fabs(s.curvature));
  return best;
}

double Path::totalTurning() const {
  double total = 0.0;
  for (std::size_t i = 1; i < samples.size(); ++i)
    total += std::fabs(wrapAngle(samples[i].heading - samples[i - 1].heading));
  return total;
}

Path straightPath(const Pose& from, double length, double step) {
  Path path;
  if (length < 0.0) return path;
  const int n = std::max(1, static_cast<int>(std::ceil(length / std::max(step, 1e-3))));
  const Vec2 u = from.forward();
  for (int i = 0; i <= n; ++i) {
    const double s = length * static_cast<double>(i) / static_cast<double>(n);
    path.samples.push_back({from.p + u * s, from.heading, 0.0, s});
  }
  return path;
}

Path arcPath(const Pose& from, double signedRadius, double sweep, double step) {
  Path path;
  if (std::fabs(signedRadius) < kEps) return path;
  if (std::fabs(sweep) < 1e-12) {
    path.samples.push_back({from.p, from.heading, 1.0 / signedRadius, 0.0});
    return path;
  }
  if ((sweep > 0.0) != (signedRadius > 0.0)) return path;  // sign mismatch: not an arc

  const double r = signedRadius;
  const Vec2 center = from.p + Vec2{-std::sin(from.heading), std::cos(from.heading)} * r;
  const double arcLength = std::fabs(r * sweep);
  const int n = std::max(1, static_cast<int>(std::ceil(arcLength / std::max(step, 1e-3))));
  for (int i = 0; i <= n; ++i) {
    const double t = sweep * static_cast<double>(i) / static_cast<double>(n);
    const double h = from.heading + t;
    const Vec2 p = center + Vec2{std::sin(h), -std::cos(h)} * r;
    path.samples.push_back({p, h, 1.0 / r, std::fabs(r * t)});
  }
  return path;
}

Path concatenatePaths(const std::vector<Path>& parts) {
  Path out;
  double base = 0.0;
  for (const Path& part : parts) {
    if (part.samples.empty()) continue;
    std::size_t first = 0;
    if (!out.samples.empty() && distance(out.samples.back().p, part.samples.front().p) < 1e-6)
      first = 1;
    for (std::size_t i = first; i < part.samples.size(); ++i) {
      PathSample s = part.samples[i];
      s.s += base;
      out.samples.push_back(s);
    }
    base = out.samples.empty() ? 0.0 : out.samples.back().s;
  }
  return out;
}

// --- Dubins ----------------------------------------------------------------

const char* toString(DubinsWord word) {
  switch (word) {
    case DubinsWord::LSL:
      return "LSL";
    case DubinsWord::RSR:
      return "RSR";
    case DubinsWord::LSR:
      return "LSR";
    case DubinsWord::RSL:
      return "RSL";
    case DubinsWord::RLR:
      return "RLR";
    case DubinsWord::LRL:
      return "LRL";
    case DubinsWord::None:
      break;
  }
  return "none";
}

Pose advance(const Pose& from, const DubinsSegment& segment) {
  if (!segment.isArc) return Pose{from.p + from.forward() * segment.length, from.heading};
  const double r = segment.signedRadius;
  const Vec2 center = from.p + Vec2{-std::sin(from.heading), std::cos(from.heading)} * r;
  const double h = from.heading + segment.sweep;
  return Pose{center + Vec2{std::sin(h), -std::cos(h)} * r, h};
}

namespace {

Vec2 leftCenter(const Pose& q, double r) { return q.p + perpLeft(q.forward()) * r; }
Vec2 rightCenter(const Pose& q, double r) { return q.p + perpRight(q.forward()) * r; }

double leftSweep(double from, double to) { return wrapAngle2Pi(to - from); }
double rightSweep(double from, double to) { return -wrapAngle2Pi(from - to); }

DubinsSegment arcSegment(double signedRadius, double sweep) {
  DubinsSegment s;
  s.isArc = true;
  s.signedRadius = signedRadius;
  s.sweep = sweep;
  s.length = std::fabs(signedRadius * sweep);
  return s;
}

DubinsSegment lineSegment(double length) {
  DubinsSegment s;
  s.isArc = false;
  s.length = length;
  return s;
}

// Builds a candidate, integrates it, and keeps it only if it really lands on
// the target.  Cheap insurance against a sign slip in any one branch.
void consider(const Pose& from, const Pose& to, DubinsWord word, const DubinsSegment& s0,
              const DubinsSegment& s1, const DubinsSegment& s2, double radius, DubinsPath* best) {
  if (s0.length < -kEps || s1.length < -kEps || s2.length < -kEps) return;
  const Pose q = advance(advance(advance(from, s0), s1), s2);
  if (distance(q.p, to.p) > 1e-6) return;
  if (std::fabs(wrapAngle(q.heading - to.heading)) > 1e-6) return;
  const double total = s0.length + s1.length + s2.length;
  if (best->found && total >= best->length) return;
  best->found = true;
  best->word = word;
  best->length = total;
  best->radius = radius;
  best->segments[0] = s0;
  best->segments[1] = s1;
  best->segments[2] = s2;
}

}  // namespace

DubinsPath dubinsShortestPath(const Pose& from, const Pose& to, double radius) {
  DubinsPath best;
  if (radius <= kEps) return best;
  const double r = radius;
  const double h0 = from.heading, h1 = to.heading;

  const Vec2 cl0 = leftCenter(from, r), cl1 = leftCenter(to, r);
  const Vec2 cr0 = rightCenter(from, r), cr1 = rightCenter(to, r);

  {  // LSL: the external tangent between two left circles is parallel to the
     // line joining their centres.
    const Vec2 v = cl1 - cl0;
    const double d = norm(v);
    const double sigma = d < 1e-9 ? h0 : angleOf(v);
    consider(from, to, DubinsWord::LSL, arcSegment(r, leftSweep(h0, sigma)), lineSegment(d),
             arcSegment(r, leftSweep(sigma, h1)), r, &best);
  }
  {  // RSR
    const Vec2 v = cr1 - cr0;
    const double d = norm(v);
    const double sigma = d < 1e-9 ? h0 : angleOf(v);
    consider(from, to, DubinsWord::RSR, arcSegment(-r, rightSweep(h0, sigma)), lineSegment(d),
             arcSegment(-r, rightSweep(sigma, h1)), r, &best);
  }
  {  // LSR: the internal tangent needs the centres at least 2r apart.
    const Vec2 v = cr1 - cl0;
    const double d = norm(v);
    if (d >= 2.0 * r) {
      const double sigma = angleOf(v) + std::asin(std::min(1.0, 2.0 * r / d));
      const double straight = std::sqrt(std::max(0.0, d * d - 4.0 * r * r));
      consider(from, to, DubinsWord::LSR, arcSegment(r, leftSweep(h0, sigma)),
               lineSegment(straight), arcSegment(-r, rightSweep(sigma, h1)), r, &best);
    }
  }
  {  // RSL
    const Vec2 v = cl1 - cr0;
    const double d = norm(v);
    if (d >= 2.0 * r) {
      const double sigma = angleOf(v) - std::asin(std::min(1.0, 2.0 * r / d));
      const double straight = std::sqrt(std::max(0.0, d * d - 4.0 * r * r));
      consider(from, to, DubinsWord::RSL, arcSegment(-r, rightSweep(h0, sigma)),
               lineSegment(straight), arcSegment(r, leftSweep(sigma, h1)), r, &best);
    }
  }
  {  // LRL and RLR: three arcs, reachable only when the endpoints are close.
    const Vec2 vl = cl1 - cl0;
    const double dl = norm(vl);
    if (dl > 1e-9 && dl <= 4.0 * r) {
      const double base = angleOf(vl);
      const double delta = std::acos(std::clamp(dl / (4.0 * r), -1.0, 1.0));
      for (const double sign : {1.0, -1.0}) {
        const Vec2 cm = cl0 + unitFromAngle(base + sign * delta) * (2.0 * r);
        const Vec2 t1 = (cl0 + cm) * 0.5;
        const Vec2 t2 = (cm + cl1) * 0.5;
        const double ha = angleOf(perpLeft(t1 - cl0));
        const double hb = angleOf(perpRight(t2 - cm));
        consider(from, to, DubinsWord::LRL, arcSegment(r, leftSweep(h0, ha)),
                 arcSegment(-r, rightSweep(ha, hb)), arcSegment(r, leftSweep(hb, h1)), r, &best);
      }
    }
    const Vec2 vr = cr1 - cr0;
    const double dr = norm(vr);
    if (dr > 1e-9 && dr <= 4.0 * r) {
      const double base = angleOf(vr);
      const double delta = std::acos(std::clamp(dr / (4.0 * r), -1.0, 1.0));
      for (const double sign : {1.0, -1.0}) {
        const Vec2 cm = cr0 + unitFromAngle(base + sign * delta) * (2.0 * r);
        const Vec2 t1 = (cr0 + cm) * 0.5;
        const Vec2 t2 = (cm + cr1) * 0.5;
        const double ha = angleOf(perpRight(t1 - cr0));
        const double hb = angleOf(perpLeft(t2 - cm));
        consider(from, to, DubinsWord::RLR, arcSegment(-r, rightSweep(h0, ha)),
                 arcSegment(r, leftSweep(ha, hb)), arcSegment(-r, rightSweep(hb, h1)), r, &best);
      }
    }
  }
  return best;
}

Path renderDubins(const Pose& from, const DubinsPath& dubins, double step) {
  if (!dubins.found) return {};
  Pose q = from;
  std::vector<Path> parts;
  for (const DubinsSegment& s : dubins.segments) {
    if (s.length < 1e-9) continue;
    parts.push_back(s.isArc ? arcPath(q, s.signedRadius, s.sweep, step)
                            : straightPath(q, s.length, step));
    q = advance(q, s);
  }
  return concatenatePaths(parts);
}

}  // namespace planning::airport
