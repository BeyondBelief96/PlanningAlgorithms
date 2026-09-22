# 3. Searching the gated graph — Steps 5 and 6

> Exercises: [05 the graph filter](../../exercises/capstone/ex05_graph_filter/README.md),
> [06 cost-to-go](../../exercises/capstone/ex06_cost_to_go/README.md)

This is Chapter 2 again, and it is worth noticing how little has changed. Same
priority queue, same stale-entry discard, same induction. Three things are
different, and each one is there for a reason you can point at.

## The state is a directed edge, not a vertex

In Chapter 2 the state was an integer and a transition was an action. Here the
state is `(edge, direction)`.

The reason is the turn at the junction. An aeroplane arriving at a corner from
the south and leaving to the east has to fly a fillet, and that fillet needs
`r · tan(θ/2)` of straight line on each side of the corner. Whether the turn is
possible therefore depends on *how you arrived*, which means heading has to be
part of the state. A vertex-based search cannot express it.

It also gets you the no-U-turn rule for free. `turnIsFeasible()` refuses when the
turn exceeds `kMaxNodeTurn`, and refuses outright when the outgoing edge is the
incoming one reversed. That single line is what makes the `landing-no-exit`
scenario refuse instead of politely suggesting a three-point turn on an active
runway.

The cost of doubling the state space is nothing: `DirectedEdge::index()` is dense,
so cost-to-go lives in a flat vector.

## The gate check is directional

Step 5 strikes out edges this aircraft or this mission may not use: one-way the
wrong way, closed by NOTAM, wingspan, mission-only, not drivable. Then the gate
rule, which is the one with a subtlety in it.

Entering an edge whose zone is **more restrictive than the gate's inner side** is
a crossing, and a crossing needs a clearance. Entering the other way is leaving,
and leaving needs nothing:

```cpp
const Vertex& gate = gated.vertex(gated.tail(d));
if (gate.gate == GateKind::Hard && !permissions.allowsGate(gate.id) &&
    zonePriority(e.zone) > zonePriority(gate.innerZone))
  block("unauthorized crossing at " + gate.name);
```

Without the `zonePriority` comparison, an aeroplane that has just landed cannot
leave the runway, because every gate between it and the taxiway is unauthorized.
That is the `landing-rollout` scenario, and it is a good test precisely because
the naive version of the rule fails it loudly.

Note also that every blocked edge carries a *reason*. When the 777 scenario
refuses, the message says "wingspan 64 m exceeds 52 m", and that is the
difference between a planner you can debug and one you cannot.

## The route constraint lives in the state

"Via A, D, B, E" could be a filter: plan freely, then reject any route that does
not use those taxiways in order. That is easy and it is wrong — the cheapest
unconstrained route usually violates the clearance, so the filter rejects
everything and you have no answer.

Instead, carry how much of the route has been consumed in the state. The search
runs over `(directed edge, route index)`, and `advanceRouteIndex()` is the state
machine:

```
k == 0 and label == labels[0]        -> 1        join the cleared route
label == labels[k]                   -> k + 1    move to the next taxiway
label == labels[k - 1]               -> k        stay on this one
zone is runway or protected          -> k        transparent: a crossing is named separately
k == 0 or k == n, and zone is ramp   -> k        apron and stands, which the clearance never spells out
otherwise                            -> -1       not allowed here
```

Two of those rows are easy to miss.

**Runways are transparent.** Crossing runway 36 happens on edges labelled B that
lie in the runway. If the index moved there, the route would have to name the
crossing as a taxiway, which is not how clearances work.

**The ramp is free at both ends.** Before the route starts you are on a stand or
an apron taxilane; after it ends you may be again, if the destination is a stand.
In between, only the cleared taxiways.

The product space is `2 · |E| · (n + 1)` states, which on Kilo Field is 370. It
would be 370 on an airport a hundred times bigger too, because `n` is the length
of a spoken sentence.

## Reverse Dijkstra, and what it is really for

Run it backwards from the goal, over the filtered graph, and you get
`cost_to_go(edge, direction, route index)` for every state — not just a route.

Chapter 2 makes the point that backward value iteration produces a *feedback
plan*: a function over the state space rather than a path through it. That is
exactly what Step 7 needs. Every merge candidate in Exercise 07 asks "if I join
the graph *here*, what does the rest cost?", and the answer is a table lookup.
Computing a fresh forward search per candidate would be a hundred searches per
plan.

It is also what makes Step 12 cheap. Replanning from wherever the aircraft
actually is means looking up a different entry in the same table.

### Costs are seconds

`zoneCostRate()` is `1 / speedLimit`, so an edge costs the time it takes to drive
it. That is what makes the search prefer a long fast taxiway to a short slow
apron, which is what a pilot does.

On top: `kHotspotPenalty` once per hotspot edge, `kSoftGatePenalty` once per soft
gate. Both are fixed, not per metre, and both are earned whether you join the edge
at the tail or halfway along it — which is why `partialEdgeCost()` prorates the
length and not the penalties.

The hotspot penalty is worth playing with. Kilo Field has two connectors between
taxiway A and taxiway B, at x = 1000 and x = 1400, and on a rectilinear grid the
two routes are *exactly* the same length. The hotspot is the only thing that
separates them. Move it from one junction to the other and the answer flips —
`test_ex06_cost_to_go.cpp` does exactly that, and it is the cleanest possible
demonstration that the penalty is really being applied.

### One thing the cost-to-go table does not tell you

`computeCostToGo()` will happily put a finite number on a state the aircraft
could never be in — for example, being on taxiway F with two labels of "via A D
B E" consumed. The cost *from* a state is well defined whether or not you can get
there.

Forward reachability is enforced somewhere else, in Step 7, where the merge
candidate picks its starting route index with `advanceRouteIndex(edge, 0, labels)`
and is discarded if that comes back negative. Splitting it this way keeps the
backward search simple; the alternative is a forward reachability pass whose only
job is to prune states nothing was going to ask about.

---

Next: [merging onto the line](04-merging.md).
