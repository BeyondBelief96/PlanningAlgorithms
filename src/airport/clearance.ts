// What ATC said, and what the planner is therefore allowed to do (Step 4).
//
// The parser is given: turning words into a struct is not planning.  Turning
// the struct into a permission set over the gated graph is Exercise 04.
//
// Note that this is the capstone's clearance, not Part 1's.  Part 1 was handed
// a Clearance already parsed, because a taxiway list is all a graph search can
// use.  Here the sentence is parsed for real, because the capstone has to tell
// "hold short of 27" from "line up 27", and those are the same runway.

import type { VertexId } from './graph.js';

/**
 * The structured form of a taxi clearance.
 *
 *   "TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27"
 *
 * becomes destination "27", destinationIsRunway, route ["A","D","B","E"],
 * crossings {"36"}, holdShort {"27"}.
 */
export interface Clearance {
  readonly raw: string;
  /** "27", or "2" for a stand. */
  readonly destination: string;
  readonly destinationIsRunway: boolean;
  /** Taxiway labels, in the order given. */
  readonly route: readonly string[];
  /** Runways we may cross. */
  readonly crossings: ReadonlySet<string>;
  /** Runways we must hold short of. */
  readonly holdShort: ReadonlySet<string>;
  /** "LINE UP AND WAIT" / takeoff clearance. */
  readonly clearedToEnterDestination: boolean;
  /** "VIA DEICE" */
  readonly deIcingRequested: boolean;
}

const KEYWORDS = new Set([
  'TAXI', 'TO', 'VIA', 'CROSS', 'HOLD', 'SHORT', 'OF', 'RUNWAY', 'STAND',
  'LINE', 'UP', 'AND', 'WAIT', 'CLEARED', 'FOR', 'TAKEOFF', 'THEN',
]);

function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const word of text.toUpperCase().split(/\s+/)) {
    // Strip the punctuation that ATC transcripts pick up.
    const clean = [...word].filter((c) => /[A-Z0-9/]/.test(c)).join('');
    if (clean) out.push(clean);
  }
  return out;
}

/**
 * A forgiving, case-insensitive parser for the phrases the capstone uses:
 *
 *   TAXI TO RUNWAY <id> | TAXI TO STAND <id>
 *   VIA <label> <label> ...
 *   CROSS RUNWAY <id>
 *   HOLD SHORT RUNWAY <id>   (also: HOLD SHORT OF RUNWAY <id>)
 *   LINE UP AND WAIT | CLEARED FOR TAKEOFF
 *
 * Unknown words inside VIA become route labels, which is how DEICE gets in.
 */
export function parseClearance(text: string): Clearance {
  const t = tokenize(text);

  let destination = '';
  let destinationIsRunway = true;
  const route: string[] = [];
  const crossings = new Set<string>();
  const holdShort = new Set<string>();
  let clearedToEnterDestination = false;
  let deIcingRequested = false;

  for (let i = 0; i < t.length; ++i) {
    const w = t[i]!;
    if (w === 'TAXI' && i + 2 < t.length && t[i + 1] === 'TO') {
      if (t[i + 2] === 'RUNWAY' && i + 3 < t.length) {
        destination = t[i + 3]!;
        destinationIsRunway = true;
        i += 3;
      } else if (t[i + 2] === 'STAND' && i + 3 < t.length) {
        destination = t[i + 3]!;
        destinationIsRunway = false;
        i += 3;
      }
    } else if (w === 'VIA') {
      for (let j = i + 1; j < t.length && !KEYWORDS.has(t[j]!); ++j) {
        const label = t[j]!;
        if (label === 'DEICE' || label === 'DEICING') deIcingRequested = true;
        route.push(label);
        i = j;
      }
    } else if (w === 'CROSS' && i + 1 < t.length) {
      let j = i + 1;
      if (t[j] === 'RUNWAY') ++j;
      if (j < t.length) {
        crossings.add(t[j]!);
        i = j;
      }
    } else if (w === 'HOLD' && i + 1 < t.length && t[i + 1] === 'SHORT') {
      let j = i + 2;
      if (j < t.length && t[j] === 'OF') ++j;
      if (j < t.length && t[j] === 'RUNWAY') ++j;
      if (j < t.length) {
        holdShort.add(t[j]!);
        i = j;
      }
    } else if (w === 'LINE' && i + 2 < t.length && t[i + 1] === 'UP') {
      clearedToEnterDestination = true;
      i += 2;
    } else if (w === 'CLEARED' && i + 2 < t.length && t[i + 2] === 'TAKEOFF') {
      clearedToEnterDestination = true;
      i += 2;
    }
  }

  return {
    raw: text,
    destination,
    destinationIsRunway,
    route,
    crossings,
    holdShort,
    clearedToEnterDestination,
    deIcingRequested,
  };
}

export function describeClearance(clearance: Clearance): string {
  let out = (clearance.destinationIsRunway ? 'to runway ' : 'to stand ') + clearance.destination;
  if (clearance.route.length > 0) out += ' via ' + clearance.route.join(' ');
  for (const r of [...clearance.crossings].sort()) out += `, cross ${r}`;
  for (const r of [...clearance.holdShort].sort()) out += `, hold short of ${r}`;
  if (clearance.clearedToEnterDestination) out += ', cleared to enter';
  return out;
}

/** The output of Step 4: everything the search is allowed to do on this mission. */
export interface PermissionSet {
  /**
   * Taxiway labels in the order the clearance gave them.  An empty route means
   * "no route constraint", and the search may use any open edge.
   */
  routeLabels: string[];

  /**
   * Hard gates this clearance opens.  Every other hard gate is closed and gets
   * infinite cost for this mission.
   */
  authorizedGates: Set<VertexId>;

  /**
   * Hold-short gates the aircraft must come to a stop at, whether or not the
   * route reaches them.  Step 10 turns the ones on the route into stop points.
   */
  mandatoryStops: Set<VertexId>;

  /** Runway identifiers the clearance named, kept for reporting. */
  authorizedCrossings: Set<string>;

  /**
   * Runways whose holding position the footprint may legally pass: the
   * authorized crossings, plus the destination when we are cleared to enter it.
   * Step 9 tests the swept outline against exactly this set.
   */
  enterableRunways: Set<string>;

  deIcingInMission: boolean;

  /**
   * Where the mission ends: a hold-short gate, a runway entry vertex, or a
   * stand gate.  NO_VERTEX when the clearance names no reachable destination.
   */
  goal: VertexId;
  detail: string;
}

export function emptyPermissions(): PermissionSet {
  return {
    routeLabels: [],
    authorizedGates: new Set(),
    mandatoryStops: new Set(),
    authorizedCrossings: new Set(),
    enterableRunways: new Set(),
    deIcingInMission: false,
    goal: -1,
    detail: '',
  };
}

export function allowsGate(permissions: PermissionSet, v: VertexId): boolean {
  return permissions.authorizedGates.has(v);
}
