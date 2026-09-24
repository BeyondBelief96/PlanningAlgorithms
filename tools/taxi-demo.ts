// The capstone end to end, on every scenario.
//
//   npm run taxi                     every scenario, one paragraph each
//   npm run taxi map                 the airport, drawn
//   npm run taxi gates               what Exercise 02 made of the raw graph
//   npm run taxi hybrid              the closed-form merge and the search, side by side
//   npm run taxi <scenario>          one scenario, with the route drawn on the map
//   npm run taxi <scenario> -- -v    ...and every event, stop and speed
//
// Scenario names: stand-departure, nose-in-stand, apron-off-line,
// taxiway-capture, landing-rollout, landing-no-exit, inside-protected, oversize.
//
// Add PLANNING_IMPL=reference to run it against the worked answers, which is
// how you watch the whole thing work before you have written a line.

import {
  allScenarios,
  describeClearance,
  kiloAirport,
  parseClearance,
  pathLength,
  PI,
  planStatusName,
  planOk,
  type Scenario,
  scenarioByName,
  speedAt,
} from '../src/airport/index.js';
import { planTaxi } from '../src/capstone/pipeline.js';
import {
  describeGates,
  describeLocalization,
  describeRoute,
  renderAscii,
} from '../src/capstone/render.js';
import { defaultHybridAStarParams, mergeMethodName } from '../src/capstone/types.js';
import * as reference from '../src/capstone/solutions/index.js';
import * as yours from '../src/capstone/problems/index.js';

const steps = process.env['PLANNING_IMPL'] === 'reference' ? reference : yours;
const which = process.env['PLANNING_IMPL'] === 'reference' ? 'solutions' : 'problems';

const deg = (radians: number): string => ((radians * 180) / PI).toFixed(0);

function runScenario(scenario: Scenario, draw: boolean, verbose: boolean): void {
  const airport = kiloAirport();
  const clearance = parseClearance(scenario.clearance);

  console.log(`== ${scenario.name} (${scenario.aircraft.type})`);
  console.log(`   ${scenario.description}`);
  console.log(`   clearance: ${describeClearance(clearance)}`);
  console.log(`   expected:  ${scenario.expectation}`);

  const result = planTaxi(
    steps,
    airport.zones,
    airport.graph,
    scenario.aircraft,
    scenario.start,
    clearance,
  );

  console.log(`   result:    ${planStatusName(result.status)} -- ${result.detail}`);
  if (planOk(result))
    process.stdout.write(
      describeRoute(steps.buildGatedGraph(airport.graph, airport.zones), result.route),
    );

  if (draw)
    process.stdout.write(
      '\n' +
        renderAscii(steps, airport.zones, {
          route: planOk(result) ? result.route : undefined,
          aircraft: scenario.start,
        }),
    );

  if (verbose) {
    const gated = steps.buildGatedGraph(airport.graph, airport.zones);
    console.log('\n   localization:');
    process.stdout.write(
      describeLocalization(
        steps.localize(airport.zones, gated, scenario.aircraft, scenario.start),
      ),
    );
    if (planOk(result)) {
      console.log('   speed profile (every 100 m):');
      const length = pathLength(result.route.path);
      for (let s = 0; s <= length; s += 100)
        console.log(`     ${s.toFixed(0).padStart(8)} m   ${speedAt(result.route, s).toFixed(1)} m/s`);
    }
  }
  console.log('');
}

/**
 * The ladder almost always stops before the last rung, which makes hybrid A*
 * easy to forget about.  This runs both on the same merge, so you can see what
 * the search buys and what it costs.
 */
function compareMergePlanners(): void {
  const airport = kiloAirport();
  const scenario = scenarioByName('apron-off-line');
  const gated = steps.buildGatedGraph(airport.graph, airport.zones);
  const clearance = parseClearance(scenario.clearance);
  const permissions = steps.buildPermissions(gated, airport.zones, clearance);
  const filter = steps.filterGraph(gated, scenario.aircraft, permissions);
  const costToGo = steps.computeCostToGo(gated, permissions, filter, scenario.aircraft);
  const localization = steps.localize(airport.zones, gated, scenario.aircraft, scenario.start);
  const candidates = steps.generateMergeCandidates(
    gated, airport.zones, scenario.aircraft, localization, permissions, filter, costToGo,
  );

  const candidate = candidates[0];
  if (!candidate) {
    console.log('no merge candidates');
    return;
  }
  const params = steps.paramsFor(localization.mode, scenario.aircraft);

  console.log(
    `merging from (${scenario.start.p.x.toFixed(1)}, ${scenario.start.p.y.toFixed(1)}) at ` +
      `${deg(scenario.start.heading)} deg onto (${candidate.target.p.x.toFixed(1)}, ` +
      `${candidate.target.p.y.toFixed(1)}) at ${deg(candidate.target.heading)} deg\n`,
  );

  const closedForm = steps.planMerge(scenario.start, candidate, params);
  console.log(
    '  ladder:     ' +
      (closedForm.found
        ? `${mergeMethodName(closedForm.method)}, ${pathLength(closedForm.path).toFixed(1)} m`
        : 'no closed form fits'),
  );

  const cspace = steps.configurationSpace(airport.zones, scenario.aircraft);
  const hybrid = defaultHybridAStarParams();
  hybrid.radius = Math.max(scenario.aircraft.minTurnRadius, params.preferredRadius);
  const searched = steps.planHybridAStar(cspace, scenario.start, candidate, ['apron'], hybrid);
  console.log(
    '  hybrid A*:  ' +
      (searched.found
        ? `${pathLength(searched.path).toFixed(1)} m (${searched.detail})`
        : `not found (${searched.detail})`),
  );

  console.log(
    '\nOn an open apron the analytic expansion usually solves it at the root, so\n' +
      'the search looks cheap and sometimes even shorter.  The ladder is still\n' +
      'first, for two reasons: the closed forms cost microseconds rather than\n' +
      'milliseconds, and a pilot watching from the flight deck can tell what the\n' +
      'aeroplane is about to do.  Put something in the way -- see the wall in\n' +
      'tests/capstone/ex09-hybrid-astar.test.ts -- and the numbers change.',
  );
}

const args = process.argv.slice(2);
const command = args[0] ?? '';
const verbose = args.includes('-v');

console.log(`(running against src/capstone/${which})\n`);

if (command === 'map') {
  console.log('Kilo Field\n');
  process.stdout.write(renderAscii(steps, kiloAirport().zones));
} else if (command === 'gates') {
  const airport = kiloAirport();
  const gated = steps.buildGatedGraph(airport.graph, airport.zones);
  console.log(
    `raw graph:   ${airport.graph.numVertices} vertices, ${airport.graph.numEdges} edges\n` +
      `gated graph: ${gated.numVertices} vertices, ${gated.numEdges} edges\n`,
  );
  process.stdout.write(describeGates(gated));
} else if (command === 'hybrid') {
  compareMergePlanners();
} else if (command === '') {
  for (const scenario of allScenarios()) runScenario(scenario, false, false);
} else {
  runScenario(scenarioByName(command), true, verbose);
}
