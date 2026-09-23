# Problem 04 — Turns cost time

## The situation

An aeroplane does not corner like a car. A ninety-degree turn at a junction
means slowing to walking pace, coming round, and accelerating again — call it
twenty seconds for an A320 and twelve for a Dash 8.

Adding that to the cost model looks like a one-line change. It is not, and
working out why is the whole problem.

## Write

```ts
quickestRouteWithTurns(chart, ac, from, to): TaxiRoute
```

As Problem 03, plus `ac.turnPenaltyS` seconds for every turn sharper than 30°.
`chart.turnAngle(incoming, outgoing, at)` gives you the angle in radians.

## Examples

**1 — the runway shortcut disappears.**

```ts
taxiwaysUsed(kilo, quickestRouteWithTurns(kilo, a320(), at('STAND 2'), at('HS 27 E')))
  -> ['STAND 2', 'APRON', 'A', 'D', 'B', 'E']

  seconds -> 377
```

Problem 02's route saved two seconds by dropping onto runway 09/27 at Charlie
and climbing off it again at Echo. That is two right-angle turns, forty seconds,
and it is no longer worth it. The cost model has quietly started producing
sensible routes — for the wrong reason, but a real one.

**2 — the same route costs two aeroplanes different amounts.**

```ts
quickestRouteWithTurns(kilo, a320(), ...).seconds  -> 377
quickestRouteWithTurns(kilo, dash8(), ...).seconds -> 345

  and both take the same taxiways.
```

## The part that is actually the problem

Whether leaving D1 to the north-east is a turn **depends on which leg you
arrived along**. Come up Delta from the south and it is a right angle. Come along
Bravo from the west and it is straight on.

So "the cheapest way to be at D1" is not a single number any more. There are as
many numbers as there are ways to arrive, and a search that keeps one number per
point cannot represent the problem.

**The state has to be `(point, leg you arrived along)`.**

That is the same move the capstone makes when it searches over directed edges
instead of vertices, and for the same reason: heading has to be inside the state
for anything about turning to be checkable.

## Constraints

- An aeroplane cannot turn round on the spot. Do not allow leaving along the leg
  you arrived on.
- The first leg cannot incur a penalty; there is no arrival to turn from.
- Build the route with `routeFromLegs`, then **overwrite `seconds`** with the
  cost your search found. The legs alone do not include the turns, and
  `validateRoute` allows `seconds` to exceed them for exactly this reason.

## Traps

**Search over points alone and the answer is plausible and wrong.** You settle
D1 at its cheapest arrival, then charge a penalty belonging to a different
arrival. The route comes back twenty seconds out here and there. It will never
look obviously broken and it will never be right.

**A `Map` keyed by a string is fine.** `${at}:${via}` costs nothing at this
scale and is far easier to debug than bit-packing. Optimise it when a profiler
tells you to.

**The heap key and the stored cost are the same thing here** — but they will not
be in Problem 07. Keep them separate in your head now and that problem is a
two-line change.

## Edge cases the tests also check

- An aeroplane with `turnPenaltyS: 0`, which must reproduce Problem 03 exactly.
- A single-leg route, where no penalty can apply.
- That no route ever contains the same leg twice in succession.

## Follow-up

Thirty degrees is a threshold, so a 29° turn is free and a 31° turn costs twenty
seconds. Replace it with something continuous — penalty proportional to the
angle, say — and see whether any route on Kilo Field changes. Then ask which
version you would rather defend to a pilot.
