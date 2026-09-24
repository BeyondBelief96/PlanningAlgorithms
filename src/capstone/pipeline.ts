// The given orchestration: the twelve exercises in order.
//
// This file is *given*, and it runs against both your implementations and the
// reference, so it always calls whichever set you are testing.  That is what
// `steps` is for: in a compiled language this is done by linking, and in
// TypeScript it is done by passing the module in.
//
// Read it once you have Exercise 03 working: it is the map of the whole
// capstone, and it is deliberately short, because every interesting decision
// lives in one of the twelve functions it calls.

import {
  type AircraftModel,
  type Clearance,
  NO_VERTEX,
  pathIsEmpty,
  PI,
  type PlanResult,
  type Pose,
  refusePlan,
  type TaxiGraph,
  type ZoneClass,
  type ZoneLayer,
} from '../airport/index.js';
import {
  type Capstone,
  defaultHybridAStarParams,
  defaultSpeedLimits,
  type EdgeFilter,
  mergeMethodName,
  startModeName,
  type SweepResult,
  violationName,
} from './types.js';

/**
 * Trying every candidate would be correct and slow.  They arrive cheapest
 * first, so a bounded prefix is what a real planner would budget for.
 */
const MAX_CANDIDATES_TRIED = 48;

/** The two commonest reasons an edge was struck out, for the refusal message. */
function describeFilter(filter: EdgeFilter): string {
  const seen: string[] = [];
  for (const reason of filter.reason) {
    if (reason === '' || seen.includes(reason)) continue;
    seen.push(reason);
    if (seen.length === 2) break;
  }
  return seen.length === 0 ? 'nothing was filtered out' : seen.join('; ');
}

function describeSweep(sweep: SweepResult): string {
  const first = sweep.violations[0];
  return first ? `${violationName(first.kind)}: ${first.what}` : 'unknown';
}

export function planTaxi(
  steps: Capstone,
  layer: ZoneLayer,
  rawGraph: TaxiGraph,
  aircraft: AircraftModel,
  start: Pose,
  clearance: Clearance,
): PlanResult {
  // Step 2.  In a real system this is done once at load time, not per plan.
  const gated = steps.buildGatedGraph(rawGraph, layer);

  // Step 3.
  const localization = steps.localize(layer, gated, aircraft, start);
  if (localization.mode === 'fault')
    return refusePlan('localizationInconsistent', localization.detail);
  if (localization.mode === 'stand' && Math.abs(localization.headingError) > 0.5 * PI)
    return refusePlan('pushbackRequired', 'parked nose-in: the lead-out line runs the other way');

  // Step 4.
  const permissions = steps.buildPermissions(gated, layer, clearance);
  if (permissions.goal === NO_VERTEX) return refusePlan('notCleared', permissions.detail);

  // Being on a runway is not a violation when the landing clearance put you
  // there.  Add the runway underneath the aircraft to the enterable set so that
  // Step 9 and Step 11 do not flag the ground it is already standing on.
  if (localization.zone === 'runway' || localization.zone === 'runwayProtected') {
    const here = steps.zoneAt(layer, start.p);
    if (here.polygonId >= 0)
      for (const ident of layer.polygon(here.polygonId).idents)
        permissions.enterableRunways.add(ident);
  }

  // Steps 5 and 6.
  const filter = steps.filterGraph(gated, aircraft, permissions);
  const costToGo = steps.computeCostToGo(gated, permissions, filter, aircraft);

  // Step 7.
  const candidates = steps.generateMergeCandidates(
    gated,
    layer,
    aircraft,
    localization,
    permissions,
    filter,
    costToGo,
  );
  if (candidates.length === 0) {
    if (localization.mode === 'runway')
      return refusePlan('noForwardExit', 'no runway exit ahead that the clearance allows');
    return refusePlan(
      'noRoute',
      `no guidance line in this zone leads to ${permissions.detail} (${describeFilter(filter)})`,
    );
  }

  // Step 8, then Step 9, for each candidate in cost order.
  const params = steps.paramsFor(localization.mode, aircraft);
  let cspace: ZoneLayer | undefined;
  let lastProblem = 'no candidate survived the sweep check';

  const tried = Math.min(candidates.length, MAX_CANDIDATES_TRIED);
  for (let i = 0; i < tried; ++i) {
    const candidate = candidates[i]!;

    let merge = steps.planMerge(start, candidate, params);
    if (!merge.found && params.allowHybridAStar) {
      cspace ??= steps.configurationSpace(layer, aircraft);
      const allowed: ZoneClass[] = [localization.zone];
      if (localization.mode === 'stand') allowed.push('apron');
      const hybrid = defaultHybridAStarParams();
      hybrid.radius = Math.max(aircraft.minTurnRadius, params.preferredRadius);
      merge = steps.planHybridAStar(cspace, start, candidate, allowed, hybrid);
    }
    if (!merge.found) continue;

    // Step 9 on the off-graph part.
    const offGraph = steps.validateSweep(
      layer, aircraft, merge.path, localization.zone, permissions, true,
    );
    if (!offGraph.ok) {
      lastProblem = `merge rejected, ${describeSweep(offGraph)}`;
      continue;
    }

    const graphRoute = steps.extractGraphRoute(costToGo, candidate.edge, candidate.routeIndex);
    if (graphRoute.length === 0) continue;

    // Step 10.
    const route = steps.assembleRoute(
      gated, layer, aircraft, merge, graphRoute, permissions, defaultSpeedLimits(),
    );
    if (pathIsEmpty(route.path)) continue;

    // Step 9 again, on the whole thing.  The graph should already be safe, but
    // map error and this particular wingspan make it worth checking.
    const onGraph = steps.validateSweep(
      layer, aircraft, route.path, localization.zone, permissions, false,
    );
    if (!onGraph.ok) {
      lastProblem = `route rejected, ${describeSweep(onGraph)}`;
      continue;
    }

    return {
      status: 'success',
      route,
      detail:
        `${startModeName(localization.mode)} start, ` +
        `merged by ${mergeMethodName(merge.method)}, ${permissions.detail}`,
    };
  }

  return refusePlan('blockedByObstacle', lastProblem);
}
