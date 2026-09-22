// route.cpp -- the given route value type.
#include "planning/airport/route.hpp"

#include <algorithm>

namespace planning::airport {

const char* toString(EventKind kind) {
  switch (kind) {
    case EventKind::Departure:
      return "departure";
    case EventKind::MergeComplete:
      return "merge complete";
    case EventKind::SoftGate:
      return "soft gate";
    case EventKind::HoldShort:
      return "hold short";
    case EventKind::RunwayCrossingStart:
      return "runway crossing start";
    case EventKind::RunwayCrossingEnd:
      return "runway crossing end";
    case EventKind::HotspotEnter:
      return "hotspot enter";
    case EventKind::HotspotExit:
      return "hotspot exit";
    case EventKind::Arrival:
      return "arrival";
  }
  return "event";
}

const char* toString(PlanStatus status) {
  switch (status) {
    case PlanStatus::Success:
      return "success";
    case PlanStatus::PushbackRequired:
      return "pushback or tow required";
    case PlanStatus::NoForwardExit:
      return "no forward exit from runway ahead";
    case PlanStatus::NotCleared:
      return "not cleared";
    case PlanStatus::BlockedByObstacle:
      return "blocked by obstacle, awaiting clearance";
    case PlanStatus::NoRoute:
      return "no route";
    case PlanStatus::LocalizationInconsistent:
      return "localization inconsistent with map";
  }
  return "unknown";
}

double Route::speedAt(double s) const {
  if (speed.empty()) return 0.0;
  if (s <= speed.front().s) return speed.front().v;
  if (s >= speed.back().s) return speed.back().v;
  std::size_t hi = 1;
  while (hi + 1 < speed.size() && speed[hi].s < s) ++hi;
  const SpeedPoint& a = speed[hi - 1];
  const SpeedPoint& b = speed[hi];
  const double span = b.s - a.s;
  if (span < 1e-9) return b.v;
  return a.v + (b.v - a.v) * (s - a.s) / span;
}

}  // namespace planning::airport
