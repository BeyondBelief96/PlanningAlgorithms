// The switch that makes the same capstone test file run against both
// implementations, exactly as tests/impl.ts does for Part 1.
//
//   npm test               PLANNING_IMPL=yours      -> src/capstone/problems
//   npm run test:reference PLANNING_IMPL=reference  -> src/capstone/solutions

import * as yours from '../../src/capstone/problems/index.js';
import * as reference from '../../src/capstone/solutions/index.js';
import type { Capstone } from '../../src/capstone/types.js';

export const usingReference = process.env['PLANNING_IMPL'] === 'reference';

export const impl: Capstone = usingReference ? reference : yours;

/** For test names, so the reporter says which side failed. */
export const implName = usingReference ? 'reference' : 'yours';
