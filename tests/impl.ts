// The switch that makes the same test file run against both implementations.
//
//   npm test               PLANNING_IMPL=yours      -> src/problems
//   npm run test:reference PLANNING_IMPL=reference  -> src/solutions
//
// Both modules satisfy the Problems interface, so a test written against
// `impl` cannot accidentally depend on which one it got.

import * as yours from '../src/problems/index.js';
import * as reference from '../src/solutions/index.js';
import type { Problems } from '../src/problems/types.js';

export const usingReference = process.env['PLANNING_IMPL'] === 'reference';

export const impl: Problems = usingReference ? reference : yours;

/** For test names, so the reporter says which side failed. */
export const implName = usingReference ? 'reference' : 'yours';
