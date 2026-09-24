# Exercise 06 — Cost-to-go by reverse Dijkstra

**Step 6** · **Guide:** [03-graph-search.md](03-graph-search.md)

## Implement

```ts
zoneCostRate(zone: ZoneClass): number
edgeCost(graph, d: DirectedEdge, aircraft): number
partialEdgeCost(graph, d: DirectedEdge, s: number, aircraft): number
advanceRouteIndex(edge: Edge, k: number, labels: readonly string[]): number
costToGoAt(costToGo: CostToGo, d: DirectedEdge, k: number): number
costToGoReachable(costToGo, d, k): boolean
computeCostToGo(gated, permissions, filter, aircraft): CostToGo
extractGraphRoute(costToGo, start: DirectedEdge, k: number): DirectedEdge[]
```

[Part 1's Problem 14](../taxi/p14-from-the-other-end.md), run backwards over a
much bigger state space. Same priority queue, same stale-entry discard, same
induction. Two things are different.

**The state is a directed edge,** so heading is part of the state and a turn can
be checked against the minimum radius. A vertex-based search cannot express that.

**The state carries how much of the cleared route has been consumed,** which turns
"must use A then D then B then E" into an ordinary shortest-path problem on a
product graph rather than a filter applied afterwards. That is Part 1's Problem
05 again, and the difference matters for the same reason: as a filter, the
cheapest unconstrained route usually violates the clearance, so you reject
everything and have no answer.

## The semantics, precisely

A state `(d, k)` means *standing at the head of directed edge `d`, with `k`
labels of the cleared route consumed*. `V(d, k)` is the remaining cost to the
goal.

- **Terminal:** every allowed edge whose head is `permissions.goal`, at `k = n`,
  costs 0.
- **Relax:** for state `(d, k)`, look at every allowed edge `p` *arriving* at
  `tail(d)`. The turn `p → d` must be feasible, and
  `advanceRouteIndex(gated.edge(d.edge), kp, labels)` must equal `k`. Then
  `V(p, kp) ← V(d, k) + edgeCost(d)`.

Record `costToGo.next` as you relax, so `extractGraphRoute()` can walk the answer
out. `packState()` and `unpackState()` are given.

## The route state machine

```
labels empty                         -> k        no route constraint at all
k < n and label === labels[k]        -> k + 1    consume the next cleared taxiway
k > 0 and label === labels[k - 1]    -> k        stay on the one you are on
zone is runway or runwayProtected    -> k        transparent
(k === 0 or k === n) and zone is ramp -> k       apron, stand, de-icing
otherwise                            -> -1       not allowed here
```

Two of those rows are easy to miss. **Runways are transparent** because crossing
one happens on edges labelled B that lie in the runway, and the clearance names
the crossing separately. **The ramp is free at both ends** because before the
route starts and after it ends you are on a stand or an apron taxilane, which the
clearance never spells out.

## The traps

**Costs are seconds.** `zoneCostRate()` is `1 / speedLimit`, which is what makes
the search prefer a long fast taxiway to a short slow apron. Forbidden zones cost
infinity per metre, which is also correct.

**Fixed penalties do not prorate.** `HOTSPOT_PENALTY` and `SOFT_GATE_PENALTY` are
earned whether you join the edge at the tail or halfway along it, so
`partialEdgeCost()` scales the *length* and leaves the penalties alone. Write
`edgeCost()` as `partialEdgeCost(..., 0, ...)` and there is only one of them to
get wrong.

**The soft-gate penalty belongs to the *head*.** You pay it when you arrive at the
gate, not when you leave one.

**Bound the loop in `extractGraphRoute()`.** The `next` chain is acyclic because
every step strictly decreases the cost-to-go — but a mistake in
`computeCostToGo()` otherwise hangs the whole test run rather than failing it.

**Do not expect `costToGoReachable()` to mean "forward reachable".**
`computeCostToGo()` will happily put a finite number on a state the aircraft
could never be in. The cost *from* a state is well defined whether or not you can
get there, and forward reachability is enforced in Exercise 07, where the
candidate picks its starting route index.

## Run it

```bash
npm test -- ex06
```

## What the tests check

- `zoneCostRate` for five zone classes, including infinity for forbidden.
- Taxiway A from the apron gate to the de-icing junction is 180 m, costs 18 s,
  and costs 9 s entered halfway.
- The apron edge that ends at the apron/taxiway gate costs its length **plus**
  the soft-gate penalty, and still costs the penalty when joined 90 m in.
- Six cases of `advanceRouteIndex`, including the two easy-to-miss rows.
- The cost-to-go is zero at the goal and decreases along the route.
- The extracted route visits A, D, B, E in that order and ends at the goal.
- **The hotspot penalty decides between two equal routes.** Kilo Field's two
  connectors give routes of exactly the same length; move the hotspot from one
  junction to the other and the answer flips. If that test passes, the penalty is
  really being applied.

## Once it is green

```bash
npm run taxi stand-departure
```

The `via` line is `extractGraphRoute()` talking.

## Extension

This is Dijkstra; the goal is a single vertex and the estimate is free. Make it
A\* over the product space and work out what an admissible estimate looks like
when the state carries a route index — straight-line distance to the goal is
admissible but ignores the constraint, so it is very weak late in the route.
Measure the expansions. Then ask whether it was worth it on a graph with 370
states, and what size of airport would change the answer.
