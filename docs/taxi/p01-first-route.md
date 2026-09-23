# Problem 01 — The first route

## The situation

KLM1234 is parked on stand 2 and wants to go to the holding point short of
runway 27 at taxiway Echo. Before anybody argues about which route is *best*,
somebody has to answer the smaller question: is there a route, and what is it?

A controller reading a route out loud counts legs, not seconds. So that is what
this one minimises.

## Write

```ts
fewestLegs(chart: Chart, from: NodeId, to: NodeId): TaxiRoute
```

`TaxiRoute` is either a route or a reason. Fill in `nodes`, `links`,
`distanceM`, `seconds`, `expanded` and `generated`, and set `ok`. Or set
`refusal` and leave `ok` false. Never both.

## Examples

**1 — the departure.**

```ts
fewestLegs(kilo, at('STAND 2'), at('HS 27 E'))

  taxiwaysUsed -> ['STAND 2', 'APRON', 'A', 'D', 'B', 'E']
  links.length -> 13
  distanceM    -> 2340
```

**2 — the same taxi backwards, which happens to be the same length.**

```ts
fewestLegs(kilo, at('HS 27 E'), at('STAND 2'))

  taxiwaysUsed -> ['E', 'B', 'D', 'A', 'APRON', 'STAND 2']
  links.length -> 13
```

**3 — staying where you are.**

```ts
fewestLegs(kilo, at('GA'), at('GA'))

  ok      -> true
  links   -> []
  nodes   -> [at('GA')]
  seconds -> 0
```

That third one is not a trick. "You are already there" is a perfectly good
answer, and it is not a refusal.

## Constraints

- `nodes.length === links.length + 1` for a route of at least one leg.
- Leg `i` must join `nodes[i]` to `nodes[i + 1]`.
- **One-way legs are part of the aerodrome, not part of the aeroplane.** Taxiway
  F runs A1 → F1 only. Even this problem, which knows nothing about aircraft,
  has to honour it. `chart.travellable(leg, from)` is the test.
- `distanceM` and `seconds` must be the sums of the legs. `legSeconds(chart, e)`
  is given so everybody's numbers agree.
- A refusal must carry a reason, and the reason should name the two points.

`validateRoute(chart, route)` checks all of this and the tests run it on
everything you return. It is worth calling yourself while you are debugging.

## Traps

**Take the oldest thing out of the queue, not the newest.** That is the entire
difference between a route with fewest legs and a route that merely exists. A
stack instead of a queue gives you a legal route that wanders down the west
apron first, and nothing in the output says it is silly.

**`Array.prototype.shift()` is O(n).** It does not matter on 27 points and it
will matter on 150. Keep an index into the array instead.

**Mark a point visited when you PUT IT IN the queue, not when you take it out.**
Otherwise the same point enters several times. This is the right answer here and
the *wrong* answer in Problem 02 — leave yourself a note about why.

**`assembleRoute` exists.** Record, for each point, the leg you first reached it
along, and hand that array over. Walking parent pointers back is bookkeeping,
not algorithm, and every problem would otherwise repeat it.

## Edge cases the tests also check

- A start or destination that is not on the chart.
- Whether a route ever comes back down one-way Foxtrot.
- That `expanded` and `generated` are populated at all.

## What to notice when it goes green

```bash
npm run surface -- --reference
```

Your route takes **297 seconds**. Problem 02 finds one that takes 295 — and it
has *fifteen* legs rather than thirteen. Fewest legs and quickest are different
questions, and at this aerodrome they have different answers.

## Follow-up

Breadth-first search holds the whole frontier in memory. On a chart of 27 points
that is nothing; on a state space of poses, which is what the capstone searches,
it is the thing that kills you. Look up iterative deepening — search four legs
deep, then five, then six, throwing the work away each time — and work out what
it buys and what it costs. On this chart it costs about sixty times the work for
the same answer.
