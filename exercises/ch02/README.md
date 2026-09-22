# Chapter 2 exercises

Eleven stubs. Each directory holds a `README.md` (the brief) and a `.cpp` (where
you write). Signatures are fixed by the headers in `include/planning/`, so the
same test file compiles against your code and against the reference.

Work them in order. Each one is a small delta on the one before, and skipping
ahead mostly means rediscovering something the previous exercise would have
taught you.

| # | Exercise | Implements | Book |
|---|---|---|---|
| 01 | [forward search](ex01_forward_search/README.md) | `breadthFirstSearch`, `depthFirstSearch` | 2.2.1, Fig 2.4 |
| 02 | [Dijkstra](ex02_dijkstra/README.md) | `dijkstra` | 2.2.2 |
| 03 | [A* and best-first](ex03_astar/README.md) | `aStar`, `bestFirstSearch` | 2.2.2, Ex 18 |
| 04 | [iterative deepening](ex04_iterative_deepening/README.md) | `iterativeDeepening`, `iterativeDeepeningAStar` | 2.2.2 |
| 05 | [backward, bidirectional](ex05_backward_bidirectional/README.md) | `backwardDijkstra`, `bidirectionalSearch` | 2.2.3, Ex 6, 20 |
| 06 | [backward value iteration](ex06_backward_value_iteration/README.md) | `backwardValueIteration`, `planFromBackwardValues` | 2.3.1.1, Ex 22 |
| 07 | [forward value iteration](ex07_forward_value_iteration/README.md) | `forwardValueIteration` | 2.3.1.2, Ex 23 |
| 08 | [stationary value iteration](ex08_stationary_value_iteration/README.md) | `backwardValueIterationStationary`, `forwardValueIterationStationary`, `planFromPolicy` | 2.3.2, Ex 1 |
| 09 | [STRIPS state space](ex09_strips_state_space/README.md) | `StripsStateSpace` | 2.4.2, Ex 7 |
| 10 | [planning graph](ex10_planning_graph/README.md) | `buildPlanningGraph`, `goalPossiblyReachable` | 2.5.2, Ex 15 |
| 11 | [planning as SAT](ex11_planning_as_sat/README.md) | `encodePlanningAsSat`, `dpll`, `extractPlan` | 2.5.3, Ex 16 |

## The loop

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex01 --output-on-failure   # your code
ctest --test-dir build/vs -C Debug -L yours --output-on-failure       # all of it
```

Everything starts red. The stubs compile and return empty results, so a failing
test tells you what is missing rather than what will not link.

## When you are stuck

1. **Check the reference passes.** `ctest -R ch02.ex01.reference`. If it does, the
   test is fine and the gap is in your code.
2. **Print the intermediate.** For value iteration especially:
   ```cpp
   std::cout << formatCostTable(problem, {"G*_5", "G*_4", "G*_3", "G*_2", "G*_1"}, G);
   ```
   Then compare against the figure in the book, cell by cell. One wrong cell
   usually points at one wrong line.
3. **Use the small fixtures.** `figure2_8()` has five states. Trace it by hand.
4. **Then read the solution** in `solutions/ch02/`, which is commented with the
   reasoning rather than just the code.

## Useful helpers you are given

| | |
|---|---|
| `reconstructForward(problem, goal, parent, parentAction)` | parent pointers to a `Plan` |
| `reconstructBackward(problem, start, next, nextAction)` | the same, for backward search |
| `concatenate(problem, first, second)` | join two plans that meet at a state |
| `validate(problem, plan)` | returns "" if the plan is really valid, else why not |
| `toString(problem, plan)` | printable plan with costs and counters |
| `formatCostTable(problem, labels, rows)` | prints a table the way Figure 2.9 does |
| `zeroHeuristic()` | `Ĝ(x) = 0`, which turns A* into Dijkstra |
| `problem.finalCost(x)` | `l_F(x)`: 0 on the goal, `kInfinity` elsewhere |

Plan reconstruction is bookkeeping, not algorithm. Use the helpers and spend the
time on the part the chapter is about.
