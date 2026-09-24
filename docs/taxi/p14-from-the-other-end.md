# Problem 14 — From the other end

## The situation

Every search so far started where the aeroplane is.

Start where it is *going* instead. The route comes out the same length, but what
you leave behind is different and much more useful: a cost to finish from every
point you touched, which is Problem 08's table arrived at from another
direction.

And then run both at once. Two small circles cover far less ground than one
large one, which is the entire argument for bidirectional search.

## Write

```ts
backwardRoute(chart, ac, from, to): TaxiRoute
bidirectionalRoute(chart, from, to): TaxiRoute
```

`backwardRoute` is Problem 03's Dijkstra started at the destination.
`bidirectionalRoute` is Problem 01's breadth-first search from both ends, so it
takes no `Aircraft`.

## Examples

**1 — the same answer as the forward search.**

```ts
backwardRoute(kilo, a320(), at('STAND 2'), at('HS 27 E')).seconds
  ===  quickestRouteFor(kilo, a320(), at('STAND 2'), at('HS 27 E')).seconds
```

The *route* may differ — see Problem 09 on Foxtrot and Delta costing the same.
The *time* may not.

**2 — it meets in the middle, and still gets fewest legs.**

```ts
bidirectionalRoute(kilo, at('STAND 2'), at('HS 27 E')).links.length
  ===  fewestLegs(kilo, at('STAND 2'), at('HS 27 E')).links.length
```

**3 — for less work.**

```ts
both.expanded  <=  fewestLegs(...).expanded
```

## Backwards is a different question

At each step, a forward search asks *"where can I go from here"*. A backward
search asks *"how could I have arrived here"*.

On Foxtrot — one-way, A1 → F1 — those are different questions. The test is

```ts
chart.travellable(e, w)   // can leg e be driven starting from w
```

where `w` is the far end. Using `travellable(e, at)` is the forward question,
and it quietly lets the search run Foxtrot southbound. The route it produces
validates perfectly, because `validateRoute` checks the route it is handed, not
the search that produced it.

Problem 08 made this point about a table. Here it is about a route, and it is
worth making twice.

## Whole wavefronts, not single points

Expand one complete level per round, always the smaller of the two frontiers.

The book's Figure 2.7 takes a single point from each queue per iteration. That
is simpler, and it can return a route one leg longer than necessary, because the
two trees may touch in the middle of a level. Expanding whole levels costs
nothing extra and keeps the fewest-legs guarantee.

## Traps

**Joining the two halves.** The forward tree records the leg you arrived *by*
and has to be walked back and reversed. The backward tree records the leg to
take *next* and is already in flying order. Getting one of them the wrong way
round produces a route that fails `validateRoute` immediately, which is the
kindest possible failure.

**The aeroplane test applies backwards too.** A 777 does not fit down taxiway D,
whichever end you start from.

## Edge cases the tests also check

- Being already there, both ways.
- A destination behind the closed apron stub — `backwardRoute` refuses it
  because it takes an `Aircraft`; `bidirectionalRoute` routes straight down it
  because it does not. Which of the two you want depends on the question, and
  the signature is what tells you which you have.
- A point that is not on the chart.

## Follow-up

Bidirectional **Dijkstra** is harder than it looks: the two searches meeting is
no longer proof that the route through the meeting point is shortest, and the
standard fix is to keep going until the sum of the two frontier keys exceeds the
best route found so far. Write it, then find the pair of points on `busyHub()`
where the naive stopping rule is wrong.

*In the book:* LaValle Section 2.2.3, Figures 2.6 and 2.7.
