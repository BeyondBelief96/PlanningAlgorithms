# Part 1 — Twelve taxi problems

Twelve problems set at one small aerodrome. Each one is a thing a surface
planner actually has to do, stated the way a problem is stated: input, output,
worked examples, constraints, edge cases.

You will end up writing breadth-first search, Dijkstra, A\*, a search over a
product state space, a backward sweep and a critical-path scheduler. None of the
problems is named after an algorithm, because that is not how the question
arrives. It arrives as *"KLM1234 is on stand 2 and has been cleared to the
holding point short of 27 via Alpha Delta Bravo — what do we tell them?"*

## The aerodrome

Kilo Field. Twenty-seven points, twenty-eight legs, and it is the same aerodrome
the capstone uses with the geometry filled in.

```
                                                    RWY 09/27
  RW09 ------------- RWM ---------- CR --------- ER --- RW27
                                    |             |
                                 HS 27 C       HS 27 E
                                    |             |
  F1 ---------- D1 -- HS36W - X36 - HS36E ---- C1 ---- E1      TWY B
   |             |            |
   | TWY F       | TWY D      | RWY 18/36 (north to R36)
   |  one-way    |  36 m max
  A1 ----------- A2                                            TWY A
   |
  G0 -- DEICE PAD
   |
  GA                                                           apron entry
   |
  P3 -- P2 -- P1 -- P0                                         APRON
   |     |     |          (P0 stub closed)
  S3    S2    S1                                               stands
```

Four things on this chart exist to make the problems problems:

- **Taxiway F is one-way northbound.** The quick way out is not the quick way
  in, so an arrival has to be routed differently from a departure — and a
  backward search has to know that F is a way of *reaching* Bravo and never a
  way of leaving it.
- **Taxiway D takes 36 m of wingspan.** An A320 is 35.8 m and clears it by
  twenty centimetres. Anything larger goes round by Foxtrot, or not at all.
- **Taxiway B runs straight across runway 18/36.** Every eastbound departure
  crosses a live runway, so crossing permission is not an edge case here. It is
  the main route.
- **Stand 3 is a code E stand and the apron beyond it is not.** A wide-body can
  park, and then cannot leave, and the refusal has to say which of those two
  things went wrong.

There is a second, much larger aerodrome — `busyHub()`, 150 points and 261 legs
— which exists for Problem 07, where the question is not "what is the route" but
"how much of the aerodrome did you have to look at to find it".

## The problems

| | Problem | What you write | What it teaches |
|---|---|---|---|
| 01 | [The first route](p01-first-route.md) | `fewestLegs` | a search, and what a route has to contain |
| 02 | [The quickest taxi](p02-quickest-taxi.md) | `quickestRoute` | cost, and the danger of only counting it |
| 03 | [Will it fit?](p03-will-it-fit.md) | `unusableReason`, `quickestRouteFor` | the aeroplane, and useful refusals |
| 04 | [Turns cost time](p04-turns-cost-time.md) | `quickestRouteWithTurns` | when the obvious state is the wrong state |
| 05 | [Via the named taxiways](p05-via-the-named-taxiways.md) | `routeUnderClearance` | searching *under* a constraint |
| 06 | [Hold short](p06-hold-short.md) | `runwaysCrossed`, `planDeparture` | permission is not possibility |
| 07 | [A chart the size of a real one](p07-big-chart.md) | `quickestRouteGuided` | an estimate that never runs high |
| 08 | [Minutes to go](p08-minutes-to-go.md) | `secondsToGo` | a number for everywhere, not a route |
| 09 | [From where it actually is](p09-from-where-it-is.md) | `nextInstruction`, `followTable` | replanning without replanning |
| 10 | [Bravo is closed](p10-taxiway-closed.md) | `withTaxiwayClosed`, `closureCost` | what a disruption costs, and to whom |
| 11 | [Before pushback](p11-before-pushback.md) | `pushbackOrder` | jobs with preconditions; naming a loop |
| 12 | [Earliest off-block](p12-earliest-off-block.md) | `earliestOffBlock`, `criticalPath` | what is actually worth speeding up |

Work them in order. Each is a small delta on the one before, and several of them
call your earlier answers — which is allowed and intended.

## The loop

```bash
npm test                  # your code, all twelve
npm test -- p03           # just one
npm run test:watch        # re-runs on save
npm run test:reference    # the same tests, against the worked answers
npm run typecheck
```

Everything starts red. The stubs compile and return refusals, so a failing test
tells you what is missing rather than what will not build.

The unusual part: **the same test file is run twice**, once against
`src/problems` (yours) and once against `src/solutions` (the reference). The
reference is not a separate program you squint at; it is held to exactly the
tests you are held to.

## How a brief is laid out

Every one of the twelve has the same shape:

- **The situation** — why anybody wants this.
- **Write** — the signature, and what it has to return.
- **Examples** — two or three, and they appear verbatim in the test file.
- **Constraints** — the rules the answer has to obey.
- **Traps** — where this one actually goes wrong.
- **Edge cases the tests also check** — named, not spelled out.
- **Follow-up** — a harder version, for when you want one.

The examples are the contract. The rest of the test file is the part you have to
think about, which is the same deal a real requirement gives you.

## The demos

```bash
npm run surface                    # every method, on the same taxi
npm run surface -- --hub           # the big aerodrome
npm run surface -- --table         # the cost-to-go table
npm run turnaround                 # the forty minutes before the taxi
npm run turnaround -- --winter
npm run turnaround -- --crew 4
```

Add `-- --reference` to any of them to run the worked answers, so you can watch
the whole thing work before you have written a line.

## When you are stuck

1. **Check the reference passes.** `npm run test:reference -- p03`. If it does,
   the test is fine and the gap is in your code.
2. **Run `validateRoute`.** It tells you the first thing structurally wrong with
   a route — usually a leg that does not join the two points it claims to.
3. **Print the route.** `describe(chart, route)` gives you one line you can read
   against the chart above.
4. **Then read the solution** in `src/solutions/`, which is commented with the
   reasoning rather than a narration of the code.

## What carries into the capstone

The [capstone](../capstone/README.md) builds an autonomous taxi planner for the
same aerodrome, with the geometry put back: polygons instead of points, a
footprint instead of a dot, Dubins curves instead of turns on the spot.

Three things carry over more or less unchanged.

**The state is not the obvious thing.** Problem 04 makes the state carry how you
arrived, because a turn is not checkable otherwise. Problem 05 makes it carry
how much of the clearance you have used. The capstone's state is a directed edge
plus a clearance index — both of those ideas at once.

**Backwards is a different question.** Problem 08 is a backward sweep, and the
one-way taxiway is what makes it not merely "forwards reversed". The capstone's
cost-to-go is the same computation over a much larger state space.

**The refusal is the product.** Half the tests here check that the planner says
no, says it for the right reason, and says how far it *could* get. That is the
whole thesis of the capstone, and Problem 06 is where it starts.
