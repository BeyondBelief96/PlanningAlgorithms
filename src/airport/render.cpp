// render.cpp -- ASCII pictures of the airport, for the demo.
#include "planning/airport/render.hpp"

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <sstream>

namespace planning::airport {
namespace {

char glyphFor(const ZoneQuery& q) {
  if (q.closed) return 'x';
  switch (q.zone) {
    case ZoneClass::Runway:
      return '#';
    case ZoneClass::RunwayProtected:
      return ':';
    case ZoneClass::Taxiway:
      return q.hotspot ? '!' : '=';
    case ZoneClass::Apron:
      return '-';
    case ZoneClass::Stand:
      return 'S';
    case ZoneClass::DeIcing:
      return 'd';
    case ZoneClass::Shoulder:
      return ',';
    case ZoneClass::Forbidden:
      return 'X';
    case ZoneClass::Unknown:
      break;
  }
  return ' ';
}

}  // namespace

std::string renderAscii(const ZoneLayer& layer, const RenderOptions& options) {
  const Aabb bounds = layer.bounds();
  if (bounds.empty()) return "(empty map)\n";
  const int w = std::max(20, options.width);
  const int h = std::max(6, options.height);
  const double sx = (bounds.hi.x - bounds.lo.x) / static_cast<double>(w - 1);
  const double sy = (bounds.hi.y - bounds.lo.y) / static_cast<double>(h - 1);

  std::vector<std::string> grid(static_cast<std::size_t>(h),
                                std::string(static_cast<std::size_t>(w), ' '));
  for (int row = 0; row < h; ++row) {
    // Row 0 is the top of the picture, which is the *north* edge of the map.
    const double y = bounds.hi.y - static_cast<double>(row) * sy;
    for (int col = 0; col < w; ++col) {
      const double x = bounds.lo.x + static_cast<double>(col) * sx;
      grid[static_cast<std::size_t>(row)][static_cast<std::size_t>(col)] =
          glyphFor(zoneAt(layer, Vec2{x, y}));
    }
  }

  const auto plot = [&](const Vec2& p, char c) {
    const int col = static_cast<int>(std::lround((p.x - bounds.lo.x) / sx));
    const int row = static_cast<int>(std::lround((bounds.hi.y - p.y) / sy));
    if (col < 0 || col >= w || row < 0 || row >= h) return;
    grid[static_cast<std::size_t>(row)][static_cast<std::size_t>(col)] = c;
  };

  for (const HoldShortLine& line : layer.holdShortLines()) {
    const int steps = 40;
    for (int i = 0; i <= steps; ++i) plot(line.segment.at(static_cast<double>(i) / steps), '|');
  }

  if (options.route != nullptr && !options.route->path.empty()) {
    const Path& path = options.route->path;
    for (double s = 0.0; s <= path.length(); s += 1.0) plot(path.at(s).p, 'o');
    for (const StopPoint& stop : options.route->stops) plot(path.at(stop.s).p, '*');
  }
  if (options.aircraft != nullptr) plot(options.aircraft->p, 'A');

  std::ostringstream out;
  for (const std::string& row : grid) {
    std::string trimmed = row;
    while (!trimmed.empty() && trimmed.back() == ' ') trimmed.pop_back();
    out << trimmed << "\n";
  }
  if (options.legend)
    out << "  # runway   : protected   = taxiway   ! hotspot   - apron   S stand\n"
        << "  d de-icing , shoulder    X forbidden x closed    | hold short\n"
        << "  o route     * stop       A aircraft\n";
  return out.str();
}

std::string describeGates(const TaxiGraph& gated) {
  std::ostringstream out;
  for (const Vertex& v : gated.vertices()) {
    if (v.gate == GateKind::None) continue;
    out << "  " << std::setw(4) << toString(v.gate) << "  " << std::setw(16) << std::left << v.name
        << std::right << "  (" << std::fixed << std::setprecision(0) << v.p.x << ", " << v.p.y
        << ")  " << toString(v.innerZone) << " | " << toString(v.outerZone);
    if (!v.protects.empty()) {
      out << "  protects";
      for (const std::string& id : v.protects) out << " " << id;
    }
    if (v.holdShortId >= 0) out << "  [painted]";
    out << "\n";
  }
  return out.str();
}

std::string describeRoute(const TaxiGraph& gated, const Route& route) {
  std::ostringstream out;
  out << std::fixed << std::setprecision(1);
  out << "  path " << route.path.length() << " m, off-graph " << route.mergeLength << " m, "
      << route.graphRoute.size() << " graph edges\n";

  std::string labels;
  std::string previous;
  for (const DirectedEdge& d : route.graphRoute) {
    const std::string& label = gated.edge(d.edge).taxiway;
    if (label == previous) continue;
    previous = label;
    labels += (labels.empty() ? "" : " -> ") + label;
  }
  out << "  via " << labels << "\n";

  for (const RouteEvent& e : route.events)
    out << "  " << std::setw(8) << e.s << " m  " << std::setw(22) << std::left << toString(e.kind)
        << std::right << e.message << "\n";
  for (const StopPoint& s : route.stops) out << "  STOP at " << s.s << " m: " << s.reason << "\n";

  double fastest = 0.0;
  for (const SpeedPoint& p : route.speed) fastest = std::max(fastest, p.v);
  if (fastest > 0.0)
    out << "  speed up to " << fastest << " m/s, " << route.stops.size() << " stop(s)\n";
  return out.str();
}

std::string describeLocalization(const Localization& localization) {
  std::ostringstream out;
  out << std::fixed << std::setprecision(2);
  out << "  mode " << toString(localization.mode) << ", zone " << toString(localization.zone)
      << "\n  cross-track " << localization.crossTrack << " m, heading error "
      << localization.headingError * 180.0 / kPi << " deg"
      << (localization.onGuidanceLine ? " (inside the capture window)" : "") << "\n  "
      << localization.detail << "\n";
  return out.str();
}

}  // namespace planning::airport
