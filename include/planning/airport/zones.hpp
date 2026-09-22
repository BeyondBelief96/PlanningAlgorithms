// zones.hpp -- the zone layer of Step 1: polygons, their policies, and a
// broadphase index over them.
//
// Part of the *given* library.  The container and the index are given; the
// semantic queries on top of them -- which zone is this point in, what does the
// footprint straddle, what does the layer look like in configuration space --
// are Exercise 01.
#pragma once

#include <string>
#include <vector>

#include "planning/airport/geometry.hpp"

namespace planning::airport {

// The zone classes of Step 1.  The ARINC 816 feature that produces each one is
// named in the comment; the capstone map fakes those features with rectangles.
enum class ZoneClass {
  Unknown,          // off the map, or unpaved
  Runway,           // AM_RunwayElement, AM_RunwayIntersection, blast pads, stopways
  RunwayProtected,  // between the runway edge and the hold-short lines
  Taxiway,          // AM_TaxiwayElement
  Apron,            // AM_ApronElement
  Stand,            // AM_ParkingStandArea
  DeIcing,          // AM_DeicingArea
  Shoulder,         // AM_TaxiwayShoulder, AM_RunwayShoulder -- not load bearing
  Forbidden,        // service roads, closed areas, structures, unpaved, water
};

const char* toString(ZoneClass zone);

// The permission policy of Step 1, one row of the table per zone class.
struct ZonePolicy {
  bool offGraphAllowed = false;    // may the free-space planner operate here at all
  bool loadBearing = false;        // may a gear tyre touch it
  bool requiresClearance = false;  // entering needs an ATC clearance (hard gate)
  bool wingtipForbidden = false;   // even an overhanging wing may not be here
  bool missionOnly = false;        // only if the mission asks for it (de-icing)
  double speedLimit = 15.0;        // m/s
};

ZonePolicy policyFor(ZoneClass zone);

// Higher wins when two polygons cover the same point.  The ordering is "most
// restrictive first": a service road painted over an apron is still a service
// road, and a taxiway that crosses a runway is, where it crosses, a runway.
int zonePriority(ZoneClass zone);

// One area feature of the map.
struct ZonePolygon {
  int id = -1;
  ZoneClass zone = ZoneClass::Unknown;
  std::string name;
  Polygon outline;
  // Runway identifiers this polygon belongs to, e.g. {"09", "27"}.  Empty for
  // everything that is not a runway or a runway protected area.
  std::vector<std::string> idents;
  // Overlay polygons never decide the zone class; they only contribute flags.
  bool overlay = false;
  bool hotspot = false;  // AM_Hotspot: allowed, but penalised and slowed
  bool closed = false;   // NOTAM or construction
};

// AM_TaxiwayHoldingPosition, kept as explicit geometry because it is the single
// most important boundary on the airport.
struct HoldShortLine {
  int id = -1;
  std::string name;
  Segment segment;
  std::vector<std::string> protects;  // runway identifiers, e.g. {"36"}
};

// The zone layer.  Storage plus a uniform-grid broadphase, so "which polygons
// could possibly cover this box" is cheap.
class ZoneLayer {
 public:
  int add(ZonePolygon polygon);
  int addHoldShort(HoldShortLine line);
  // Must be called once after the last add().  Builds the broadphase.
  void build();

  const std::vector<ZonePolygon>& polygons() const { return polygons_; }
  const std::vector<HoldShortLine>& holdShortLines() const { return holdShort_; }
  // Bounds checked, for the same reason TaxiGraph::vertex() is.
  const ZonePolygon& polygon(int id) const { return polygons_.at(static_cast<std::size_t>(id)); }
  // Mutable access, for "what if the hotspot were over there instead" work.
  // Call build() again after changing any geometry.
  ZonePolygon& polygon(int id) { return polygons_.at(static_cast<std::size_t>(id)); }
  int findPolygon(const std::string& name) const;
  const HoldShortLine& holdShortLine(int id) const {
    return holdShort_.at(static_cast<std::size_t>(id));
  }

  Aabb bounds() const { return bounds_; }

  // Broadphase: polygon ids whose bounding box overlaps the query, in
  // increasing id order.  Never a false negative, sometimes a false positive.
  std::vector<int> candidates(const Aabb& box) const;
  std::vector<int> candidates(const Vec2& p) const { return candidates(Aabb{p, p}); }
  std::vector<int> holdShortCandidates(const Aabb& box) const;

  std::string name() const { return name_; }
  void setName(std::string name) { name_ = std::move(name); }

 private:
  int cellIndex(int cx, int cy) const { return cy * cellsX_ + cx; }

  std::string name_;
  std::vector<ZonePolygon> polygons_;
  std::vector<HoldShortLine> holdShort_;
  std::vector<Aabb> polygonBounds_;
  std::vector<Aabb> holdShortBounds_;
  std::vector<std::vector<int>> grid_;
  std::vector<std::vector<int>> holdShortGrid_;
  Aabb bounds_;
  double cell_ = 50.0;
  int cellsX_ = 0;
  int cellsY_ = 0;
  bool built_ = false;
};

}  // namespace planning::airport
