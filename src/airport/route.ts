// What the planner hands to the controller (Step 10), and the explicit failure
// results of Step 12.

import { type Path, pathIsEmpty } from './geometry.js';
import type { DirectedEdge } from './graph.js';

export type EventKind =
  | 'departure' //           the plan starts here
  | 'mergeComplete' //       the off-graph part ends and the graph route begins
  | 'softGate' //            ramp-to-ground handoff, stand entry, movement boundary
  | 'holdShort' //           an unauthorized holding position: there is a stop here
  | 'runwayCrossingStart' // passing an authorized hold-short onto a runway
  | 'runwayCrossingEnd' //   clear of the far hold-short
  | 'hotspotEnter'
  | 'hotspotExit'
  | 'arrival';

export const EVENT_KINDS: readonly EventKind[] = [
  'departure',
  'mergeComplete',
  'softGate',
  'holdShort',
  'runwayCrossingStart',
  'runwayCrossingEnd',
  'hotspotEnter',
  'hotspotExit',
  'arrival',
];

export function eventName(kind: EventKind): string {
  switch (kind) {
    case 'departure':
      return 'departure';
    case 'mergeComplete':
      return 'merge complete';
    case 'softGate':
      return 'soft gate';
    case 'holdShort':
      return 'hold short';
    case 'runwayCrossingStart':
      return 'runway crossing start';
    case 'runwayCrossingEnd':
      return 'runway crossing end';
    case 'hotspotEnter':
      return 'hotspot enter';
    case 'hotspotExit':
      return 'hotspot exit';
    case 'arrival':
      return 'arrival';
  }
}

export interface RouteEvent {
  readonly kind: EventKind;
  /** Arclength along Route.path. */
  readonly s: number;
  readonly message: string;
}

export interface StopPoint {
  /** Arclength at which the *nose* must be stopped short. */
  readonly s: number;
  readonly reason: string;
}

export interface SpeedPoint {
  readonly s: number;
  /** m/s */
  v: number;
}

export interface Route {
  path: Path;
  graphRoute: DirectedEdge[];
  events: RouteEvent[];
  stops: StopPoint[];
  speed: SpeedPoint[];
  /** Arclength at which the off-graph part ends. */
  mergeLength: number;
  cost: number;
}

export function emptyRoute(): Route {
  return {
    path: { samples: [] },
    graphRoute: [],
    events: [],
    stops: [],
    speed: [],
    mergeLength: 0,
    cost: 0,
  };
}

export function routeIsEmpty(route: Route): boolean {
  return pathIsEmpty(route.path);
}

/** Linear interpolation of the speed profile, clamped to the ends. */
export function speedAt(route: Route, s: number): number {
  const speed = route.speed;
  const first = speed[0];
  if (!first) return 0;
  const last = speed[speed.length - 1]!;
  if (s <= first.s) return first.v;
  if (s >= last.s) return last.v;

  let hi = 1;
  while (hi + 1 < speed.length && speed[hi]!.s < s) ++hi;
  const a = speed[hi - 1]!;
  const b = speed[hi]!;
  const span = b.s - a.s;
  if (span < 1e-9) return b.v;
  return a.v + ((b.v - a.v) * (s - a.s)) / span;
}

/**
 * Step 12: every way the planner is allowed to fail, spelled out.  A degraded
 * path is never an acceptable answer -- an explicit refusal is.
 */
export type PlanStatus =
  | 'success'
  | 'pushbackRequired' //         nose-in stand, no forward exit
  | 'noForwardExit' //            on a runway with no exit ahead
  | 'notCleared' //               the clearance does not reach the destination
  | 'blockedByObstacle' //        every merge candidate fails the sweep check
  | 'noRoute' //                  the filtered graph does not connect start to goal
  | 'localizationInconsistent'; // the footprint straddles zones that cannot coexist

export const PLAN_STATUSES: readonly PlanStatus[] = [
  'success',
  'pushbackRequired',
  'noForwardExit',
  'notCleared',
  'blockedByObstacle',
  'noRoute',
  'localizationInconsistent',
];

export function planStatusName(status: PlanStatus): string {
  switch (status) {
    case 'success':
      return 'success';
    case 'pushbackRequired':
      return 'pushback or tow required';
    case 'noForwardExit':
      return 'no forward exit from runway ahead';
    case 'notCleared':
      return 'not cleared';
    case 'blockedByObstacle':
      return 'blocked by obstacle, awaiting clearance';
    case 'noRoute':
      return 'no route';
    case 'localizationInconsistent':
      return 'localization inconsistent with map';
  }
}

export interface PlanResult {
  readonly status: PlanStatus;
  readonly route: Route;
  readonly detail: string;
}

export function planOk(result: PlanResult): boolean {
  return result.status === 'success';
}

export function refusePlan(status: PlanStatus, detail: string): PlanResult {
  return { status, route: emptyRoute(), detail };
}
