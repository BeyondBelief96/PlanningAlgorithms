# Problem 08 — Minutes to go

## The situation

Every problem so far answered *"what should this aeroplane do?"*. The answer was
a route, and it was correct at the moment it was computed.

Then the aeroplane stopped short. Or was held at Delta. Or took the wrong exit.
It is now somewhere the plan never mentioned, and the plan is a list of legs
starting from a point it is no longer at.

So compute something better: a number for **every point on the aerodrome**, and
the leg to take from each. Then an aeroplane that is not where anybody expected
does not need a new plan. It needs to read the number under its wheels.

This is the single most useful object in Part 1, and it is what the capstone
replans against.

## Write

```ts
secondsToGo(chart, ac, goal): CostToGo
```

```ts
interface CostToGo {
  goal: NodeId;
  seconds: number[];  // UNREACHABLE where there is no route
  next: LinkId[];     // NO_LINK at the goal and where there is no route
}
```

## Examples

**1 — a number for every point.**

```ts
const table = secondsToGo(kilo, a320(), at('HS 27 E'));

  table.seconds.length      -> kilo.numNodes
  table.seconds[at('HS 27 E')] -> 0
  table.seconds[at('STAND 2')] -> 295.33
  table.seconds[at('A2')]      -> 110.83
  table.seconds[at('D1')]      ->  90.83
```

**2 — unreachable is an answer, not a gap.**

```ts
table.seconds[at('P0')]  ->  UNREACHABLE
table.next[at('P0')]     ->  NO_LINK
```

P0 is behind the apron stub that is closed for resurfacing. Saying so is the
answer.

**3 — nothing to do once you are there.**

```ts
table.next[at('HS 27 E')]  ->  NO_LINK
```

## Backwards is not forwards reversed

This is the point of the problem, and Foxtrot is what makes it.

Foxtrot runs A1 → F1 only. Forwards, the question at each point is *"where can I
go from here"*. Backwards, it is *"how could I have arrived here"* — and those
are different questions on a one-way taxiway.

Get it wrong and the table says Foxtrot is a way of *leaving* Bravo. Every
arrival it routes then taxis Foxtrot southbound, and **every route it produces
validates**, because the route is checked against the chart and not against the
search that produced it.

So: relax the *predecessors*. For a leg `e` joining `v` to `w`, ask
`chart.travellable(e, w)` — can this leg be driven starting from `w` — not
`travellable(e, v)`.

## Constraints

- Both arrays have one entry per point on the chart, always. A goal that is not
  on the chart gives a full-length table of `UNREACHABLE`.
- The aeroplane matters: apply Problem 03's test. A 777 reaches nothing from a
  code C stand.
- Every step of `next` must strictly reduce `seconds`. That is what guarantees
  following it terminates.

## Traps

**One search, not `numNodes` searches.** The temptation is to call Problem 03
from every point. That is correct and quadratic. One backward Dijkstra from the
goal gives the whole table for the price of one.

**`next` points forwards.** It is the leg to take *at* that point, not the leg
the search arrived along. Recording the latter gives a table you have to reverse
to use, and Problem 09 will be much harder than it should be.

## Edge cases the tests also check

- Agreement with Problem 03's cost, from five different points.
- A goal that is not on the chart.
- A 777, for which most of the aerodrome is unreachable.

## Follow-up

The table is a **policy**: an instruction for every state, rather than a plan
from one. Problem 17 builds the same thing by sweeping rather than searching,
and shows why anybody would do it the slow way. The capstone's Exercise 06 is
this computation over a state space of directed edges and clearance indices.
