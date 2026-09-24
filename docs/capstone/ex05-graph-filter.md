# Exercise 05 — Filtering the graph for this aircraft and mission

**Step 5** · **Guide:** [03-graph-search.md](03-graph-search.md)

## Implement

```ts
filterGraph(gated: TaxiGraph, aircraft, permissions: PermissionSet): EdgeFilter
turnIsFeasible(graph, into: DirectedEdge, outOf: DirectedEdge, aircraft): boolean
```

Strike out, once and before any search runs, every directed edge this aircraft or
this mission may not use. Then decide, for a pair of edges at a junction, whether
the aeroplane can actually get from one to the other.

## The traps

**The gate rule is directional, and this is the whole exercise.** Entering an edge
whose zone is *more restrictive than the gate's inner side* is a crossing, and a
crossing needs a clearance. Entering the other way is leaving, and leaving needs
nothing:

```ts
const gate = gated.vertex(gated.tail(d));
if (
  gate.gate === 'hard' &&
  !allowsGate(permissions, gate.id) &&
  zonePriority(e.zone) > zonePriority(gate.innerZone)
)
  block('...');
```

Drop the `zonePriority` comparison and an aeroplane that has just landed cannot
leave the runway, because every gate between it and the taxiway is unauthorized.
That is the `landing-rollout` scenario, and it fails loudly, which is the nicest
kind of bug.

**The filter is per *directed* edge.** One-way is the obvious reason, but the gate
rule is the important one: the same edge is legal in one direction and not in the
other. Index with `directedIndex(d)`.

**Give every blocked edge a reason.** "Wingspan 64 m exceeds 52 m" is the
difference between a planner you can debug and one you cannot, and the pipeline
prints the two commonest reasons when it refuses.

**A node turn eats straight line on *both* sides.** A corner of angle θ taken at
radius `r` needs `r · tan(θ/2)` before the junction and the same after it. Check
both edges, not just the one you are turning onto — the stub of taxiway E between
taxiway B and the holding position is twenty-five metres long, and that is what
decides whether a given aircraft can use it.

**A reversal is not a turn.** Refuse when the outgoing edge is the incoming one
reversed, and refuse when the turn exceeds `MAX_NODE_TURN`. That single line is
what makes `landing-no-exit` refuse instead of politely suggesting a three-point
turn on an active runway.

## Run it

```bash
npm test -- ex05
```

## What the tests check

- An ordinary taxiway edge survives both ways.
- Taxiway F is northbound only, and the blocked direction has a reason.
- The closed stub at the west end of the apron is blocked both ways.
- A 777 is blocked on taxiway A, and the reason says "wingspan".
- De-icing is blocked unless the mission asks for it.
- **The unauthorized holding position on E blocks the way in and not the way
  out.** Two tests, and they are the ones that matter.
- An authorized crossing is open both ways.
- A square corner is feasible; the same edges in the wrong order are not; a
  reversal is not.
- A 20 m turn radius fits a right angle into the 25 m stub of taxiway E. A 60 m
  radius does not.

## Once it is green

Nothing visible yet — Exercise 06 is what turns this into a route. But it is
worth printing `filter.reason` for a scenario and reading down the list. On the
`oversize` run, every taxiway edge on the airport is struck out for the same
reason, which is exactly the right shape of answer.

## Extension

The filter is static: it runs once per plan. Real surface movement has *dynamic*
constraints — another aircraft holding on the taxiway ahead, a tug crossing, a
gate the controller has just closed. Add a `blockages: Aabb[]` parameter and
strike out the edges they cover, then think about what `shouldReplan()` in
Exercise 12 has to do when one appears.
