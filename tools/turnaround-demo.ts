// turnaround-demo -- the forty minutes before the eight-minute taxi.
//
//     npm run turnaround               the short turnaround on stand 2
//     npm run turnaround -- --winter   the same in freezing fog
//     npm run turnaround -- --crew 4   with only four people on the ramp
//     npm run turnaround -- --reference

import {
  circularTurnaround,
  shortTurnaround,
  type Turnaround,
  validateJobs,
  winterTurnaround,
} from '../src/chart/index.js';
import * as yours from '../src/problems/index.js';
import * as reference from '../src/solutions/index.js';

const args = process.argv.slice(2);
const impl = args.includes('--reference') ? reference : yours;
const label = args.includes('--reference') ? 'reference' : 'yours';

const crewArg = args.indexOf('--crew');
const crew = crewArg >= 0 ? Number(args[crewArg + 1] ?? 0) : 0;
const t: Turnaround = args.includes('--winter') ? winterTurnaround() : shortTurnaround();

console.log(`\n=== ${t.flight} (${label}) ===\n`);
console.log(`  ${'job'.padEnd(14)}${'min'.padStart(5)}${'crew'.padStart(6)}   waits for`);
for (const j of t.jobs)
  console.log(
    `  ${j.name.padEnd(14)}${String(j.minutes).padStart(5)}${String(j.crew).padStart(6)}   ` +
      `${j.needs.join(', ') || '-'}`,
  );

console.log('\n--- one job at a time (Problem 11) ---\n');
const serial = impl.pushbackOrder(t);
if (!serial.ok) {
  console.log(`  refused: ${serial.refusal}`);
} else {
  console.log(`  ${serial.order.join(' > ')}`);
  console.log(`  off-blocks at ${serial.totalMinutes} minutes`);
  const why = validateJobs(t, serial);
  if (why) console.log(`  !! the plan does not hold together: ${why}`);
}

console.log(
  `\n--- everything that can run at once, running at once (Problem 12${crew ? `, ${crew} crew` : ''}) ---\n`,
);
const parallel = impl.earliestOffBlock(t, crew);
if (!parallel.ok) {
  console.log(`  refused: ${parallel.refusal}`);
} else {
  const path = new Set(impl.criticalPath(t));
  for (let i = 0; i < parallel.order.length; ++i) {
    const name = parallel.order[i]!;
    const job = t.jobs.find((j) => j.name === name)!;
    const start = parallel.startMinutes[i]!;
    const bar = ' '.repeat(start) + '#'.repeat(Math.max(1, job.minutes));
    console.log(
      `  ${name.padEnd(14)}${String(start).padStart(4)}  ${bar.padEnd(56)}${path.has(name) ? ' <- critical' : ''}`,
    );
  }
  console.log(`\n  off-blocks at ${parallel.totalMinutes} minutes`);
  const why = validateJobs(t, parallel, crew);
  if (why) console.log(`  !! the plan does not hold together: ${why}`);

  console.log(
    `\n  The jobs marked critical are the only ones worth putting another loader\n` +
      `  on.  Everything else has slack, and speeding it up changes nothing.\n`,
  );
}

console.log('--- and a roster somebody wrote down wrong ---\n');
const bad = impl.pushbackOrder(circularTurnaround());
console.log(`  ${bad.ok ? 'accepted, which is wrong' : bad.refusal}\n`);
