// taxi_planner.hpp -- every declaration the capstone asks you to implement.
//
// The signatures are fixed so that the same test binary can be built against
// exercises/capstone and against solutions/capstone, exactly as in Chapter 2.
//
// The twelve exercises follow the twelve steps of the design:
//
//    Step  1  the zone layer ................................ Exercise 01
//    Step  2  gated boundaries in the graph .................. Exercise 02
//    Step  3  localization and start mode .................... Exercise 03
//    Step  4  the clearance and the permission set ........... Exercise 04
//    Step  5  filtering the graph for aircraft and mission ... Exercise 05
//    Step  6  cost-to-go by reverse Dijkstra ................. Exercise 06
//    Step  7  merge candidates in the start zone ............. Exercise 07
//    Step  8  the merge ladder, simplest first ............... Exercise 08
//    Step  8  hybrid A* clipped to the start zone ............ Exercise 09
//    Step  9  swept-footprint validation ..................... Exercise 10
//    Step 10  route assembly: events, stops, speed ........... Exercise 11
//    Steps 11-12  the geofence monitor and replanning ........ Exercise 12
#pragma once

#include <string>
#include <vector>

#include "planning/airport/aircraft.hpp"
#include "planning/airport/clearance.hpp"
#include "planning/airport/geometry.hpp"
#include "planning/airport/graph.hpp"
#include "planning/airport/route.hpp"
#include "planning/airport/zones.hpp"

namespace planning::airport {

// ===========================================================================
// Exercise 01 -- Step 1: the zone layer
// ===========================================================================

// What the zone layer says about one point.
struct ZoneQuery {
  ZoneClass zone = ZoneClass::Unknown;
  int polygonId = -1;    // the polygon that decided `zone`, or -1
  bool hotspot = false;  // some overlay polygon here is a hotspot
  bool closed = false;   // some polygon here is closed by NOTAM or construction
};

// Resolves every polygon covering p into one answer, most restrictive first.
// Overlay polygons never decide `zone`; they only contribute the flags.
ZoneQuery zoneAt(const ZoneLayer& layer, const Vec2& p);

// The zone each key footprint point sits in, plus the summary Step 3 needs.
struct FootprintZones {
  ZoneQuery reference;
  ZoneQuery noseGear;
  ZoneQuery leftMainGear;
  ZoneQuery rightMainGear;
  ZoneQuery leftWingtip;
  ZoneQuery rightWingtip;

  bool allGearLoadBearing = false;          // every tyre on pavement that carries weight
  bool gearConsistent = false;              // every tyre in the same zone class
  ZoneClass gearZone = ZoneClass::Unknown;  // that class, or Unknown
  bool wingtipViolation = false;            // a wingtip is over a structure
};

FootprintZones classifyFootprint(const ZoneLayer& layer, const AircraftModel& aircraft,
                                 const Pose& pose);

// The configuration-space layer: allowed polygons shrunk and forbidden ones
// grown by the aircraft margins, so that a *point* test on the result is a
// *footprint* test on the original.  Polygons that collapse are dropped.
ZoneLayer configurationSpace(const ZoneLayer& layer, const AircraftModel& aircraft);

// ===========================================================================
// Exercise 02 -- Step 2: gated boundaries in the graph
// ===========================================================================

// Splits every raw guidance-line edge where it crosses a zone boundary, tags
// each resulting edge with its zone, and marks every vertex whose incident
// edges span more than one zone class as a gate.
//
// Hard gates guard runways and runway protected areas.  Soft gates are the
// apron/taxiway and stand/apron boundaries.
TaxiGraph buildGatedGraph(const TaxiGraph& raw, const ZoneLayer& layer);

// How finely buildGatedGraph() looks for a zone change along an edge, and how
// tightly it then bisects.  Given so that the tests can assume exact splits.
inline constexpr double kZoneScanStep = 1.0;         // metres
inline constexpr double kZoneSplitTolerance = 0.01;  // metres

// ===========================================================================
// Exercise 03 -- Step 3: localization and start mode
// ===========================================================================

enum class StartMode {
  Stand,           // inside a stand area; prefer the lead-out line
  Apron,           // on apron pavement, off any line; full off-graph planning
  TaxiwayCapture,  // on taxiway pavement, off the centreline; capture only
  Runway,          // on a runway; centreline capture and graph following only
  Fault,           // off pavement, straddling a forbidden zone, or inconsistent
};

const char* toString(StartMode mode);

struct Localization {
  Pose pose;
  StartMode mode = StartMode::Fault;
  ZoneClass zone = ZoneClass::Unknown;
  int polygonId = -1;
  FootprintZones footprint;

  DirectedEdge nearestEdge;     // nearest guidance line in the same zone
  double nearestS = 0.0;        // arclength along it of the closest point
  double crossTrack = 0.0;      // signed offset from that line, left positive
  double headingError = 0.0;    // signed, radians
  bool onGuidanceLine = false;  // inside the capture window of that line

  std::string detail;
};

// When the previous mode is supplied, a boundary crossing only takes effect
// once the footprint is this far into the new zone.  Otherwise noisy position
// makes the mode flicker between apron and taxiway on successive replans.
inline constexpr double kModeHysteresis = 3.0;  // metres

Localization localize(const ZoneLayer& layer, const TaxiGraph& gated, const AircraftModel& aircraft,
                      const Pose& pose, const Localization* previous = nullptr);

// ===========================================================================
// Exercise 04 -- Step 4: the clearance and the permission set
// ===========================================================================

PermissionSet buildPermissions(const TaxiGraph& gated, const ZoneLayer& layer,
                               const Clearance& clearance);

// ===========================================================================
// Exercise 05 -- Step 5: filtering the graph for this aircraft and mission
// ===========================================================================

struct EdgeFilter {
  // One entry per directed-edge index, i.e. DirectedEdge::index().
  std::vector<char> allowed;
  std::vector<std::string> reason;  // why a blocked edge is blocked

  bool allows(const DirectedEdge& d) const {
    const std::size_t i = static_cast<std::size_t>(d.index());
    return i < allowed.size() && allowed[i] != 0;
  }
};

EdgeFilter filterGraph(const TaxiGraph& gated, const AircraftModel& aircraft,
                       const PermissionSet& permissions);

// Can the aircraft actually get from `in` to `out` at their shared vertex?
// A node turn needs a fillet of at least minTurnRadius, which needs
// r * tan(theta/2) of straight line on each side of the corner.
// A turn sharper than this is a reversal, not a turn, and no aeroplane makes it
// at a taxiway junction.
inline constexpr double kMaxNodeTurn = 150.0 * kPi / 180.0;

bool turnIsFeasible(const TaxiGraph& graph, const DirectedEdge& in, const DirectedEdge& out,
                    const AircraftModel& aircraft);

// ===========================================================================
// Exercise 06 -- Step 6: cost-to-go by reverse Dijkstra
// ===========================================================================

// Zone-dependent cost per metre, so that the search prefers the fast taxiway to
// the slow apron even when the apron is geometrically shorter.
double zoneCostRate(ZoneClass zone);
inline constexpr double kHotspotPenalty = 60.0;   // cost units, once per hotspot edge
inline constexpr double kSoftGatePenalty = 25.0;  // cost units, once per soft gate

// Cost of traversing all of `d`: length times the zone rate, plus the fixed
// penalties earned at its head vertex.
double edgeCost(const TaxiGraph& graph, const DirectedEdge& d, const AircraftModel& aircraft);
// The same, entered at arclength s instead of at the tail.
double partialEdgeCost(const TaxiGraph& graph, const DirectedEdge& d, double s,
                       const AircraftModel& aircraft);

// The route constraint as a state machine.  `k` counts labels consumed.
// Returns the new k, or -1 when this edge is not allowed at this point.
//
//   k == 0                 nothing consumed yet; only apron and stand edges
//   edge label == labels[k] consume it, k becomes k + 1
//   edge label == labels[k - 1]  stay on the same taxiway, k unchanged
//   runway or protected zone     transparent, k unchanged
int advanceRouteIndex(const Edge& edge, int k, const std::vector<std::string>& labels);

struct CostToGo {
  int routeStates = 1;        // labels.size() + 1
  std::vector<double> value;  // [d.index() * routeStates + k]
  std::vector<int> next;      // the packed successor state, or -1

  double at(const DirectedEdge& d, int k) const;
  bool reachable(const DirectedEdge& d, int k) const;
  int pack(const DirectedEdge& d, int k) const { return d.index() * routeStates + k; }
};

CostToGo computeCostToGo(const TaxiGraph& gated, const PermissionSet& permissions,
                         const EdgeFilter& filter, const AircraftModel& aircraft);

// Walks CostToGo::next from a starting state to the goal.
std::vector<DirectedEdge> extractGraphRoute(const CostToGo& costToGo, const DirectedEdge& start,
                                            int k);

// ===========================================================================
// Exercise 07 -- Step 7: merge candidates, and only in the start zone
// ===========================================================================

struct MergeCandidate {
  DirectedEdge edge;
  double s = 0.0;
  Pose target;            // the point on the guidance line, and its heading
  int routeIndex = 0;     // k after joining this edge
  double costToGo = 0.0;  // from the merge point onward
  double leadIn = 0.0;    // metres of straight guidance line after the merge
};

inline constexpr double kCandidateRadius = 180.0;   // how far to look
inline constexpr double kCandidateSpacing = 5.0;    // sampling along an edge
inline constexpr double kJunctionExclusion = 25.0;  // keep clear of corners
inline constexpr double kMinLeadIn = 30.0;          // straight line after merging
// A candidate more than this far off the nose is behind us, and merging onto it
// would mean turning round.
inline constexpr double kMaxCandidateBearing = 120.0 * kPi / 180.0;

std::vector<MergeCandidate> generateMergeCandidates(const TaxiGraph& gated, const ZoneLayer& layer,
                                                    const AircraftModel& aircraft,
                                                    const Localization& localization,
                                                    const PermissionSet& permissions,
                                                    const EdgeFilter& filter,
                                                    const CostToGo& costToGo);

// ===========================================================================
// Exercise 08 -- Step 8: the merge ladder, simplest first
// ===========================================================================

enum class MergeMethod {
  None,
  CaptureWindow,     // already on the line; hand straight to the controller
  StraightThenTurn,  // one straight, one arc -- the closed-form case
  SCurve,            // two opposite arcs, for a parallel offset
  Intercept,         // turn to an intercept angle, run straight, then SC
  Dubins,            // the general two-point solution
  HybridAStar,       // free-space search, apron and stand only
};

const char* toString(MergeMethod method);

struct MergeParams {
  double captureCrossTrack = 2.0;
  double captureHeading = 10.0 * kPi / 180.0;
  double minRadius = 20.0;
  double preferredRadius = 45.0;
  double interceptAngle = 35.0 * kPi / 180.0;
  double sCurveHeadingTolerance = 12.0 * kPi / 180.0;
  double step = 1.0;
  bool allowHybridAStar = false;
  // A merge path that turns more than this in total is a loop, not a merge.
  double maxTotalTurning = 1.5 * kPi;
};

MergeParams paramsFor(StartMode mode, const AircraftModel& aircraft);

struct MergePath {
  bool found = false;
  MergeMethod method = MergeMethod::None;
  Path path;
  double cost = 0.0;
  std::string detail;
};

MergePath planCaptureWindow(const Pose& start, const MergeCandidate& candidate,
                            const MergeParams& params);
MergePath planStraightThenTurn(const Pose& start, const MergeCandidate& candidate,
                               const MergeParams& params);
MergePath planSCurve(const Pose& start, const MergeCandidate& candidate, const MergeParams& params);
MergePath planIntercept(const Pose& start, const MergeCandidate& candidate,
                        const MergeParams& params);
MergePath planDubinsMerge(const Pose& start, const MergeCandidate& candidate,
                          const MergeParams& params);

// Tries the five above in order and returns the first that succeeds.
MergePath planMerge(const Pose& start, const MergeCandidate& candidate, const MergeParams& params);

// ===========================================================================
// Exercise 09 -- Step 8, last rung: hybrid A* clipped to the start zone
// ===========================================================================

struct HybridAStarParams {
  double primitiveLength = 8.0;     // arclength of one motion primitive
  double positionResolution = 4.0;  // lattice cell, metres
  int headingBins = 24;
  int maxExpansions = 30000;
  double goalPositionTolerance = 2.5;
  double goalHeadingTolerance = 10.0 * kPi / 180.0;
  double turnPenalty = 1.2;  // multiplier on the cost of a turning move
  double radius = 25.0;      // turn radius of the left/right primitives
};

// The free-space fallback.  `cspace` is the configuration-space layer from
// Exercise 01, so a single point test per sample is enough.  `allowedZones`
// clips the search: a primitive whose samples leave those zones is discarded,
// which is what makes it physically unable to wander into another zone.
MergePath planHybridAStar(const ZoneLayer& cspace, const Pose& start,
                          const MergeCandidate& candidate,
                          const std::vector<ZoneClass>& allowedZones,
                          const HybridAStarParams& params);

// ===========================================================================
// Exercise 10 -- Step 9: validating the swept footprint
// ===========================================================================

struct SweepViolation {
  enum class Kind {
    GearOffPavement,   // a tyre left load-bearing pavement
    GearOnShoulder,    // ... specifically onto a shoulder
    LeftStartZone,     // the off-graph part changed zone before the merge point
    WingtipConflict,   // a wingtip is inside a structure or too close to one
    HoldShortCrossed,  // the swept outline crossed an unauthorized holding position
    RunwayEntered,     // the swept outline entered a runway or protected area
  };

  Kind kind = Kind::GearOffPavement;
  double s = 0.0;
  std::string what;
};

const char* toString(SweepViolation::Kind kind);

struct SweepResult {
  bool ok = false;
  std::vector<SweepViolation> violations;
};

inline constexpr double kSweepStep = 2.0;  // metres between swept poses

// Sweeps the footprint along `path` and applies the four checks of Step 9.
// When `offGraph` is true the path must additionally stay inside `startZone`.
SweepResult validateSweep(const ZoneLayer& layer, const AircraftModel& aircraft, const Path& path,
                          ZoneClass startZone, const PermissionSet& permissions, bool offGraph);

// ===========================================================================
// Exercise 11 -- Step 10: assembling the route
// ===========================================================================

struct SpeedLimits {
  // These mirror the zone policy table; they are separate so that an operator
  // can tighten them without touching the map.
  double stand = 2.5;
  double apron = 5.0;
  double taxiway = 10.0;
  double runway = 15.0;
  double runwayProtected = 10.0;
  double hotspotFactor = 0.5;
  double stopMargin = 6.0;  // the nose stops this far short of a holding position
};

Route assembleRoute(const TaxiGraph& gated, const ZoneLayer& layer, const AircraftModel& aircraft,
                    const MergePath& merge, const std::vector<DirectedEdge>& graphRoute,
                    const PermissionSet& permissions, const SpeedLimits& limits = SpeedLimits{});

// ===========================================================================
// Exercise 12 -- Steps 11 and 12: the monitor, and replanning
// ===========================================================================

struct VehicleState {
  Pose pose;
  double speed = 0.0;      // m/s
  double curvature = 0.0;  // signed, 1/m -- the current steering
};

enum class MonitorVerdict { Clear, Stop };

struct MonitorReport {
  MonitorVerdict verdict = MonitorVerdict::Clear;
  std::string reason;
  double timeToViolation = kInf;
  Vec2 where;

  bool stop() const { return verdict == MonitorVerdict::Stop; }
};

// The independent safety net of Step 11.  Projects the footprint forward at the
// current speed and steering and commands a stop if the projection touches an
// unauthorized runway, protected area, holding position or forbidden zone.
//
// Deliberately simple: it does not know about the route, the graph, the
// clearance route labels or the cost function.  It only knows the zone layer
// and the permission set, which is what makes it small enough to verify.
MonitorReport geofenceMonitor(const ZoneLayer& layer, const AircraftModel& aircraft,
                              const VehicleState& state, const PermissionSet& permissions,
                              double horizonSeconds = 6.0, double stepSeconds = 0.25);

struct ReplanTriggers {
  bool newClearance = false;
  bool newObstacle = false;
  bool monitorIntervened = false;
  double crossTrackError = 0.0;
  double secondsSinceLastPlan = 0.0;
};

struct ReplanDecision {
  bool replan = false;
  std::string trigger;
  double commitDistance = 0.0;  // metres of the current route that must survive
};

ReplanDecision shouldReplan(const ReplanTriggers& triggers, double speed,
                            double crossTrackLimit = 3.0, double periodSeconds = 5.0,
                            double commitSeconds = 3.0);

// Keeps the first `commitS` metres of `committed` and continues with `fresh`,
// so that a replan does not make the path jump under the controller.
Route spliceRoute(const Route& committed, double commitS, const Route& fresh);

// ===========================================================================
// The pipeline.  Given: it calls the twelve exercises in order.  Read it once
// you have finished Exercise 03 or so -- it is the map of the whole capstone.
// ===========================================================================

PlanResult planTaxi(const ZoneLayer& layer, const TaxiGraph& rawGraph,
                    const AircraftModel& aircraft, const Pose& start, const Clearance& clearance);

}  // namespace planning::airport
