// Every declaration the capstone asks you to implement.
//
// The signatures are fixed so that the same test file can run against
// src/capstone/problems and against src/capstone/solutions, exactly as in
// Part 1.  If you change a signature here, both sides stop compiling -- which
// is the point.
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

import type { AircraftModel } from '../airport/aircraft.js';
import type { Clearance, PermissionSet } from '../airport/clearance.js';
import {
  deg,
  type DubinsSegment,
  type Path,
  PI,
  type Pose,
  type Vec2,
} from '../airport/geometry.js';
import {
  type DirectedEdge,
  directedIndex,
  type Edge,
  NO_DIRECTED_EDGE,
  type TaxiGraph,
  type VertexId,
} from '../airport/graph.js';
import type { Route } from '../airport/route.js';
import type { ZoneClass, ZoneLayer } from '../airport/zones.js';

// ===========================================================================
// Exercise 01 -- Step 1: the zone layer
// ===========================================================================

/** What the zone layer says about one point. */
export interface ZoneQuery {
  zone: ZoneClass;
  /** The polygon that decided `zone`, or -1. */
  polygonId: number;
  /** Some overlay polygon here is a hotspot. */
  hotspot: boolean;
  /** Some polygon here is closed by NOTAM or construction. */
  closed: boolean;
}

export function emptyZoneQuery(): ZoneQuery {
  return { zone: 'unknown', polygonId: -1, hotspot: false, closed: false };
}

/** The zone each key footprint point sits in, plus the summary Step 3 needs. */
export interface FootprintZones {
  reference: ZoneQuery;
  noseGear: ZoneQuery;
  leftMainGear: ZoneQuery;
  rightMainGear: ZoneQuery;
  leftWingtip: ZoneQuery;
  rightWingtip: ZoneQuery;

  /** Every tyre on pavement that carries weight. */
  allGearLoadBearing: boolean;
  /** Every tyre in the same zone class. */
  gearConsistent: boolean;
  /** That class, or 'unknown'. */
  gearZone: ZoneClass;
  /** A wingtip is over a structure. */
  wingtipViolation: boolean;
}

export function emptyFootprintZones(): FootprintZones {
  return {
    reference: emptyZoneQuery(),
    noseGear: emptyZoneQuery(),
    leftMainGear: emptyZoneQuery(),
    rightMainGear: emptyZoneQuery(),
    leftWingtip: emptyZoneQuery(),
    rightWingtip: emptyZoneQuery(),
    allGearLoadBearing: false,
    gearConsistent: false,
    gearZone: 'unknown',
    wingtipViolation: false,
  };
}

// ===========================================================================
// Exercise 02 -- Step 2: gated boundaries in the graph
// ===========================================================================

/**
 * How finely buildGatedGraph() looks for a zone change along an edge, and how
 * tightly it then bisects.  Given so that the tests can assume exact splits.
 */
export const ZONE_SCAN_STEP = 1.0; // metres
export const ZONE_SPLIT_TOLERANCE = 0.01; // metres

// ===========================================================================
// Exercise 03 -- Step 3: localization and start mode
// ===========================================================================

export type StartMode =
  | 'stand' //           inside a stand area; prefer the lead-out line
  | 'apron' //           on apron pavement, off any line; full off-graph planning
  | 'taxiwayCapture' //  on taxiway pavement, off the centreline; capture only
  | 'runway' //          on a runway; centreline capture and graph following only
  | 'fault'; //          off pavement, straddling a forbidden zone, or inconsistent

export const START_MODES: readonly StartMode[] = [
  'stand',
  'apron',
  'taxiwayCapture',
  'runway',
  'fault',
];

export function startModeName(mode: StartMode): string {
  switch (mode) {
    case 'stand':
      return 'stand';
    case 'apron':
      return 'apron';
    case 'taxiwayCapture':
      return 'taxiway capture';
    case 'runway':
      return 'runway';
    case 'fault':
      return 'fault';
  }
}

export interface Localization {
  pose: Pose;
  mode: StartMode;
  zone: ZoneClass;
  polygonId: number;
  footprint: FootprintZones;

  /** Nearest guidance line in the same zone. */
  nearestEdge: DirectedEdge;
  /** Arclength along it of the closest point. */
  nearestS: number;
  /** Signed offset from that line, left positive. */
  crossTrack: number;
  /** Signed, radians. */
  headingError: number;
  /** Inside the capture window of that line. */
  onGuidanceLine: boolean;

  detail: string;
}

export function emptyLocalization(pose: Pose): Localization {
  return {
    pose,
    mode: 'fault',
    zone: 'unknown',
    polygonId: -1,
    footprint: emptyFootprintZones(),
    nearestEdge: NO_DIRECTED_EDGE,
    nearestS: 0,
    crossTrack: 0,
    headingError: 0,
    onGuidanceLine: false,
    detail: '',
  };
}

/**
 * When the previous mode is supplied, a boundary crossing only takes effect
 * once the footprint is this far into the new zone.  Otherwise noisy position
 * makes the mode flicker between apron and taxiway on successive replans.
 */
export const MODE_HYSTERESIS = 3.0; // metres

// ===========================================================================
// Exercise 05 -- Step 5: filtering the graph for this aircraft and mission
// ===========================================================================

export interface EdgeFilter {
  /** One entry per directed-edge index, i.e. directedIndex(d). */
  allowed: boolean[];
  /** Why a blocked edge is blocked. */
  reason: string[];
}

export function emptyEdgeFilter(): EdgeFilter {
  return { allowed: [], reason: [] };
}

export function allowsEdge(filter: EdgeFilter, d: DirectedEdge): boolean {
  return filter.allowed[directedIndex(d)] === true;
}

export function blockReason(filter: EdgeFilter, d: DirectedEdge): string {
  return filter.reason[directedIndex(d)] ?? '';
}

/**
 * Can the aircraft actually get from `in` to `out` at their shared vertex?
 * A node turn needs a fillet of at least minTurnRadius, which needs
 * r * tan(theta/2) of straight line on each side of the corner.  A turn sharper
 * than this is a reversal, not a turn, and no aeroplane makes it at a taxiway
 * junction.
 */
export const MAX_NODE_TURN = deg(150);

// ===========================================================================
// Exercise 06 -- Step 6: cost-to-go by reverse Dijkstra
// ===========================================================================

/** Cost units, once per hotspot edge. */
export const HOTSPOT_PENALTY = 60.0;
/** Cost units, once per soft gate. */
export const SOFT_GATE_PENALTY = 25.0;

export interface CostToGo {
  /** labels.length + 1 */
  routeStates: number;
  /** [directedIndex(d) * routeStates + k] */
  value: number[];
  /** The packed successor state, or -1. */
  next: number[];
}

export function emptyCostToGo(): CostToGo {
  return { routeStates: 1, value: [], next: [] };
}

/** The packed index of the state (d, k).  Given, so both sides agree. */
export function packState(costToGo: CostToGo, d: DirectedEdge, k: number): number {
  return directedIndex(d) * costToGo.routeStates + k;
}

/** The (d, k) a packed index came from.  Given, for the same reason. */
export function unpackState(costToGo: CostToGo, state: number): { d: DirectedEdge; k: number } {
  const routeStates = costToGo.routeStates;
  const directedIdx = Math.floor(state / routeStates);
  return {
    d: { edge: Math.floor(directedIdx / 2), forward: directedIdx % 2 === 0 },
    k: state % routeStates,
  };
}

// ===========================================================================
// Exercise 07 -- Step 7: merge candidates, and only in the start zone
// ===========================================================================

export interface MergeCandidate {
  edge: DirectedEdge;
  s: number;
  /** The point on the guidance line, and its heading. */
  target: Pose;
  /** k after joining this edge. */
  routeIndex: number;
  /** From the merge point onward. */
  costToGo: number;
  /** Metres of straight guidance line after the merge. */
  leadIn: number;
}

/** How far to look. */
export const CANDIDATE_RADIUS = 180.0;
/** Sampling along an edge. */
export const CANDIDATE_SPACING = 5.0;
/** Keep clear of corners. */
export const JUNCTION_EXCLUSION = 25.0;
/** Straight line after merging. */
export const MIN_LEAD_IN = 30.0;
/**
 * A candidate more than this far off the nose is behind us, and merging onto it
 * would mean turning round.
 */
export const MAX_CANDIDATE_BEARING = deg(120);

// ===========================================================================
// Exercise 08 -- Step 8: the merge ladder, simplest first
// ===========================================================================

export type MergeMethod =
  | 'none'
  | 'captureWindow' //     already on the line; hand straight to the controller
  | 'straightThenTurn' //  one straight, one arc -- the closed-form case
  | 'sCurve' //            two opposite arcs, for a parallel offset
  | 'intercept' //         turn to an intercept angle, run straight, then SC
  | 'dubins' //            the general two-point solution
  | 'hybridAStar'; //      free-space search, apron and stand only

export const MERGE_METHODS: readonly MergeMethod[] = [
  'none',
  'captureWindow',
  'straightThenTurn',
  'sCurve',
  'intercept',
  'dubins',
  'hybridAStar',
];

export function mergeMethodName(method: MergeMethod): string {
  switch (method) {
    case 'none':
      return 'none';
    case 'captureWindow':
      return 'capture window';
    case 'straightThenTurn':
      return 'straight then turn';
    case 'sCurve':
      return 'S-curve';
    case 'intercept':
      return 'intercept';
    case 'dubins':
      return 'Dubins';
    case 'hybridAStar':
      return 'hybrid A*';
  }
}

export interface MergeParams {
  captureCrossTrack: number;
  captureHeading: number;
  minRadius: number;
  preferredRadius: number;
  interceptAngle: number;
  sCurveHeadingTolerance: number;
  step: number;
  allowHybridAStar: boolean;
  /** A merge path that turns more than this in total is a loop, not a merge. */
  maxTotalTurning: number;
}

export function defaultMergeParams(): MergeParams {
  return {
    captureCrossTrack: 2.0,
    captureHeading: deg(10),
    minRadius: 20.0,
    preferredRadius: 45.0,
    interceptAngle: deg(35),
    sCurveHeadingTolerance: deg(12),
    step: 1.0,
    allowHybridAStar: false,
    maxTotalTurning: 1.5 * PI,
  };
}

export interface MergePath {
  found: boolean;
  method: MergeMethod;
  path: Path;
  cost: number;
  detail: string;
}

export function noMerge(detail = ''): MergePath {
  return { found: false, method: 'none', path: { samples: [] }, cost: 0, detail };
}

// ===========================================================================
// Exercise 09 -- Step 8, last rung: hybrid A* clipped to the start zone
// ===========================================================================

export interface HybridAStarParams {
  /** Arclength of one motion primitive. */
  primitiveLength: number;
  /** Lattice cell, metres. */
  positionResolution: number;
  headingBins: number;
  maxExpansions: number;
  goalPositionTolerance: number;
  goalHeadingTolerance: number;
  /** Multiplier on the cost of a turning move. */
  turnPenalty: number;
  /** Turn radius of the left/right primitives. */
  radius: number;
}

export function defaultHybridAStarParams(): HybridAStarParams {
  return {
    primitiveLength: 8.0,
    positionResolution: 4.0,
    headingBins: 24,
    maxExpansions: 30000,
    goalPositionTolerance: 2.5,
    goalHeadingTolerance: deg(10),
    turnPenalty: 1.2,
    radius: 25.0,
  };
}

// ===========================================================================
// Exercise 10 -- Step 9: validating the swept footprint
// ===========================================================================

export type SweepViolationKind =
  | 'gearOffPavement' //  a tyre left load-bearing pavement
  | 'gearOnShoulder' //   ... specifically onto a shoulder
  | 'leftStartZone' //    the off-graph part changed zone before the merge point
  | 'wingtipConflict' //  a wingtip is inside a structure or too close to one
  | 'holdShortCrossed' // the swept outline crossed an unauthorized holding position
  | 'runwayEntered'; //   the swept outline entered a runway or protected area

export const SWEEP_VIOLATION_KINDS: readonly SweepViolationKind[] = [
  'gearOffPavement',
  'gearOnShoulder',
  'leftStartZone',
  'wingtipConflict',
  'holdShortCrossed',
  'runwayEntered',
];

export function violationName(kind: SweepViolationKind): string {
  switch (kind) {
    case 'gearOffPavement':
      return 'gear off pavement';
    case 'gearOnShoulder':
      return 'gear on a shoulder';
    case 'leftStartZone':
      return 'left the start zone off-graph';
    case 'wingtipConflict':
      return 'wingtip conflict';
    case 'holdShortCrossed':
      return 'holding position crossed';
    case 'runwayEntered':
      return 'runway entered';
  }
}

export interface SweepViolation {
  readonly kind: SweepViolationKind;
  readonly s: number;
  readonly what: string;
}

export interface SweepResult {
  ok: boolean;
  violations: SweepViolation[];
}

/** Metres between swept poses. */
export const SWEEP_STEP = 2.0;

// ===========================================================================
// Exercise 11 -- Step 10: assembling the route
// ===========================================================================

export interface SpeedLimits {
  // These mirror the zone policy table; they are separate so that an operator
  // can tighten them without touching the map.
  stand: number;
  apron: number;
  taxiway: number;
  runway: number;
  runwayProtected: number;
  hotspotFactor: number;
  /** The nose stops this far short of a holding position. */
  stopMargin: number;
}

export function defaultSpeedLimits(): SpeedLimits {
  return {
    stand: 2.5,
    apron: 5.0,
    taxiway: 10.0,
    runway: 15.0,
    runwayProtected: 10.0,
    hotspotFactor: 0.5,
    stopMargin: 6.0,
  };
}

// ===========================================================================
// Exercise 12 -- Steps 11 and 12: the monitor, and replanning
// ===========================================================================

export interface VehicleState {
  readonly pose: Pose;
  /** m/s */
  readonly speed: number;
  /** Signed, 1/m -- the current steering. */
  readonly curvature: number;
}

export type MonitorVerdict = 'clear' | 'stop';

export interface MonitorReport {
  verdict: MonitorVerdict;
  reason: string;
  timeToViolation: number;
  where: Vec2;
}

export function monitorClear(): MonitorReport {
  return {
    verdict: 'clear',
    reason: '',
    timeToViolation: Number.POSITIVE_INFINITY,
    where: { x: 0, y: 0 },
  };
}

export interface ReplanTriggers {
  newClearance?: boolean;
  newObstacle?: boolean;
  monitorIntervened?: boolean;
  crossTrackError?: number;
  secondsSinceLastPlan?: number;
}

export interface ReplanDecision {
  replan: boolean;
  trigger: string;
  /** Metres of the current route that must survive. */
  commitDistance: number;
}

// ===========================================================================
// The twelve, as one interface
// ===========================================================================

export interface Capstone {
  // --- Exercise 01: the zone layer ---------------------------------------
  /**
   * Resolves every polygon covering p into one answer, most restrictive first.
   * Overlay polygons never decide `zone`; they only contribute the flags.
   */
  zoneAt(layer: ZoneLayer, p: Vec2): ZoneQuery;
  classifyFootprint(layer: ZoneLayer, aircraft: AircraftModel, pose: Pose): FootprintZones;
  /**
   * The configuration-space layer: allowed polygons shrunk and forbidden ones
   * grown by the aircraft margins, so that a *point* test on the result is a
   * *footprint* test on the original.  Polygons that collapse are dropped.
   */
  configurationSpace(layer: ZoneLayer, aircraft: AircraftModel): ZoneLayer;

  // --- Exercise 02: gated boundaries -------------------------------------
  /**
   * Splits every raw guidance-line edge where it crosses a zone boundary, tags
   * each resulting edge with its zone, and marks every vertex whose incident
   * edges span more than one zone class as a gate.
   */
  buildGatedGraph(raw: TaxiGraph, layer: ZoneLayer): TaxiGraph;

  // --- Exercise 03: localization and start mode --------------------------
  localize(
    layer: ZoneLayer,
    gated: TaxiGraph,
    aircraft: AircraftModel,
    pose: Pose,
    previous?: Localization,
  ): Localization;

  // --- Exercise 04: the clearance and the permission set -----------------
  buildPermissions(gated: TaxiGraph, layer: ZoneLayer, clearance: Clearance): PermissionSet;

  // --- Exercise 05: filtering the graph ----------------------------------
  filterGraph(gated: TaxiGraph, aircraft: AircraftModel, permissions: PermissionSet): EdgeFilter;
  turnIsFeasible(
    graph: TaxiGraph,
    into: DirectedEdge,
    outOf: DirectedEdge,
    aircraft: AircraftModel,
  ): boolean;

  // --- Exercise 06: cost-to-go by reverse Dijkstra -----------------------
  /**
   * Zone-dependent cost per metre, so that the search prefers the fast taxiway
   * to the slow apron even when the apron is geometrically shorter.
   */
  zoneCostRate(zone: ZoneClass): number;
  /**
   * Cost of traversing all of `d`: length times the zone rate, plus the fixed
   * penalties earned at its head vertex.
   */
  edgeCost(graph: TaxiGraph, d: DirectedEdge, aircraft: AircraftModel): number;
  /** The same, entered at arclength s instead of at the tail. */
  partialEdgeCost(graph: TaxiGraph, d: DirectedEdge, s: number, aircraft: AircraftModel): number;
  /**
   * The route constraint as a state machine.  `k` counts labels consumed.
   * Returns the new k, or -1 when this edge is not allowed at this point.
   */
  advanceRouteIndex(edge: Edge, k: number, labels: readonly string[]): number;
  costToGoAt(costToGo: CostToGo, d: DirectedEdge, k: number): number;
  costToGoReachable(costToGo: CostToGo, d: DirectedEdge, k: number): boolean;
  computeCostToGo(
    gated: TaxiGraph,
    permissions: PermissionSet,
    filter: EdgeFilter,
    aircraft: AircraftModel,
  ): CostToGo;
  /** Walks CostToGo.next from a starting state to the goal. */
  extractGraphRoute(costToGo: CostToGo, start: DirectedEdge, k: number): DirectedEdge[];

  // --- Exercise 07: merge candidates -------------------------------------
  generateMergeCandidates(
    gated: TaxiGraph,
    layer: ZoneLayer,
    aircraft: AircraftModel,
    localization: Localization,
    permissions: PermissionSet,
    filter: EdgeFilter,
    costToGo: CostToGo,
  ): MergeCandidate[];

  // --- Exercise 08: the merge ladder -------------------------------------
  paramsFor(mode: StartMode, aircraft: AircraftModel): MergeParams;
  planCaptureWindow(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;
  planStraightThenTurn(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;
  planSCurve(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;
  planIntercept(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;
  planDubinsMerge(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;
  /** Tries the five above in order and returns the first that succeeds. */
  planMerge(start: Pose, candidate: MergeCandidate, params: MergeParams): MergePath;

  // --- Exercise 09: hybrid A* --------------------------------------------
  /**
   * The free-space fallback.  `cspace` is the configuration-space layer from
   * Exercise 01, so a single point test per sample is enough.  `allowedZones`
   * clips the search: a primitive whose samples leave those zones is discarded,
   * which is what makes it physically unable to wander into another zone.
   */
  planHybridAStar(
    cspace: ZoneLayer,
    start: Pose,
    candidate: MergeCandidate,
    allowedZones: readonly ZoneClass[],
    params: HybridAStarParams,
  ): MergePath;

  // --- Exercise 10: the swept footprint ----------------------------------
  /**
   * Sweeps the footprint along `path` and applies the four checks of Step 9.
   * When `offGraph` is true the path must additionally stay inside `startZone`.
   */
  validateSweep(
    layer: ZoneLayer,
    aircraft: AircraftModel,
    path: Path,
    startZone: ZoneClass,
    permissions: PermissionSet,
    offGraph: boolean,
  ): SweepResult;

  // --- Exercise 11: route assembly ---------------------------------------
  assembleRoute(
    gated: TaxiGraph,
    layer: ZoneLayer,
    aircraft: AircraftModel,
    merge: MergePath,
    graphRoute: readonly DirectedEdge[],
    permissions: PermissionSet,
    limits?: SpeedLimits,
  ): Route;

  // --- Exercise 12: the monitor and replanning ---------------------------
  /**
   * The independent safety net of Step 11.  Projects the footprint forward at
   * the current speed and steering and commands a stop if the projection
   * touches an unauthorized runway, protected area, holding position or
   * forbidden zone.
   *
   * Deliberately simple: it does not know about the route, the graph, the
   * clearance route labels or the cost function.
   */
  geofenceMonitor(
    layer: ZoneLayer,
    aircraft: AircraftModel,
    state: VehicleState,
    permissions: PermissionSet,
    horizonSeconds?: number,
    stepSeconds?: number,
  ): MonitorReport;
  shouldReplan(
    triggers: ReplanTriggers,
    speed: number,
    crossTrackLimit?: number,
    periodSeconds?: number,
    commitSeconds?: number,
  ): ReplanDecision;
  /**
   * Keeps the first `commitS` metres of `committed` and continues with `fresh`,
   * so that a replan does not make the path jump under the controller.
   */
  spliceRoute(committed: Route, commitS: number, fresh: Route): Route;
}

/** Re-exported so an exercise file needs one import for its vocabulary. */
export type { DubinsSegment };
