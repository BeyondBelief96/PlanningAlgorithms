# Problem 17 — Taking the budget away

## The situation

Problem 15's answer from the stand was **six** minutes, and the quick way out
takes four. The aeroplane held at the stand for two minutes it did not need,
because the budget was four moves and it had to spend them.

That is absurd, and the fix is one idea: **let it stop**.

Stopping keeps the aeroplane where it is and adds no minutes, so a two-move taxi
padded out to five costs exactly the same as the two-move taxi. That makes "best
taxi of exactly K moves" equal to "best taxi of **at most** K moves", and once
the sweeps stop changing anything the budget has effectively gone away.

What comes out is not a route. It is an instruction for every place on the
aerodrome — which is Problem 08's table, built by sweeping rather than
searching, and it is the object the capstone replans against.

## Write

```ts
settleMinutesToGo(net): SettledTaxi
settleMinutesSpent(net): SettledSpend
scheduleFromAdvice(net, settled, from?): TaxiSchedule
```

```ts
interface SettledTaxi {
  minutes: number[];   // still to go, from every place
  advice: number[];    // the move to take; STOP; or NO_MOVE
  sweeps: number;      // before the numbers stopped moving
  history: MinuteTable;
}
```

## The recurrence

```
  stillToGo(place) = min( 0 if the taxi may finish here, else infinity,
                          min over moves of
                              [ minutes + stillToGo(where it leads) ] )
```

repeated until a whole row comes back identical.

## Examples

**1 — it settles after three sweeps.**

Columns are `STAND 2, APRON, TWY A, HS 27 E, RWY 27`.

```
  start    inf  inf  inf    0  inf     only the holding point is free
  sweep 1  inf    4    1    0  inf     one move out
  sweep 2    6    2    1    0  inf     two moves out
  sweep 3    4    2    1    0  inf     settled
```

Four minutes from the stand, not six. Taking the budget away took two minutes
off.

**2 — the runway stays infinite.**

```ts
settled.minutes[at('RWY 27')]  ->  Infinity
settled.advice[at('RWY 27')]   ->  NO_MOVE
```

An infinite entry is not a failure of the algorithm. It is the planner saying,
correctly, that from here the clearance cannot be complied with — and the advice
has nothing to offer rather than something bad.

**3 — it says stop at the holding position.**

```ts
settled.advice[at('HS 27 E')]  ->  STOP
```

The one instruction the aeroplane must not improvise past.

**4 — and following it from the stand gives four minutes in three moves.**

```ts
scheduleFromAdvice(net, settled)

  minutes       -> 4
  moves.length  -> 3
```

From `STAND 2` the choice is: push back, at 2 + 2 = 4, or hold at the stand, at
2 + 4 = 6. Waiting is never free.

## The forward version, and why it has no advice

`settleMinutesSpent` does the same to Problem 16's table. Stopping forwards
means *"we already got here and stayed"*, so the current value competes with
every one-move extension that lands on the place.

There is no advice to recover, and the reason is Problem 16's: the forward table
does not know where the aeroplane is going, so there is nothing for it to advise
*towards*. Ask yourself that before you read this paragraph.

## Traps

**Break ties towards STOP.** `HS 27 E` can reach itself again in two minutes,
via `TWY A` and back. Both cost more than nothing, but a comparison that
prefers a move on a tie sends the aeroplane for a lap of the taxiway before it
stops.

**Record every sweep.** Watching it settle is most of the value, and the test
checks the intermediate rows, not just the last one.

**Bound the loop.** If the numbers never settle, some move costs less than
nothing. Throw and say so; do not spin.

## Edge cases the tests also check

- Following the advice from four different places, and matching the settled
  number every time — no search at all, just a lookup, repeated.
- Refusing from `RWY 27`, where the taxi cannot be completed.
- The bypass network, both directions: `still to go` of `[10, 8, 4, 1, 0]` and
  `already spent` of `[0, 2, 6, 9, 10]`, meeting at ten.

## Follow-up

Compare this with Problem 02. Dijkstra is value iteration that only touches the
places whose numbers can still change; this sweeps everything on every pass.
Same answer, wildly different bookkeeping — and what this buys for the price is
the answer for *every* place, which is what you want when the aeroplane might
not be where you thought.

Then look at Problem 09 again. It followed a table exactly like this one, and
called it replanning.

*In the book:* LaValle Section 2.3.2; the stop option is the termination action
u_T and the recurrence is (2.18). The tables are Figures 2.14 and 2.15, and the
bypass network is book Exercise 1.
