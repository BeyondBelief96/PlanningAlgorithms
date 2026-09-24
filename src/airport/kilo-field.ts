// Kilo Field, the capstone airport, and the scenarios that run on it.
//
// Part of the *given* library.  Everything is axis-aligned rectangles on a
// plane, in metres, x east and y north.  It is a toy, but it has one of
// everything the twelve steps need: two runways, a protected area around each,
// two routes between the apron and the runway, a hotspot, a de-icing pad, a
// closed area, a service road, shoulders, a terminal to clip a wingtip on, and
// four holding positions.
//
// This is the same aerodrome Part 1 taxis around, drawn properly.  Part 1's
// chart is points and legs; this is the pavement those legs run over.  The full
// coordinate table is in docs/capstone/07-the-map.md, and the numbers below are
// the authority for it.

import { type AircraftModel, a320, b777 } from './aircraft.js';
import { deg, makeRectangle, type Pose, type Segment, type Vec2 } from './geometry.js';
import { type EdgeId, TaxiGraph, type VertexId } from './graph.js';
import { type ZoneClass, ZoneLayer, zonePolygon } from './zones.js';

export interface Airport {
  readonly name: string;
  readonly zones: ZoneLayer;
  /**
   * The *raw* guidance-line graph, straight from the chart: no gate vertices,
   * no zone tags.  Exercise 02 turns it into the gated graph.
   */
  readonly graph: TaxiGraph;
}

// Code D taxiways: wide enough for an A320, not for a 777.
const TAXIWAY_WINGSPAN = 52.0;
const RUNWAY_WINGSPAN = 80.0;

function build(): Airport {
  const zones = new ZoneLayer();
  const graph = new TaxiGraph();
  zones.name = 'Kilo Field';

  const area = (
    zone: ZoneClass,
    name: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    idents: string[] = [],
  ): number => zones.add(zonePolygon({ zone, name, outline: makeRectangle(x0, y0, x1, y1), idents }));

  const overlay = (
    name: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    hotspot: boolean,
    closed: boolean,
  ): number =>
    zones.add(
      zonePolygon({
        zone: 'unknown',
        name,
        outline: makeRectangle(x0, y0, x1, y1),
        overlay: true,
        hotspot,
        closed,
      }),
    );

  const holdShort = (
    name: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    protects: string[],
  ): number => {
    const segment: Segment = { a: { x: x0, y: y0 }, b: { x: x1, y: y1 } };
    return zones.addHoldShort({ id: -1, name, segment, protects });
  };

  // --- runways and their protected areas -----------------------------------
  area('runway', 'RWY 09/27', 0, 475, 2400, 525, ['09', '27']);
  area('runwayProtected', 'RWY 09/27 protected S', 0, 425, 2400, 475, ['09', '27']);
  area('runwayProtected', 'RWY 09/27 protected N', 0, 525, 2400, 575, ['09', '27']);
  area('runway', 'RWY 18/36', 1575, 60, 1625, 420, ['18', '36']);
  area('runwayProtected', 'RWY 18/36 protected W', 1525, 60, 1575, 420, ['18', '36']);
  area('runwayProtected', 'RWY 18/36 protected E', 1625, 60, 1675, 420, ['18', '36']);

  // --- taxiways ------------------------------------------------------------
  area('taxiway', 'TWY A', 500, 185, 1415, 215);
  area('taxiway', 'TWY F', 985, 185, 1015, 415);
  area('taxiway', 'TWY D', 1385, 185, 1415, 415);
  area('taxiway', 'TWY B', 985, 385, 2315, 415);
  area('taxiway', 'TWY C', 1785, 385, 1815, 500);
  area('taxiway', 'TWY E', 2285, 385, 2315, 500);
  area('taxiway', 'TWY G', 665, 185, 695, 235);

  // --- apron, stands, de-icing ---------------------------------------------
  area('apron', 'APRON NORTH', 100, 130, 500, 280);
  area('stand', 'STAND 1', 140, 40, 200, 130);
  area('stand', 'STAND 2', 260, 40, 320, 130);
  area('stand', 'STAND 3', 380, 40, 440, 130);
  area('deicing', 'DEICE PAD', 600, 235, 760, 315);

  // --- forbidden -----------------------------------------------------------
  area('forbidden', 'TERMINAL', 100, 0, 500, 40);
  area('forbidden', 'SERVICE ROAD', 790, 250, 960, 270);

  // --- shoulders: wing overhang fine, gear forbidden -----------------------
  area('shoulder', 'TWY A shoulder S', 500, 175, 1415, 185);
  area('shoulder', 'TWY A shoulder N', 500, 215, 1415, 225);
  area('shoulder', 'TWY B shoulder S', 985, 375, 2315, 385);
  area('shoulder', 'TWY B shoulder N', 985, 415, 2315, 425);
  area('shoulder', 'TWY F shoulder W', 975, 185, 985, 415);
  area('shoulder', 'TWY F shoulder E', 1015, 185, 1025, 415);
  area('shoulder', 'TWY D shoulder W', 1375, 185, 1385, 415);
  area('shoulder', 'TWY D shoulder E', 1415, 185, 1425, 415);

  // --- overlays ------------------------------------------------------------
  overlay('HOTSPOT 1', 950, 350, 1050, 450, true, false);
  overlay('APRON WEST CLOSED', 100, 130, 155, 280, false, true);

  // --- holding positions ---------------------------------------------------
  holdShort('HS 36 W', 1525, 375, 1525, 425, ['18', '36']);
  holdShort('HS 36 E', 1675, 375, 1675, 425, ['18', '36']);
  holdShort('HS 27 C', 1775, 425, 1825, 425, ['09', '27']);
  holdShort('HS 27 E', 2275, 425, 2325, 425, ['09', '27']);

  zones.build();

  // --- the raw guidance-line graph -----------------------------------------
  const node = (name: string, x: number, y: number): VertexId => graph.addVertex({ x, y }, name);
  const link = (
    a: VertexId,
    b: VertexId,
    label: string,
    maxWingspan: number,
    oneWay = false,
  ): EdgeId => {
    const e = graph.addEdge(a, b, label);
    graph.edge(e).maxWingspan = maxWingspan;
    graph.edge(e).oneWay = oneWay;
    return e;
  };

  const s1 = node('S1', 170, 95);
  const s2 = node('S2', 290, 95);
  const s3 = node('S3', 410, 95);
  const p0 = node('P0', 110, 200);
  const p1 = node('P1', 170, 200);
  const p2 = node('P2', 290, 200);
  const p3 = node('P3', 410, 200);
  const ga = node('GA', 500, 200);
  const g0 = node('G0', 680, 200);
  const di = node('DI', 680, 280);
  const a1 = node('A1', 1000, 200);
  const a2 = node('A2', 1400, 200);
  const f1 = node('F1', 1000, 400);
  const d1 = node('D1', 1400, 400);
  const x36 = node('X36', 1600, 400);
  const c1 = node('C1', 1800, 400);
  const cr = node('CR', 1800, 500);
  const e1 = node('E1', 2300, 400);
  const er = node('ER', 2300, 500);
  const rw09 = node('RW09', 60, 500);
  const rwm = node('RWM', 1000, 500);
  const rw27 = node('RW27', 2340, 500);
  const r36 = node('R36', 1600, 100);
  const r18 = node('R18', 1600, 410);

  link(s1, p1, 'STAND 1', TAXIWAY_WINGSPAN);
  link(s2, p2, 'STAND 2', TAXIWAY_WINGSPAN);
  link(s3, p3, 'STAND 3', TAXIWAY_WINGSPAN);
  link(p0, p1, 'APRON', TAXIWAY_WINGSPAN);
  link(p1, p2, 'APRON', TAXIWAY_WINGSPAN);
  link(p2, p3, 'APRON', TAXIWAY_WINGSPAN);
  link(p3, ga, 'APRON', TAXIWAY_WINGSPAN);
  link(ga, g0, 'A', TAXIWAY_WINGSPAN);
  link(g0, a1, 'A', TAXIWAY_WINGSPAN);
  link(a1, a2, 'A', TAXIWAY_WINGSPAN);
  link(g0, di, 'DEICE', TAXIWAY_WINGSPAN);
  link(a1, f1, 'F', TAXIWAY_WINGSPAN, true); // northbound only
  link(a2, d1, 'D', TAXIWAY_WINGSPAN);
  link(f1, d1, 'B', TAXIWAY_WINGSPAN);
  link(d1, x36, 'B', TAXIWAY_WINGSPAN);
  link(x36, c1, 'B', TAXIWAY_WINGSPAN);
  link(c1, e1, 'B', TAXIWAY_WINGSPAN);
  link(c1, cr, 'C', TAXIWAY_WINGSPAN);
  link(e1, er, 'E', TAXIWAY_WINGSPAN);
  link(rw09, rwm, 'RWY 09/27', RUNWAY_WINGSPAN);
  link(rwm, cr, 'RWY 09/27', RUNWAY_WINGSPAN);
  link(cr, er, 'RWY 09/27', RUNWAY_WINGSPAN);
  link(er, rw27, 'RWY 09/27', RUNWAY_WINGSPAN);
  link(r36, x36, 'RWY 18/36', RUNWAY_WINGSPAN);
  link(x36, r18, 'RWY 18/36', RUNWAY_WINGSPAN);

  graph.build();
  return { name: 'Kilo Field', zones, graph };
}

let cached: Airport | undefined;

/** Kilo Field, the capstone airport.  Built once and cached. */
export function kiloAirport(): Airport {
  cached ??= build();
  return cached;
}

/** A fresh copy, for tests that want to modify it. */
export function buildKiloAirport(): Airport {
  return build();
}

// --- the eight scenarios ----------------------------------------------------
//
// Chosen so that three of them fail, and fail differently.  A planner that
// returns a path for all eight is worse than one that returns a path for five,
// and that is the single most important sentence in this capstone.

export interface Scenario {
  readonly name: string;
  readonly description: string;
  readonly start: Pose;
  readonly aircraft: AircraftModel;
  readonly clearance: string;
  /** What the pipeline should report, in words. */
  readonly expectation: string;
}

const DEPARTURE_CLEARANCE =
  'TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27';
const ARRIVAL_CLEARANCE = 'TAXI TO STAND 2 VIA C B D A CROSS RUNWAY 36';

function at(x: number, y: number, headingDegrees: number): Pose {
  return { p: { x, y }, heading: deg(headingDegrees) };
}

/** Pushed back from stand 2 and lined up on the lead-out line, facing north. */
export function standDeparture(): Scenario {
  return {
    name: 'stand-departure',
    description: 'Pushed back at stand 2, lined up on the lead-out line, facing north.',
    start: at(290, 95, 90),
    aircraft: a320(),
    clearance: DEPARTURE_CLEARANCE,
    expectation: 'success: capture the stand line, out via A D B, cross 36, stop at HS 27 E',
  };
}

/** Still nose-in at stand 3, facing the terminal.  There is no forward exit. */
export function noseInStand(): Scenario {
  return {
    name: 'nose-in-stand',
    description: 'Still nose-in at stand 3, facing the terminal.  Nothing ahead but building.',
    start: at(410, 95, -90),
    aircraft: a320(),
    clearance: DEPARTURE_CLEARANCE,
    expectation: 'pushback or tow required',
  };
}

/** Parked on the apron well off any guidance line, facing north-east. */
export function apronOffLine(): Scenario {
  return {
    name: 'apron-off-line',
    description: 'Parked on the apron well off any guidance line, facing north-east.',
    start: at(350, 240, 45),
    aircraft: a320(),
    clearance: DEPARTURE_CLEARANCE,
    expectation: 'success: free-space merge onto the apron lane, then the graph route',
  };
}

/** On taxiway A, six metres left of the centreline and eight degrees off. */
export function taxiwayCapture(): Scenario {
  return {
    name: 'taxiway-capture',
    description: 'On taxiway A, six metres left of the centreline and eight degrees off.',
    start: at(800, 206, 8),
    aircraft: a320(),
    clearance: DEPARTURE_CLEARANCE,
    expectation: 'success: an S-curve back onto A, no free-space search',
  };
}

/** Rolling out on runway 09 at midfield.  The only exits are ahead. */
export function landingRollout(): Scenario {
  return {
    name: 'landing-rollout',
    description: 'Rolling out on runway 09 at midfield.  Both exits are ahead.',
    start: at(1150, 500, 0),
    aircraft: a320(),
    clearance: ARRIVAL_CLEARANCE,
    expectation: 'success: exit ahead at C, cross 36 westbound, in via D and A',
  };
}

/** Rolling out on runway 27 near the west end.  Nothing ahead but the threshold. */
export function landingNoExit(): Scenario {
  return {
    name: 'landing-no-exit',
    description: 'Rolling out on runway 27 near the west end.  Every exit is behind.',
    start: at(400, 500, 180),
    aircraft: a320(),
    clearance: ARRIVAL_CLEARANCE,
    expectation: 'no forward exit from runway ahead',
  };
}

/**
 * On taxiway B between the two runway-36 holding positions, without a crossing
 * clearance.  The planner must not merge back across the holding position.
 */
export function insideRunwayProtected(): Scenario {
  return {
    name: 'inside-protected',
    description: 'Stopped inside the runway 36 protected area with no crossing clearance.',
    start: at(1550, 400, 0),
    aircraft: a320(),
    clearance: 'TAXI TO RUNWAY 27 VIA B E HOLD SHORT RUNWAY 27',
    expectation: 'no forward exit: nothing ahead is reachable without a crossing clearance',
  };
}

/** A Boeing 777 at stand 2.  Too wide for the capstone taxiways. */
export function oversizeAircraft(): Scenario {
  return {
    name: 'oversize',
    description: 'A Boeing 777 at stand 2.  The capstone taxiways are code D.',
    start: at(290, 95, 90),
    aircraft: b777(),
    clearance: DEPARTURE_CLEARANCE,
    expectation: 'no route: the wingspan exceeds every taxiway on the cleared route',
  };
}

export function allScenarios(): Scenario[] {
  return [
    standDeparture(),
    noseInStand(),
    apronOffLine(),
    taxiwayCapture(),
    landingRollout(),
    landingNoExit(),
    insideRunwayProtected(),
    oversizeAircraft(),
  ];
}

/** Case-insensitive lookup; returns standDeparture() when the name is unknown. */
export function scenarioByName(name: string): Scenario {
  const key = name.toLowerCase().replace(/[_ ]/g, '-');
  return allScenarios().find((s) => s.name === key) ?? standDeparture();
}

/** Every point the demo and the docs want to name, in one place. */
export const KILO_POINTS: Readonly<Record<string, Vec2>> = {
  'STAND 2': { x: 290, y: 95 },
  'APRON GATE': { x: 500, y: 200 },
  'HS 36 W': { x: 1525, y: 400 },
  'HS 36 E': { x: 1675, y: 400 },
  'HS 27 C': { x: 1800, y: 425 },
  'HS 27 E': { x: 2300, y: 425 },
};
