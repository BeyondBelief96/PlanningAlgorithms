# Capstone — Airport Surface Movement Planning

Chapter 2 gave you a state space and asked you to search it. This asks something
harder: build a planner that is **allowed** to be wrong about the route, and is
**never** allowed to be wrong about which piece of concrete the aeroplane is on.

An autonomous aircraft taxiing at a real airport is a planning problem with an
unusual shape. The cost function barely matters — a taxi route that is thirty
seconds slow is a nuisance. The constraints matter enormously — a taxi route that
crosses a runway without a clearance is an incident report. Almost everything in
the twelve steps below exists to make one class of mistake structurally
impossible rather than merely unlikely.

## The invariant

Everything is built around one rule:

> **Off-graph motion stays inside the zone you start in, and every zone
> transition happens on the graph, at a designated crossing point.**

The planner never gets to invent a path from the apron onto a taxiway, or from a
taxiway onto a runway. Crossings happen only where the map defines them —
hold-short lines, apron entry points — and runway crossings only when a clearance
permits them.

Read [00-the-invariant.md](00-the-invariant.md) before anything else. It is two
pages and it is the whole design.

## The twelve steps, and the twelve exercises

| Step | What it does | Exercise |
|---|---|---|
| 1 | Build a zone layer from the map polygons | [01](../../exercises/capstone/ex01_zone_layer/README.md) |
| 2 | Split the guidance-line graph at zone boundaries; mark gates | [02](../../exercises/capstone/ex02_gated_graph/README.md) |
| 3 | Localize the footprint and pick a start mode | [03](../../exercises/capstone/ex03_start_mode/README.md) |
| 4 | Turn the ATC clearance into a permission set | [04](../../exercises/capstone/ex04_permissions/README.md) |
| 5 | Filter the graph for this aircraft and this mission | [05](../../exercises/capstone/ex05_graph_filter/README.md) |
| 6 | Reverse Dijkstra for cost-to-go | [06](../../exercises/capstone/ex06_cost_to_go/README.md) |
| 7 | Generate merge candidates — only in the start zone | [07](../../exercises/capstone/ex07_merge_candidates/README.md) |
| 8 | The merge ladder: capture, SC, S-curve, intercept, Dubins | [08](../../exercises/capstone/ex08_merge_ladder/README.md) |
| 8 | ...and hybrid A\* as the last rung | [09](../../exercises/capstone/ex09_hybrid_astar/README.md) |
| 9 | Validate the swept footprint against the zone layer | [10](../../exercises/capstone/ex10_swept_footprint/README.md) |
| 10 | Assemble the route: events, stop points, speed profile | [11](../../exercises/capstone/ex11_route_assembly/README.md) |
| 11–12 | The runtime geofence monitor, and replanning | [12](../../exercises/capstone/ex12_monitor_and_replan/README.md) |

## The guides

| | Guide | Steps |
|---|---|---|
| 0 | [The invariant](00-the-invariant.md) — why the design looks like this | — |
| 1 | [The zone layer and the gated graph](01-zone-layer.md) | 1–2 |
| 2 | [Localization and the clearance](02-localization-and-clearance.md) | 3–4 |
| 3 | [Searching the gated graph](03-graph-search.md) | 5–6 |
| 4 | [Merging onto the line](04-merging.md) | 7–8 |
| 5 | [Validating the sweep](05-validation.md) | 9 |
| 6 | [The route, the monitor and the replan](06-route-and-monitor.md) | 10–12 |
| 7 | [Kilo Field](07-the-map.md) — the map, coordinate by coordinate | — |

## Where this sits in the book

The capstone is not in LaValle, but almost all of it is.

- **Chapter 2** is the skeleton. Exercise 06 is Dijkstra run backwards
  (Section 2.2.3) over a product state space; Exercise 09 is your A\* from
  Exercise 03 with poses instead of integers.
- **Chapters 3–4** are Exercise 01. Shrinking the allowed polygons by the
  aircraft's error budget is exactly the configuration-space construction of
  Section 4.3, done crudely enough to stay fast.
- **Chapter 6** is Exercise 10. Sweeping a polygon along a path and testing it
  against a map is combinatorial motion planning with the proofs left out.
- **Chapters 13 and 15** are Exercise 08. Dubins curves are Section 15.3.1, and
  the reason a taxiing aeroplane needs them is the nonholonomic constraint of
  Section 13.1.2.
- **Chapter 8** is the shape of Exercise 06's answer: a cost-to-go function over
  a state space, not a path through it, which is what lets Exercise 12 replan
  from wherever the aircraft actually is.

What is *not* in the book is Step 4 and everything that keys off it. LaValle's
planners are told what the obstacles are. This one is told what it is *permitted*
to do, by a sentence of English from a human being, and has to refuse when the
sentence does not reach the goal.

## Suggested pace

Five sittings.

**Sitting 1 — the map (guides 0, 1, 7; exercises 01–02).**
The payoff is `taxi_demo gates`: twenty-five chart edges become thirty-seven
edges and thirteen gates, and from then on there is exactly one way to change
zone. Nothing else in the capstone works until this does.

**Sitting 2 — where am I, and what may I do (guide 2; exercises 03–04).**
Short, fiddly, and the source of most of the capstone's refusals. Both exercises
are mostly about being specific in the failure message.

**Sitting 3 — the search (guide 3; exercises 05–06).**
Chapter 2 again, over a state space with three things in it. The directed-edge
state is what makes turn feasibility checkable; the route index is what turns
"via A, D, B, E" into a shortest-path problem rather than a post-filter.

**Sitting 4 — the geometry (guide 4; exercises 07–09).**
The longest sitting and the most fun. Exercise 08 is five closed forms; get the
straight-then-turn solve right and three of the others fall out of it.

**Sitting 5 — the aeroplane (guides 5–6; exercises 10–12).**
The first place the planner reasons about a shape rather than a curve, and the
last place it is allowed to be clever. Read Exercise 12's brief twice: the
monitor being *simple* is the feature.

## Working style

Same as Chapter 2, with one wrinkle.

1. Read the guide for the step in `docs/capstone/`.
2. Read `exercises/capstone/exNN_*/README.md` — the brief, the traps, the checks.
3. Write the code in the stub next to it.
4. `ctest -R capstone.exNN --output-on-failure` until green.
5. Only then read `solutions/capstone/exNN_*/` and compare.

**The wrinkle: this is a pipeline, so the exercises are not independent.** A test
for Exercise NN generally needs Exercises 1 through NN−1 to work, because it has
to build a gated graph and a permission set before it can say anything about a
merge candidate. Work them in order. The three exceptions are Exercises 08, 09
and 12, whose tests construct their own inputs and pass on their own.

```powershell
# the whole capstone, your implementations
ctest --test-dir build/vs -C Debug -R capstone --output-on-failure

# one exercise
ctest --test-dir build/vs -C Debug -R capstone.ex06 --output-on-failure

# stuck?  the reference is held to exactly the same tests
ctest --test-dir build/vs -C Debug -R capstone.ex06.reference --output-on-failure
```

## The demo

```powershell
./build/vs/Debug/taxi_demo.exe                  # all eight scenarios
./build/vs/Debug/taxi_demo.exe map              # Kilo Field, drawn
./build/vs/Debug/taxi_demo.exe gates            # what Exercise 02 produced
./build/vs/Debug/taxi_demo.exe hybrid           # the ladder against the search
./build/vs/Debug/taxi_demo.exe stand-departure -v
```

`taxi_demo_reference.exe` is the same program built against the solutions, so you
can watch the whole thing run before you have written a line.

The eight scenarios are chosen so that three of them fail, and fail differently:

```
stand-departure    success       capture the stand line, out via A D B, stop at HS 27 E
nose-in-stand      refusal       pushback or tow required
apron-off-line     success       free-space merge onto the apron lane
taxiway-capture    success       an S-curve back onto the centreline
landing-rollout    success       exit at C, cross 36 westbound, in to stand 2
landing-no-exit    refusal       no forward exit from runway ahead
inside-protected   refusal       nothing ahead without a crossing clearance
oversize           refusal       a 777 does not fit on a code D taxiway
```

A planner that returns a path for all eight is worse than one that returns a path
for five, and that is the single most important sentence in this capstone.
