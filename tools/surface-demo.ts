// surface-demo -- the same taxi, planned every way Part 1 knows.
//
//     npm run surface                  Kilo Field, every method
//     npm run surface -- --hub         the busy hub, where the guess earns it
//     npm run surface -- --table       the cost-to-go table for every point
//     npm run surface -- --reference   use the worked answers, not yours
//
// Cost is seconds; expanded and generated are how much of the aerodrome the
// planner had to think about.

import {
  a320,
  b777,
  busyHub,
  type Chart,
  dash8,
  describe,
  kiloField,
  NO_NODE,
  standDeparture,
  noCrossingClearance,
  type TaxiRoute,
  UNREACHABLE,
} from '../src/chart/index.js';
import * as yours from '../src/problems/index.js';
import * as reference from '../src/solutions/index.js';

const args = process.argv.slice(2);
const impl = args.includes('--reference') ? reference : yours;
const label = args.includes('--reference') ? 'reference' : 'yours';

function row(name: string, chart: Chart, route: TaxiRoute): void {
  const head = `  ${name.padEnd(26)}`;
  if (!route.ok) {
    console.log(`${head}refused: ${route.refusal}`);
    return;
  }
  console.log(
    `${head}${route.seconds.toFixed(0).padStart(7)}s${String(route.links.length).padStart(7)}` +
      `${String(route.expanded).padStart(11)}${String(route.generated).padStart(11)}   ` +
      `${describe(chart, route)}`,
  );
}

function header(): void {
  console.log(
    `  ${'method'.padEnd(26)}${'time'.padStart(8)}${'legs'.padStart(6)}` +
      `${'expanded'.padStart(11)}${'generated'.padStart(11)}   route`,
  );
}

function kilo(): void {
  const chart = kiloField();
  const from = chart.find('STAND 2');
  const to = chart.find('HS 27 E');
  console.log(
    `\n=== Kilo Field: stand 2 to the holding point short of 27 (${label}) ===\n` +
      `    ${chart.numNodes} points, ${chart.numLinks} legs\n`,
  );
  header();
  row('01 fewest legs', chart, impl.fewestLegs(chart, from, to));
  row('02 quickest', chart, impl.quickestRoute(chart, a320(), from, to));
  row('03 quickest, A320', chart, impl.quickestRouteFor(chart, a320(), from, to));
  row('03 quickest, DHC8', chart, impl.quickestRouteFor(chart, dash8(), from, to));
  row('03 quickest, B777', chart, impl.quickestRouteFor(chart, b777(), from, to));
  row('04 with turns, A320', chart, impl.quickestRouteWithTurns(chart, a320(), from, to));
  row('05 under the clearance', chart, impl.routeUnderClearance(chart, a320(), from, standDeparture()));
  row('06 the whole departure', chart, impl.planDeparture(chart, a320(), from, standDeparture()));
  row('06 without the crossing', chart, impl.planDeparture(chart, a320(), from, noCrossingClearance()));
  row('07 guided', chart, impl.quickestRouteGuided(chart, a320(), from, to));

  console.log(
    '\n  Look at 02.  It is the quickest route and it taxis 500 m down runway\n' +
      '  09/27, because a runway is the fastest pavement on the aerodrome.  It is\n' +
      '  a correct answer to the question it was asked.  06 is where asking a\n' +
      '  better question stops it.\n',
  );
}

function hub(): void {
  const chart = busyHub();
  const from = chart.find('STAND 1');
  const to = chart.find('STAND 15');
  console.log(
    `\n=== the busy hub: stand 1 to stand 15 (${label}) ===\n` +
      `    ${chart.numNodes} points, ${chart.numLinks} legs\n`,
  );
  header();
  const blind = impl.quickestRouteWithTurns(chart, a320(), from, to);
  const guided = impl.quickestRouteGuided(chart, a320(), from, to);
  row('04 unguided', chart, blind);
  row('07 guided', chart, guided);
  if (blind.ok && guided.ok)
    console.log(
      `\n  Same ${guided.seconds.toFixed(0)} seconds, ${blind.expanded} points examined against ` +
        `${guided.expanded}.\n  On a lattice there are hundreds of equally good routes and nothing to\n` +
        '  tell them apart, which is exactly where an estimate earns its keep.\n',
    );
}

function table(): void {
  const chart = kiloField();
  const goal = chart.find('HS 27 E');
  const t = impl.secondsToGo(chart, a320(), goal);
  console.log(`\n=== minutes to go, to the holding point short of 27 (${label}) ===\n`);
  console.log(`  ${'point'.padEnd(12)}${'to go'.padStart(12)}   next`);
  for (const n of chart.nodes) {
    const s = t.seconds[n.id];
    const shown = s === undefined || s === UNREACHABLE ? 'unreachable' : `${s.toFixed(0)}s`;
    console.log(
      `  ${n.name.padEnd(12)}${shown.padStart(12)}   ${impl.nextInstruction(chart, t, n.id)}`,
    );
  }
  console.log(
    '\n  One number per point, so an aeroplane that is not where the plan said\n' +
      '  does not need a new plan.  It needs to read the number under its wheels.\n',
  );
  const from = chart.find('F1');
  const walked = impl.followTable(chart, a320(), t, from);
  console.log(`  from F1, with no search at all: ${describe(chart, walked)}`);
  if (walked.stopAt !== NO_NODE) console.log(`  stopping at ${chart.node(walked.stopAt).name}`);
}

if (args.includes('--hub')) hub();
else if (args.includes('--table')) table();
else kilo();
