# Problem 13 — Deep first, and what it costs

## The situation

Problem 01 searched breadth first: everything one leg away, then everything two
legs away, and so on. It always finds the route with the fewest legs. It pays
for that by holding the whole frontier in memory.

On Kilo Field the frontier is twenty-seven points and nobody cares. On the
capstone's pose lattice — position to four metres, heading to fifteen degrees,
over an apron — the frontier is millions of states and it does not fit.

Depth first holds only the branch it is standing on. It gives up the guarantee
to get that, and this problem is about measuring what is given up and then
getting it back.

## Write

```ts
depthFirstRoute(chart, from, to): TaxiRoute
routeWithinLegs(chart, from, to, maxLegs): TaxiRoute
iterativeDeepeningRoute(chart, from, to): TaxiRoute
```

None of these takes an `Aircraft`. Like Problem 01, they are about the chart.

## Examples

**1 — a route, and no promise that it is a good one.**

```ts
depthFirstRoute(kilo, at('STAND 2'), at('HS 27 E'))

  ok                -> true
  links.length      -> at least as many as fewestLegs
```

It is the first route the search stumbled into. That is the deal.

**2 — a budget it cannot make.**

```ts
routeWithinLegs(kilo, at('STAND 2'), at('HS 27 E'), 3)

  -> refused: 'no route from STAND 2 to HS 27 E in 3 leg(s)'
```

Stand 2 to the holding point is five legs at best. The honest answer is no, not
a route that skips a taxiway.

**3 — breadth first's answer out of depth first's memory.**

```ts
iterativeDeepeningRoute(kilo, at('STAND 2'), at('HS 27 E'))

  links.length  ===  fewestLegs(...).links.length
```

## One line of difference

Problem 01 and `depthFirstRoute` are the same program. Breadth first takes the
next point off the **front** of the container; depth first takes it off the
**back**. Write both, diff them, and look at how little there is.

That is the habit worth keeping: when you meet a new search, find the line that
decides what comes out next. Dijkstra, A\* and best-first are the same program
again with a priority queue and three different keys.

## The trap that matters

`routeWithinLegs` must **not** keep a global visited set.

A point that was too deep down one branch may be shallow enough down another,
and a global visited set wrongly rules it out. The search then misses routes
that exist, and reports a refusal that is simply false. Mark points on the
*current branch* instead, and unmark them on the way back out.

This is the single commonest bug in depth-limited search and it is invisible on
small charts, because on a small chart the first branch usually works.

## Why iterative deepening is not as wasteful as it looks

It re-expands the shallow points on every pass. On a chart with branching factor
b, the last pass alone does about (b − 1)/b of the total work, so everything
before it adds a constant factor rather than a quadratic one. The test checks
that iterative deepening expands *more* than the single successful pass — the
claim is that the factor is bounded, not that it is one.

## Constraints

- A budget below zero is a refusal, not a budget of zero.
- Being already there is a route of no legs.
- A refusal still carries `expanded` and `generated`. Iterative deepening adds
  them up across the passes that failed, and a refusal that forgets how hard it
  tried makes the whole comparison meaningless.

## Edge cases the tests also check

- Foxtrot is never run backwards, by either method.
- P0, behind the closed apron stub, is still reachable here — these take no
  `Aircraft`, so a closed leg is not their business. Knowing which legs *this*
  aeroplane may use today is Problem 03's job, and mixing the two gives you a
  search you cannot reuse.

## Follow-up

Iterative deepening **A\***: the same trick with a cost bound instead of a depth
bound. Start the bound at the estimate from Problem 07; each pass, raise it to
the smallest f-value that exceeded it. Raising by less re-explores the same tree
for nothing. It is about forty lines, and it plans with A\*'s route quality and
depth first's memory — which on a pose lattice is the whole game.

*In the book:* LaValle Section 2.2.2.
