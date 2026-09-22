# Capstone reference solutions

One file per exercise, mirroring `exercises/capstone/`. Every one compiles
against the same headers and is checked by the same tests:

```powershell
ctest --test-dir build/vs -C Debug -L reference -R capstone --output-on-failure
```

All twelve pass, and together they plan all eight scenarios in `taxi_demo` —
including the three that must refuse.

## How to use these

**Read them after you have written yours, not before.** The value of the exercise
is almost entirely in the hour before you get it working.

When you do read them, the comments carry the reasoning rather than a narration
of the code — why the gate check compares zone priorities rather than just
checking authorization, why the S-curve turns toward the line first, why the stop
point is found by bisection instead of by subtracting an arclength. Those are the
parts worth arguing with.

If your version differs and both pass the tests, yours is not wrong. The tests
pin down behaviour, not implementation, and several of these have more than one
reasonable shape.

## Where the interesting decisions are

| File | Worth a look for |
|---|---|
| `ex01_zone_layer` | overlays as flags; the three different offset deltas |
| `ex02_gated_graph` | scan to bracket, bisect to place; `innerZone` by priority |
| `ex03_start_mode` | the stand lead-out direction, and why there is no flag for it |
| `ex04_permissions` | why "hold short" and "line up" split the destination |
| `ex05_graph_filter` | the directional gate rule, in four lines |
| `ex06_cost_to_go` | the product state space, and the route state machine |
| `ex07_merge_candidates` | the two zone tests, and the lead-in across junctions |
| `ex08_merge_ladder` | five closed forms; the S-curve derivation in particular |
| `ex09_hybrid_astar` | the lattice as a "dead" set, and the analytic expansion |
| `ex10_swept_footprint` | outline versus centreline; de-duplicating the reports |
| `ex11_route_assembly` | the fillet radius argument, and the bisected stop point |
| `ex12_monitor_and_replan` | how little the monitor is allowed to know |

Also worth reading once you have Exercise 03 working:
[`src/airport/pipeline.cpp`](../../src/airport/pipeline.cpp). It is given, it
calls all twelve in order, and it is about a hundred lines because every
interesting decision lives somewhere else.

## Deliberate limitations

These are teaching implementations. Six places where a production version would
differ, all of them flagged in comments or in the exercise READMEs:

- **`ex01`** uses a uniform grid rather than an R-tree, and an isotropic miter
  offset rather than a Minkowski sum. The offset is conservative across the
  wingspan and optimistic along the fuselage — a 37 m aeroplane grown by 22 m of
  half-wingspan still has 25 m of tail sticking out of the approximation. Step 9
  is what catches that, and it is not an accident that it exists.
- **`ex02`** assumes one zone crossing per scan bracket, which is true for
  straight edges against convex polygons and not in general.
- **`ex09`** searches a pose lattice, so the result is optimal on the lattice and
  not in the plane. It also uses forward-only primitives: no reversing.
- **`ex10`** models the gear as three points at fixed offsets, which ignores
  main-gear cut-in through a turn, and samples the sweep every two metres rather
  than testing the continuous swept region.
- **`ex11`** joins straights to arcs with a curvature discontinuity. A real
  steering controller cannot track that exactly; clothoids are the fix, and they
  are the biggest single gap between this and something you could drive.
- **`ex12`**'s monitor is independent of the planner in structure but not in
  provenance — it shares `zoneAt()`, the zone layer and the aircraft model. A
  certifiable version would share nothing, and would be written by someone else.
