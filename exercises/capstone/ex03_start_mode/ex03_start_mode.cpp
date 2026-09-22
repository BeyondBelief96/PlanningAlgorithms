// Exercise 03 -- localization and start mode (Step 3).
//
// Read exercises/capstone/ex03_start_mode/README.md first.
#include "planning/airport/taxi_planner.hpp"

namespace planning::airport {

const char* toString(StartMode mode) {
  // TODO(you): one word per mode, for the demo and the failure messages.
  (void)mode;
  return "?";
}

Localization localize(const ZoneLayer& layer, const TaxiGraph& gated, const AircraftModel& aircraft,
                      const Pose& pose, const Localization* previous) {
  // TODO(you):
  //
  // 1. classifyFootprint().  Refuse (StartMode::Fault) when a wingtip is
  //    inside a structure, when any tyre is off load-bearing pavement, or when
  //    the three tyres disagree about which zone they are in.  Put the reason
  //    in `detail` -- a refusal nobody can read is not much of a refusal.
  //
  // 2. Map the gear zone to a mode:  stand -> Stand, apron and de-icing ->
  //    Apron, taxiway -> TaxiwayCapture, runway *and runway protected* ->
  //    Runway.  A protected area is treated as runway: no free-space planning.
  //
  // 3. Hysteresis.  When `previous` is supplied and the mode has changed, keep
  //    the old mode until the footprint is kModeHysteresis metres inside the
  //    new zone.  Otherwise a metre of position noise flips the mode between
  //    apron and taxiway on successive replans.
  //
  // 4. Find the nearest guidance line whose zone matches, and fill in
  //    nearestEdge, nearestS, crossTrack, headingError and onGuidanceLine.
  //    In Stand mode pick the direction that leads *out* of the stand, not the
  //    one closest to the current heading: that is what makes a nose-in
  //    parking position show up as a heading error of 180 degrees, which is
  //    how the pipeline knows to ask for a pushback.
  (void)layer;
  (void)gated;
  (void)aircraft;
  (void)pose;
  (void)previous;
  return Localization{};
}

}  // namespace planning::airport
