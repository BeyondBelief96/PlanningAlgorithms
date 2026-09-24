# Problem 15 — The table for a fixed number of moves

## The situation

Every search so far answered *"what should this aeroplane do?"*. Problem 08
answered something better — *"what should an aeroplane at every point do?"* —
and did it with a search.

This problem gets the same kind of answer by **filling in a table**. No queue,
no frontier, no parent pointers: one sweep over every place, repeated.

It is slower, and it is the idea the whole of dynamic programming is built on,
so it is worth doing the slow way once.

## The network

Kilo Field is the wrong size for this. You want something you can check by eye,
with whole minutes on it, and with the two things a real chart does not have:

- a move that **leaves you where you are** — holding at the stand, engines
  running, burning a minute; and
- a place you **cannot leave** — a runway you have entered, from which no legal
  move returns you to the holding position.

`departureTaxi()` has both.

```
  STAND 2 --(2)-> STAND 2   hold at the stand, engines running
  STAND 2 --(2)-> APRON     push back and start the taxi
  APRON   --(1)-> TWY A     turn onto the parallel taxiway
  APRON   --(4)-> HS 27 E   the long way round, on the apron lanes
  TWY A   --(1)-> HS 27 E   up to the holding position
  TWY A   --(1)-> STAND 2   give up and go back to the stand
  HS 27 E --(1)-> TWY A     abandon the crossing, back onto A
  HS 27 E --(1)-> RWY 27    line up, once cleared
```

Start at `STAND 2`, finish at `HS 27 E` — a departure taxi is done when the
aeroplane is holding short, not when it is airborne.

## Write

```ts
minutesToGo(net: TaxiNetwork, moves: number): MinuteTable
scheduleFromTable(net: TaxiNetwork, table: MinuteTable): TaxiSchedule
```

`MinuteTable` is one row per budget, one column per place.

## The recurrence

```
  stillToGo(place, k moves left) = min over moves of
                                      [ minutes for the move
                                        + stillToGo(where it leads, k - 1) ]
```

started from a boundary row that says: with no moves left, being at the holding
position costs nothing and being anywhere else is impossible.

One sweep per row, K rows: `K × places × moves` of work, against `moves^K` for
enumerating routes.

## Examples

**1 — the table, row by row.**

Columns are `STAND 2, APRON, TWY A, HS 27 E, RWY 27`.

```
  0 left   inf  inf  inf    0  inf     only HS 27 E will do
  1 left   inf    4    1  inf  inf
  2 left     6    2  inf    2  inf
  3 left     4    6    3  inf  inf
  4 left     6    4    5    4  inf     the row the schedule is read from
```

**2 — being where you want to be is worthless if you still owe moves.**

```ts
table[0][at('HS 27 E')]  ->  0
table[1][at('HS 27 E')]  ->  Infinity
```

With a fixed budget there is no "and stop". An aeroplane already holding short
with one move left has to spend it, and nothing it can do brings it back to the
holding position — there is no loop through `HS 27 E` of length one. Hence
infinity in a column that contains the destination. Problem 17 is what fixes
this.

**3 — the schedule spends exactly the budget.**

```ts
scheduleFromTable(net, minutesToGo(net, 4))

  moves.length  ->  4
  minutes       ->  6
```

Six minutes, not four. The quick way out is three moves, so to spend a budget of
exactly four the aeroplane holds at the stand for two minutes first and then
taxis. **Padding is not free**, which is the honest reason nobody plans a taxi
with a fixed move count.

## Traps

**Guard the infinities.** `inf + 2` is fine. One unguarded subtraction turns an
entry into `NaN`, and `NaN` compares false against everything — so the table
looks plausible and every route read from it is wrong. `RWY 27`'s column is
infinity for ever, so it is the column that catches this.

**Walk down the rows as you go forwards.** At step k the aeroplane needs the row
for "K − k moves left". The budget is being spent.

## Edge cases the tests also check

- A budget of zero, whose only row is "where may I stop".
- A budget too small to make, which is a refusal.
- The bypass network, where a budget of five costs **more** than a budget of
  four — because the aeroplane still has to spend it.

## Follow-up

Compare the work with Problem 02. Dijkstra touches only the points whose numbers
can still change; this sweeps every place on every pass. What it buys for that
price is the answer for *every* place at *every* budget, and Problem 17 is where
that stops being a curiosity.

*In the book:* LaValle Section 2.3.1.1, equation (2.11), and Figure 2.9 — these
rows are that figure, in column order a b c d e.
