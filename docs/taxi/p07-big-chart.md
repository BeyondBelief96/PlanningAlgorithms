# Problem 07 — A chart the size of a real one

## The situation

Kilo Field has twenty-seven points. Schiphol has several thousand, and a
planner that examines all of them to find a two-minute taxi will not be run
twice.

`busyHub()` is the stand-in: 150 points, 261 legs, a lattice of taxiways with
fifteen stands down one side. On a chart like that there are hundreds of routes
within a second of each other, and Problem 04's search has nothing to tell them
apart, so it examines nearly everything.

The fix is one number: a **guess at how much is left**. If the guess is any
good the search goes almost straight to the answer; if the guess is honest, the
answer is still optimal.

## Write

```ts
quickestRouteGuided(chart, ac, from, to): TaxiRoute
```

Problem 04's answer — same route, same seconds, same turn penalties — arrived at
after looking at less of the aerodrome.

## Examples

**1 — the same answer as Problem 04.**

```ts
quickestRouteGuided(hub, a320(), hubAt('STAND 1'), hubAt('STAND 15'))

  seconds  -> 410   (and quickestRouteWithTurns agrees, to six places)
```

**2 — for less work.**

```ts
guided.expanded  <  blind.expanded / 2
```

Less than half the aerodrome examined, for exactly the same route. That
comparison is the whole problem.

## The estimate

You already have one. `chart.straightLineM(a, b)` is the distance as the crow
flies, and the fastest pavement on the aerodrome is a runway at 15 m/s, so

```
  atLeast(v) = straightLineM(v, goal) / 15
```

seconds still to go, and there is no way to do it in less.

## Why it must never guess high

An estimate that is sometimes too large makes the search stop early at a point
it has not finished with, and the route it returns is not the best one. Worse,
it is *usually* right — the failure shows up on one chart, for one pair of
stands, months later.

Dividing by the runway speed rather than the taxiway speed is what keeps it
honest. It makes the estimate weaker on a chart with no runway route, and
weaker is fine. Wrong is not.

## Constraints

- The seconds must match Problem 04 exactly, on both charts.
- `expanded` must be strictly less on the hub.
- Staying put is free and instant.

## Traps

**The estimate goes in the queue key, not in the cost.** The route's `seconds`
is still the real cost of the legs plus the turn penalties. If the estimate
leaks into the answer, every route on the hub reads about 90 seconds short.

**A settled point is settled.** With an estimate that never guesses high, the
first time a point comes out of the heap its cost is final — the same argument
as Problem 02, and it needs the estimate's honesty to work.

**Turn penalties are still per-state.** This is Problem 04's state space, not
Problem 03's. Losing that gives a route that is cheaper on paper than anything
an aeroplane can fly.

## Edge cases the tests also check

- Corner to far corner on the hub, where the guess helps least and must still
  be exact.
- Kilo Field, where the guess barely matters and the answer must not move.
- The same refusals Problem 04 gives.

## Follow-up

Weight the estimate: use `1.3 * atLeast(v)`. The search gets faster and the
route stops being optimal, by a bounded amount. Measure both. Most production
route planners do this on purpose, and knowing what it buys and what it costs is
more useful than knowing that it is "wrong".
