# Exercise 09 — Hybrid A\* clipped to the start zone

**Step 8, last rung** · **Guide:** [docs/capstone/04-merging.md](../../../docs/capstone/04-merging.md)

## Implement

```cpp
MergePath planHybridAStar(const ZoneLayer& cspace, const Pose& start,
                          const MergeCandidate&, const std::vector<ZoneClass>& allowedZones,
                          const HybridAStarParams&);
```

This is [Chapter 2's Exercise 03](../../ch02/ex03_astar/README.md) again — the same
priority queue, the same stale-entry discard, the same admissible heuristic — run
over poses instead of integers. Two things make it a *motion* planner:

- the successors are motion primitives the aircraft can actually fly, so every
  edge of the search tree is a feasible piece of path;
- the search space is clipped to the polygons of the start zone, which is what
  makes it **physically unable** to wander into another zone. Not penalised for
  it. Unable.

**This exercise needs nothing else in the capstone.** The tests build a 400 × 200
yard with a wall across most of it.

## The shape of it

```
primitives   straight, left arc, right arc -- each params.primitiveLength long
             at params.radius
cost         arclength, times params.turnPenalty for the arcs
heuristic    Euclidean distance to the goal
closed set   a lattice: params.positionResolution metres, params.headingBins bins
validity     every sample of a primitive is in allowedZones, on the C-space layer
```

Poses are continuous, so the "dead" set of Chapter 2 becomes a lattice: keep the
best cost seen per `(cell x, cell y, heading bin)`. Euclidean distance never
overestimates the arclength that remains, so A\* stays optimal *on that lattice*.

## The analytic expansion

Plain hybrid A\* reaches a *region* around the goal, within some tolerance. That
is not good enough here — the merge point is where the free-space path is glued to
the graph route, and a metre of gap there is a metre the controller has to
invent.

So at every popped node, try a Dubins curve straight to the target. If it is
collision-free, you are done and the path lands exactly on the merge pose.

This is the standard trick, and the reason it works is worth stating: the
heuristic guides A\* toward the goal, and the analytic expansion is a cheap test
for "is the remaining problem now easy?" applied to every node the heuristic
brings you to. In an open yard it fires at the root and the whole search is one
expansion.

## The traps

**Check the whole primitive, not its endpoint.** An eight-metre arc can pass
clean through a four-metre wall if you only test where it lands.

**Check the start too.** A start pose outside `allowedZones` should be refused
immediately, not searched from.

**Bound the expansions, and say so when you hit the bound.** `merge.detail` is
what the pipeline prints when everything fails, and "hybrid A\* exhausted 30000
expansions" is a different problem from "no candidate survived the sweep check".

**Reconstruct forward, not backward.** Walk the parents back to collect the chain,
reverse it, then *render* the primitives forward from the start pose. Rendering
backward accumulates a different set of rounding errors and the path drifts off
the nodes you searched.

**`turnPenalty ≥ 1` keeps the heuristic admissible.** Making arcs cheaper than
straights would not.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R capstone.ex09 --output-on-failure
```

## What the tests check

- An open yard is solved by the analytic expansion alone: exactly 300 m.
- With a wall between start and goal, the path is longer than 300 m and every
  metre of it is still inside the apron.
- The result lands on the merge pose to a millimetre and a milliradian.
- **A wall with no way round produces no path** — and says how much work it did.
- A start outside the allowed zones is refused at once.
- No primitive exceeds the turn radius.
- An expansion budget of one is honoured.

## Once it is green

```powershell
./build/vs/Debug/taxi_demo.exe hybrid
```

On an open apron the search often ties or beats the closed forms, because the
analytic expansion solves it at the root. The ladder is still first, for two
reasons: the closed forms cost microseconds rather than milliseconds, and a pilot
watching from the flight deck can tell what the aeroplane is about to do.

## Extension

Two, in increasing order of interest.

**Reeds–Shepp primitives.** Add reverse motion and the planner can use a
pushback-like manoeuvre on a stand. Then work out why you probably do not want
that: an aeroplane cannot see behind itself, and a planner that reverses is a
planner that needs a wing-walker.

**Voronoi or obstacle-distance heuristic.** Euclidean distance is very weak in a
cluttered apron — it happily guides the search into a dead end. Precompute a
distance-to-goal field over the free space (a grid Dijkstra on the C-space layer
is enough) and use that instead. Measure the expansions on the walled yard.
