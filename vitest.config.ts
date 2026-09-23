import { defineConfig } from 'vitest/config';

// The unusual part of this repo: every test file is run TWICE.
//
//   npm test              against src/problems  -- the stubs you fill in
//   npm run test:reference against src/solutions -- the worked answers
//
// So the reference is not a separate program you squint at; it is held to
// exactly the tests you are held to.  tests/impl.ts is the switch.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'yours',
          include: ['tests/**/*.test.ts'],
          env: { PLANNING_IMPL: 'yours' },
        },
      },
      {
        test: {
          name: 'reference',
          include: ['tests/**/*.test.ts'],
          env: { PLANNING_IMPL: 'reference' },
        },
      },
    ],
  },
});
