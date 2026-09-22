# Capstone exercises — Airport surface movement planning

Twelve stubs, one per step of the design. Read
[docs/capstone/README.md](../../docs/capstone/README.md) first, and
[00-the-invariant.md](../../docs/capstone/00-the-invariant.md) before that.

| | Exercise | Step | Implements |
|---|---|---|---|
| 01 | [The zone layer](ex01_zone_layer/README.md) | 1 | `zoneAt`, `classifyFootprint`, `configurationSpace` |
| 02 | [Gated boundaries](ex02_gated_graph/README.md) | 2 | `buildGatedGraph` |
| 03 | [Start mode](ex03_start_mode/README.md) | 3 | `localize` |
| 04 | [The permission set](ex04_permissions/README.md) | 4 | `buildPermissions` |
| 05 | [The graph filter](ex05_graph_filter/README.md) | 5 | `filterGraph`, `turnIsFeasible` |
| 06 | [Cost-to-go](ex06_cost_to_go/README.md) | 6 | `computeCostToGo`, `advanceRouteIndex`, costs |
| 07 | [Merge candidates](ex07_merge_candidates/README.md) | 7 | `generateMergeCandidates` |
| 08 | [The merge ladder](ex08_merge_ladder/README.md) | 8 | five closed forms, and `planMerge` |
| 09 | [Hybrid A\*](ex09_hybrid_astar/README.md) | 8 | `planHybridAStar` |
| 10 | [The swept footprint](ex10_swept_footprint/README.md) | 9 | `validateSweep` |
| 11 | [Route assembly](ex11_route_assembly/README.md) | 10 | `assembleRoute` |
| 12 | [Monitor and replan](ex12_monitor_and_replan/README.md) | 11–12 | `geofenceMonitor`, `shouldReplan`, `spliceRoute` |

## Do them in order

**This is a pipeline, so the exercises are not independent.** A test for Exercise
NN generally needs Exercises 1 through NN−1 to work, because it has to build a
gated graph and a permission set before it can say anything about a merge
candidate. `tests/capstone/capstone_fixture.hpp` builds those stages for you, and
it will build them out of whatever you have written so far.

Three exercises are self-contained and can be done in any order, on their own:

- **08 — the merge ladder.** Pure geometry between two poses.
- **09 — hybrid A\*.** The tests build their own 400 × 200 yard.
- **12 — the monitor and replanning.** The tests build their own vehicle states.

If you want to start somewhere other than the beginning, start at 08.

## The signatures are fixed

Every declaration lives in
[`include/planning/airport/taxi_planner.hpp`](../../include/planning/airport/taxi_planner.hpp),
so that the same test binary can be built against your code and against the
reference. Read that header end to end once before you start — it is the shape of
the whole system in about four hundred lines, and every comment in it is load
bearing.

You do not need to edit anything in `include/` or `src/`. `src/airport/pipeline.cpp`
is worth reading once you have Exercise 03 working: it is given, it calls your
twelve functions in order, and it is deliberately short because every interesting
decision lives in one of them.

## Running

```powershell
# everything, your implementations
ctest --test-dir build/vs -C Debug -R capstone --output-on-failure

# one exercise
ctest --test-dir build/vs -C Debug -R capstone.ex06 --output-on-failure

# stuck?  the reference is held to exactly the same tests
ctest --test-dir build/vs -C Debug -R capstone.ex06.reference --output-on-failure
```

On a single-config generator such as Ninja, drop `-C Debug`.
