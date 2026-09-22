// geometry.hpp -- 2D primitives for the surface-movement capstone.
//
// Part of the *given* library.  Nothing here is a planning algorithm; it is the
// vocabulary the capstone is written in, the same way core.hpp is for Chapter 2.
//
//   Vec2      a point or a vector, metres, x east and y north
//   Pose      (x, y, heading), heading in radians, 0 = east, counter-clockwise
//   Polygon   a simple polygon, implicitly closed, stored counter-clockwise
//   Path      a sampled curve carrying arclength, heading and curvature
#pragma once

#include <cmath>
#include <cstddef>
#include <limits>
#include <string>
#include <vector>

namespace planning::airport {

inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kEps = 1e-9;
inline constexpr double kInf = std::numeric_limits<double>::infinity();

// --- points and vectors ----------------------------------------------------

struct Vec2 {
  double x = 0.0;
  double y = 0.0;
};

inline Vec2 operator+(const Vec2& a, const Vec2& b) { return {a.x + b.x, a.y + b.y}; }
inline Vec2 operator-(const Vec2& a, const Vec2& b) { return {a.x - b.x, a.y - b.y}; }
inline Vec2 operator-(const Vec2& a) { return {-a.x, -a.y}; }
inline Vec2 operator*(const Vec2& a, double s) { return {a.x * s, a.y * s}; }
inline Vec2 operator*(double s, const Vec2& a) { return {a.x * s, a.y * s}; }
inline bool operator==(const Vec2& a, const Vec2& b) { return a.x == b.x && a.y == b.y; }

inline double dot(const Vec2& a, const Vec2& b) { return a.x * b.x + a.y * b.y; }
inline double cross(const Vec2& a, const Vec2& b) { return a.x * b.y - a.y * b.x; }
inline double norm(const Vec2& a) { return std::sqrt(dot(a, a)); }
inline double distance(const Vec2& a, const Vec2& b) { return norm(a - b); }

// Rotated a quarter turn.  perpLeft is +90 degrees, perpRight is -90.
inline Vec2 perpLeft(const Vec2& a) { return {-a.y, a.x}; }
inline Vec2 perpRight(const Vec2& a) { return {a.y, -a.x}; }

inline Vec2 unitFromAngle(double theta) { return {std::cos(theta), std::sin(theta)}; }
inline double angleOf(const Vec2& a) { return std::atan2(a.y, a.x); }

Vec2 normalized(const Vec2& a);
Vec2 rotate(const Vec2& a, double theta);

// --- angles ----------------------------------------------------------------

// Wraps into (-pi, pi].
double wrapAngle(double theta);
// Wraps into [0, 2pi).
double wrapAngle2Pi(double theta);
// The signed turn that takes `from` to `to`, in (-pi, pi].
inline double angleDelta(double from, double to) { return wrapAngle(to - from); }

// --- poses -----------------------------------------------------------------

struct Pose {
  Vec2 p;
  double heading = 0.0;

  Vec2 forward() const { return unitFromAngle(heading); }
  Vec2 left() const { return perpLeft(forward()); }
};

// Signed lateral offset of `q` from the line through `frame`, positive to the
// left of the heading.  This is the cross-track error.
double crossTrack(const Pose& frame, const Vec2& q);
// Signed distance of `q` along the heading of `frame`.
double alongTrack(const Pose& frame, const Vec2& q);

// --- segments and boxes ----------------------------------------------------

struct Segment {
  Vec2 a;
  Vec2 b;

  Vec2 delta() const { return b - a; }
  double length() const { return norm(delta()); }
  Vec2 at(double t) const { return a + delta() * t; }
};

struct Aabb {
  Vec2 lo{1e300, 1e300};
  Vec2 hi{-1e300, -1e300};

  bool empty() const { return lo.x > hi.x || lo.y > hi.y; }
  void extend(const Vec2& p);
  void extend(const Aabb& other);
  Aabb grown(double m) const { return Aabb{{lo.x - m, lo.y - m}, {hi.x + m, hi.y + m}}; }
  bool overlaps(const Aabb& other) const;
  bool contains(const Vec2& p) const;
};

double distancePointSegment(const Vec2& p, const Segment& s);
// Proper or improper crossing of two closed segments.
bool segmentsIntersect(const Segment& s, const Segment& t);

// --- polygons --------------------------------------------------------------

using Polygon = std::vector<Vec2>;

Polygon makeRectangle(double x0, double y0, double x1, double y1);
double signedArea(const Polygon& poly);
// Returns the polygon wound counter-clockwise.
Polygon makeCounterClockwise(Polygon poly);
Aabb boundsOf(const Polygon& poly);
Vec2 centroidOf(const Polygon& poly);

// Ray casting; points exactly on the boundary may answer either way.
bool polygonContains(const Polygon& poly, const Vec2& p);
// Zero when p is inside, otherwise the distance to the nearest edge.
double distanceOutsidePolygon(const Polygon& poly, const Vec2& p);
// Distance from p to the boundary, whether p is inside or outside.
double distanceToBoundary(const Polygon& poly, const Vec2& p);
bool segmentIntersectsPolygon(const Polygon& poly, const Segment& s);
bool polygonsOverlap(const Polygon& a, const Polygon& b);

// Miter offset of a *convex* polygon: delta > 0 grows it, delta < 0 shrinks it.
// Every polygon in the capstone map is convex, which is why this is enough.
// Returns an empty polygon when the shrink collapses it.
Polygon offsetConvex(const Polygon& poly, double delta);

// The convex hull of a point set, counter-clockwise.
Polygon convexHull(std::vector<Vec2> points);

// --- paths -----------------------------------------------------------------

struct PathSample {
  Vec2 p;
  double heading = 0.0;
  double curvature = 0.0;  // signed: positive turns left
  double s = 0.0;          // arclength from the start of the path
};

struct Path {
  std::vector<PathSample> samples;

  bool empty() const { return samples.empty(); }
  double length() const { return samples.empty() ? 0.0 : samples.back().s; }
  Pose startPose() const;
  Pose endPose() const;
  // Linear interpolation, clamped to the ends.
  PathSample at(double s) const;
  double maxAbsCurvature() const;
  // Total |dheading| accumulated along the path, in radians.
  double totalTurning() const;
};

inline constexpr double kDefaultStep = 1.0;  // metres between path samples

Path straightPath(const Pose& from, double length, double step = kDefaultStep);
// signedRadius > 0 turns left, < 0 turns right.  sweep must carry the same sign.
Path arcPath(const Pose& from, double signedRadius, double sweep, double step = kDefaultStep);
Path concatenatePaths(const std::vector<Path>& parts);

// --- Dubins curves (book Section 15.3.1) -----------------------------------
//
// Given, so that the capstone stays about the zone logic.  Implementing this
// from scratch is the natural extension exercise; see docs/capstone/04-merging.md.

enum class DubinsWord { LSL, RSR, LSR, RSL, RLR, LRL, None };

const char* toString(DubinsWord word);

// One of the three pieces of a Dubins word.  An arc carries a signed radius
// (positive turns left) and a sweep with the same sign; a straight carries only
// its length.
struct DubinsSegment {
  bool isArc = false;
  double signedRadius = 0.0;
  double sweep = 0.0;
  double length = 0.0;
};

struct DubinsPath {
  bool found = false;
  DubinsWord word = DubinsWord::None;
  double length = 0.0;
  double radius = 0.0;
  DubinsSegment segments[3];
};

// Advances a pose along one segment.  Exposed because the merge ladder in
// Exercise 08 wants the same primitive for its own arcs.
Pose advance(const Pose& from, const DubinsSegment& segment);

DubinsPath dubinsShortestPath(const Pose& from, const Pose& to, double radius);
Path renderDubins(const Pose& from, const DubinsPath& dubins, double step = kDefaultStep);

}  // namespace planning::airport
