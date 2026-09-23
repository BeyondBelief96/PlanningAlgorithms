# The exercises

Eleven stubs. Each directory holds a `README.md` — the brief, the traps, what the
tests check — and a `.cpp` where you write. Signatures are fixed by the headers in
`include/planning/`, so the same test file compiles against your code and against
the reference.

Work them in order. Each is a small delta on the one before, and skipping ahead
mostly means rediscovering something the previous exercise would have taught you.

| # | Exercise | What it plans | Implements |
|---|---|---|---|
| 01 | [forward search](ex01_forward_search/README.md) | a route at all | `breadthFirstSearch`, `depthFirstSearch` |
| 02 | [Dijkstra](ex02_dijkstra/README.md) | the quickest route | `dijkstra` |
| 03 | [A\* and best first](ex03_astar/README.md) | the quickest route, faster | `aStar`, `bestFirstSearch` |
| 04 | [iterative deepening](ex04_iterative_deepening/README.md) | …without holding the frontier | `iterativeDeepening`, `iterativeDeepeningAStar` |
| 05 | [from the other end](ex05_backward_bidirectional/README.md) | backwards, and from both ends | `backwardDijkstra`, `bidirectionalSearch` |
| 06 | [the cost still to go](ex06_backward_value_iteration/README.md) | every place, fixed budget | `backwardValueIteration`, `planFromBackwardValues` |
| 07 | [the cost already spent](ex07_forward_value_iteration/README.md) | the same, from the other side | `forwardValueIteration` |
| 08 | [no budget](ex08_stationary_value_iteration/README.md) | what to do from anywhere | `backwardValueIterationStationary`, `forwardValueIterationStationary`, `planFromPolicy` |
| 09 | [a description you can search](ex09_strips_state_space/README.md) | a turnaround, not a taxi | `StripsStateSpace` |
| 10 | [how early could it finish](ex10_planning_graph/README.md) | a bound, without searching | `buildPlanningGraph`, `goalPossiblyReachable` |
| 11 | [planning as satisfiability](ex11_planning_as_sat/README.md) | the same, as a formula | `encodePlanningAsSat`, `dpll`, `extractPlan` |

## The loop

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex01 --output-on-failure   # one exercise
ctest --test-dir build/vs -C Debug -L yours --output-on-failure       # all of them
```

Everything starts red. The stubs compile and return empty results, so a failing
test tells you what is missing rather than what will not link.

## When you are stuck

1. **Check the reference passes.** `ctest -R ch02.ex01.reference`. If it does, the
   test is fine and the gap is in your code.
2. **Print the intermediate.** For the table exercises especially:
   ```cpp
   std::cout << formatCostTable(problem, {"0 left", "1 left", "2 left", "3 left", "4 left"}, G);
   ```
   Then compare against the table in the guide, cell by cell. One wrong cell
   usually points at one wrong line.
3. **Use the small fixtures.** `departureTaxi()` has five places in it. Trace it
   on paper — it takes five minutes and it is the cheapest check there is.
4. **Then read the solution** in `solutions/ch02/`, which is commented with the
   reasoning rather than a narration of the code.

## What you are given

| | |
|---|---|
| `reconstructForward(problem, goal, parent, parentAction)` | parent pointers to a `Plan` |
| `reconstructBackward(problem, start, next, nextAction)` | the same, for backward search |
| `concatenate(problem, first, second)` | join two routes that meet at a place |
| `validate(problem, plan)` | `""` if the route really holds up, else what is wrong with it |
| `toString(problem, plan)` | printable route with costs and counters |
| `formatCostTable(problem, labels, rows)` | prints a table, one row per sweep |
| `zeroHeuristic()` | a guess of zero, which turns A\* into Dijkstra |
| `problem.finalCost(x)` | 0 where the aeroplane may stop, infinity elsewhere |

Walking parent pointers back is bookkeeping, not algorithm. Use the helpers and
spend the time on the part that is actually the subject.

## The fixtures

Described in full in the [index](../../docs/ch02/README.md); in one line each:

- `departureTaxi()` — stand 2 out to the holding point short of 27, five nodes.
- `bypassTaxi()` — stand 1 out to the holding point short of 36, where the
  obvious route is not the quick one.
- `maps::standArea()` — 7×5 of pavement with a pier in the way.
- `maps::deadEndPier()` — 21×10, a cul-de-sac facing away from the goal.
- `maps::openApron()` — 20×12, wide open, hundreds of equal-cost routes.
- `cargoHoldProblem()` — two containers and a door that must end shut.
- `groundPowerProblem()` — walk to the panel, connect the GPU.
