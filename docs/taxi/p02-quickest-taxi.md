# Problem 02 — The quickest taxi

## The situation

Nobody counts legs. The crew wants to be at the holding point, the controller
wants the apron clear, and the airline is paying for fuel burned at idle. The
question is minutes.

This is the first problem whose answer you would give a crew — and the first
whose answer will horrify you.

## Write

```ts
quickestRoute(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute
```

Minimise `seconds`, where a leg costs `legSeconds(chart, e)` — its length
divided by the speed of its surface. Surfaces run at 2 m/s on a stand, 5 on the
apron, 10 on a taxiway and **15 on a runway**.

`ac` is unused. Problem 03 is where the aeroplane starts to matter.

## Examples

**1 — quicker than Problem 01, and longer.**

```ts
const quick = quickestRoute(kilo, a320(), at('STAND 2'), at('HS 27 E'));
const few   = fewestLegs(kilo, at('STAND 2'), at('HS 27 E'));

  quick.seconds      -> 295.33      few.seconds      -> 297
  quick.links.length -> 15          few.links.length -> 13
```

**2 — and here is what it actually does.**

```ts
taxiwaysUsed(kilo, quick)
  -> ['STAND 2', 'APRON', 'A', 'F', 'B', 'C', 'RWY 09/27', 'E']
```

Read that again. It taxis five hundred metres **down runway 09/27**, because a
runway is the fastest pavement on the aerodrome and nothing in this function
knows there is any other kind of difference between one piece of tarmac and
another.

It is the correct answer to the question you asked. It is also the single worst
thing a surface planner can produce, and it would end a career.

Leave it. Do not patch it here. Problems 05 and 06 fix it properly, by asking a
better question rather than by special-casing this one. Getting to see the
failure first is the point.

**3 — the return trip, which is a different route.**

```ts
taxiwaysUsed(kilo, quickestRoute(kilo, a320(), at('HS 27 E'), at('STAND 2')))
  -> does NOT contain 'F'
```

Foxtrot is one-way northbound, so it is available outbound and not inbound.

## Constraints

- Everything Problem 01 had to satisfy still applies.
- No leg costs less than nothing, so cheapest-first is safe.
- The answer must be optimal: there must be no cheaper route.

## Traps

**The cost of a point is final only when it comes OUT of the queue.** Not when
you generate it. Return as soon as you first *reach* the destination and you
hand back a route that merely gets there.

**So mark a point settled on the way out, not on the way in.** This is the
opposite of Problem 01, and getting it wrong gives you a planner that returns
slow routes on some aerodromes and correct ones on others — the worst kind of
bug, because it passes the test you happened to write.

**`MinHeap` cannot lower a key.** When a point turns out to be reachable more
cheaply, push a second entry at the lower cost and ignore the stale one when it
surfaces. Before you rely on that, convince yourself it is safe: the first time
a point comes out its cost is final, so every later copy is worse. That argument
is the whole correctness proof, and it is four sentences long.

**Do not compare floats with `<`.** Two routes can cost the same to fifteen
decimal places and differ in the sixteenth. Use a small tolerance.

## Edge cases the tests also check

- A destination equal to the start.
- Arguments that are not on the chart.
- That `seconds` is never quoted lower than the legs actually take.

## Follow-up

Count `expanded` for this and for Problem 01 on the same taxi. They are close,
because with every leg costing roughly the same there is not much for a cost
function to do. Now imagine an aerodrome where the apron is congested and legs
crossing it cost triple: which method notices, and which does not?
