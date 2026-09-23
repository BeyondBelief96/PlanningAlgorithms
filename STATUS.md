# Where this is up to

Mid-migration. The repo currently holds **both** a finished TypeScript Part 1 and
a not-yet-ported C++ capstone. Both build and both are green. Delete this file
when the migration is finished.

## Done — TypeScript Part 1 (`npm test`)

Twelve grounded taxi-planning problems set at Kilo Field, replacing the old
abstract Chapter 2 exercises.

```
src/chart/        the given library: chart, aircraft, clearance, route,
                  turnaround, min-heap, and the two aerodromes
src/problems/     the twelve stubs you fill in  (currently red, as intended)
src/solutions/    the twelve worked answers      (94/94 tests green)
tests/            one file per problem, run TWICE -- against yours and against
                  the reference -- via tests/impl.ts and the two vitest projects
tools/            surface-demo.ts, turnaround-demo.ts
docs/taxi/        README + briefs for problems 01-05
```

Commands: `npm test`, `npm test -- p03`, `npm run test:watch`,
`npm run test:reference`, `npm run typecheck`, `npm run surface`,
`npm run turnaround`.

## Not done

1. **Briefs for problems 06-12.** `docs/taxi/p06..p12-*.md` do not exist yet, and
   the stubs in `src/problems/` link to them. Briefs 01-05 set the house style:
   *the situation, write, examples (verbatim in the test file), constraints,
   traps, edge cases the tests also check, follow-up.*
2. **Port the capstone to TypeScript.** ~7,200 lines of C++ under
   `include/planning/airport/`, `src/airport/`, `exercises/capstone/`,
   `solutions/capstone/`, `tests/capstone/`, `tools/taxi_demo.cpp`. This is the
   large remaining job: geometry, zone layers, Dubins curves, swept footprints,
   hybrid A\*.
3. **Delete the C++** once the capstone is ported: the directories above, plus
   the old Chapter 2 tree (`docs/ch02/`, `exercises/ch02/`, `solutions/ch02/`,
   `tests/ch02/`, `src/*.cpp`, `include/planning/*.hpp`, `tools/*_demo.cpp`),
   `CMakeLists.txt`, `CMakePresets.json`, `.clang-format`.
4. **Rewrite the top-level `README.md`.** It still describes the C++ layout and
   the old Chapter 2 framing. Leave it until the migration lands.

## Carried over, worth not re-deciding

- **Kilo Field's four deliberate awkwardnesses** — one-way Foxtrot, Delta's 36 m
  limit (an A320 clears it by 20 cm), Bravo crossing runway 18/36, and stand 3
  being code E on a code D apron. Every problem leans on at least one of them.
- **Problem 02 routes down runway 09/27**, because a runway is the fastest
  pavement on the aerodrome. That is deliberate and the tests assert it. It is
  the hook for Problems 05 and 06, which fix it by asking a better question
  rather than by special-casing.
- **Foxtrot and Delta cost exactly the same** (60 s from A1 to D1), so there are
  two equally good routes out of the apron. Forward and backward searches break
  that tie differently; both are correct, and a test says so.
- **Refusals are the product.** Half the tests check that the planner says no,
  for the right reason, naming how far it *could* get.

## Old C++ Chapter 2

Still present and still green (`ctest -L reference`). It was rewritten into
aviation vocabulary in an earlier pass — the taxi graphs are LaValle's Figures
2.8 and 2.21 relabelled edge for edge, so all the book's printed numbers still
check. Superseded by `docs/taxi/`, and due for deletion in step 3.

`exercises/ch02/ex01_forward_search/ex01_forward_search.cpp` contains an
in-progress hand-written `breadthFirstSearch` with an infinite loop in it (the
queue is never popped). Worth rescuing or discarding deliberately rather than
losing it in the delete.
