// zones.cpp -- the given zone-layer container and its broadphase.
#include "planning/airport/zones.hpp"

#include <algorithm>
#include <cmath>

namespace planning::airport {

const char* toString(ZoneClass zone) {
  switch (zone) {
    case ZoneClass::Unknown:
      return "unknown";
    case ZoneClass::Runway:
      return "runway";
    case ZoneClass::RunwayProtected:
      return "runway protected";
    case ZoneClass::Taxiway:
      return "taxiway";
    case ZoneClass::Apron:
      return "apron";
    case ZoneClass::Stand:
      return "stand";
    case ZoneClass::DeIcing:
      return "de-icing";
    case ZoneClass::Shoulder:
      return "shoulder";
    case ZoneClass::Forbidden:
      return "forbidden";
  }
  return "unknown";
}

ZonePolicy policyFor(ZoneClass zone) {
  ZonePolicy p;
  switch (zone) {
    case ZoneClass::Runway:
      p = {false, true, true, false, false, 15.0};
      break;
    case ZoneClass::RunwayProtected:
      // Treated as runway: entry only on-graph, only with a clearance.
      p = {false, true, true, false, false, 10.0};
      break;
    case ZoneClass::Taxiway:
      // On-graph travel; off-graph only to capture the centreline.
      p = {false, true, false, false, false, 10.0};
      break;
    case ZoneClass::Apron:
      p = {true, true, false, false, false, 5.0};
      break;
    case ZoneClass::Stand:
      p = {true, true, false, false, false, 2.5};
      break;
    case ZoneClass::DeIcing:
      p = {true, true, false, false, true, 2.5};
      break;
    case ZoneClass::Shoulder:
      // Not load bearing: gear forbidden, wing overhang fine.
      p = {false, false, false, false, false, 5.0};
      break;
    case ZoneClass::Forbidden:
      p = {false, false, false, true, false, 0.0};
      break;
    case ZoneClass::Unknown:
      p = {false, false, false, false, false, 0.0};
      break;
  }
  return p;
}

int zonePriority(ZoneClass zone) {
  switch (zone) {
    case ZoneClass::Forbidden:
      return 100;
    case ZoneClass::Runway:
      return 90;
    case ZoneClass::RunwayProtected:
      return 80;
    case ZoneClass::DeIcing:
      return 70;
    case ZoneClass::Stand:
      return 60;
    case ZoneClass::Taxiway:
      return 50;
    case ZoneClass::Apron:
      return 40;
    case ZoneClass::Shoulder:
      return 30;
    case ZoneClass::Unknown:
      return 0;
  }
  return 0;
}

int ZoneLayer::findPolygon(const std::string& name) const {
  for (const ZonePolygon& poly : polygons_)
    if (poly.name == name) return poly.id;
  return -1;
}

int ZoneLayer::add(ZonePolygon polygon) {
  polygon.id = static_cast<int>(polygons_.size());
  polygon.outline = makeCounterClockwise(std::move(polygon.outline));
  polygons_.push_back(std::move(polygon));
  built_ = false;
  return polygons_.back().id;
}

int ZoneLayer::addHoldShort(HoldShortLine line) {
  line.id = static_cast<int>(holdShort_.size());
  holdShort_.push_back(std::move(line));
  built_ = false;
  return holdShort_.back().id;
}

void ZoneLayer::build() {
  bounds_ = Aabb{};
  polygonBounds_.clear();
  holdShortBounds_.clear();
  polygonBounds_.reserve(polygons_.size());
  for (const ZonePolygon& poly : polygons_) {
    const Aabb box = boundsOf(poly.outline);
    polygonBounds_.push_back(box);
    bounds_.extend(box);
  }
  holdShortBounds_.reserve(holdShort_.size());
  for (const HoldShortLine& line : holdShort_) {
    Aabb box;
    box.extend(line.segment.a);
    box.extend(line.segment.b);
    holdShortBounds_.push_back(box);
    bounds_.extend(box);
  }
  if (bounds_.empty()) {
    cellsX_ = cellsY_ = 0;
    grid_.clear();
    holdShortGrid_.clear();
    built_ = true;
    return;
  }

  cellsX_ = std::max(1, static_cast<int>(std::ceil((bounds_.hi.x - bounds_.lo.x) / cell_)) + 1);
  cellsY_ = std::max(1, static_cast<int>(std::ceil((bounds_.hi.y - bounds_.lo.y) / cell_)) + 1);
  grid_.assign(static_cast<std::size_t>(cellsX_ * cellsY_), {});
  holdShortGrid_.assign(static_cast<std::size_t>(cellsX_ * cellsY_), {});

  const auto stamp = [&](const Aabb& box, int id, std::vector<std::vector<int>>& into) {
    const int x0 = std::clamp(static_cast<int>((box.lo.x - bounds_.lo.x) / cell_), 0, cellsX_ - 1);
    const int x1 = std::clamp(static_cast<int>((box.hi.x - bounds_.lo.x) / cell_), 0, cellsX_ - 1);
    const int y0 = std::clamp(static_cast<int>((box.lo.y - bounds_.lo.y) / cell_), 0, cellsY_ - 1);
    const int y1 = std::clamp(static_cast<int>((box.hi.y - bounds_.lo.y) / cell_), 0, cellsY_ - 1);
    for (int cy = y0; cy <= y1; ++cy)
      for (int cx = x0; cx <= x1; ++cx)
        into[static_cast<std::size_t>(cellIndex(cx, cy))].push_back(id);
  };

  for (std::size_t i = 0; i < polygonBounds_.size(); ++i)
    stamp(polygonBounds_[i], static_cast<int>(i), grid_);
  for (std::size_t i = 0; i < holdShortBounds_.size(); ++i)
    stamp(holdShortBounds_[i], static_cast<int>(i), holdShortGrid_);
  built_ = true;
}

namespace {

std::vector<int> gather(const std::vector<std::vector<int>>& grid, const std::vector<Aabb>& boxes,
                        const Aabb& bounds, double cell, int cellsX, int cellsY,
                        const Aabb& query) {
  std::vector<int> out;
  if (grid.empty() || bounds.empty() || !bounds.grown(cell).overlaps(query)) return out;
  const int x0 = std::clamp(static_cast<int>((query.lo.x - bounds.lo.x) / cell), 0, cellsX - 1);
  const int x1 = std::clamp(static_cast<int>((query.hi.x - bounds.lo.x) / cell), 0, cellsX - 1);
  const int y0 = std::clamp(static_cast<int>((query.lo.y - bounds.lo.y) / cell), 0, cellsY - 1);
  const int y1 = std::clamp(static_cast<int>((query.hi.y - bounds.lo.y) / cell), 0, cellsY - 1);
  for (int cy = y0; cy <= y1; ++cy) {
    for (int cx = x0; cx <= x1; ++cx) {
      for (int id : grid[static_cast<std::size_t>(cy * cellsX + cx)]) {
        if (!boxes[static_cast<std::size_t>(id)].overlaps(query)) continue;
        out.push_back(id);
      }
    }
  }
  std::sort(out.begin(), out.end());
  out.erase(std::unique(out.begin(), out.end()), out.end());
  return out;
}

}  // namespace

std::vector<int> ZoneLayer::candidates(const Aabb& box) const {
  return gather(grid_, polygonBounds_, bounds_, cell_, cellsX_, cellsY_, box);
}

std::vector<int> ZoneLayer::holdShortCandidates(const Aabb& box) const {
  return gather(holdShortGrid_, holdShortBounds_, bounds_, cell_, cellsX_, cellsY_, box);
}

}  // namespace planning::airport
