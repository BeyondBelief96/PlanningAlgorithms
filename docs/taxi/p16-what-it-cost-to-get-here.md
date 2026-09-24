# Problem 16 — The same table, forwards

## The situation

Problem 15 counted backwards from the holding position: *minutes still to go*.

Count forwards from the stand instead: *minutes already spent*. It is the mirror
image, it is four lines different, and the two differences are both worth
noticing.

## Write

```ts
minutesSpent(net: TaxiNetwork, moves: number): MinuteTable
```

## The recurrence

```
  alreadySpent(place, after k + 1 moves) =
      min over moves ARRIVING here of
          [ alreadySpent(where it came from, after k) + minutes for the move ]
```

## Examples

**1 — the table, row by row.**

Columns are `STAND 2, APRON, TWY A, HS 27 E, RWY 27`.

```
  0 moves    0  inf  inf  inf  inf     still on stand
  1          2    2  inf  inf  inf
  2          4    4    3    6  inf
  3          4    6    5    4    7     holding short for four
  4          6    6    5    6    5
```

**2 — it does not care where the aeroplane is going.**

```ts
const original = departureTaxi();
const moved = departureTaxi();
moved.finishes = [moved.find('APRON')];

minutesSpent(original, 4)  ===  minutesSpent(moved, 4)   // row for row
```

Re-clear the aircraft to a different destination and **every row is unchanged**.

What it cost to get somewhere depends on where you started and what the taxiways
are, not on the clearance. That asymmetry is the whole difference between this
table and Problem 15's, and it is why the backward form is the one people reach
for: the backward table is about the mission, and the forward table is about the
aerodrome.

## The two differences

**The boundary row is about where the aeroplane IS**, not where it is going.
Zero at the stand, infinity everywhere else.

**The sweep needs `movesTo()`, not `movesFrom()`.** How a place is *reached*,
not where it *leads*. On a network with a one-way move those are different
lists, and a forward table built from the wrong one is wrong in a way that looks
entirely plausible.

`RWY 27` is the check. A backward table never gives it a finite number — there
is no way back. A forward table must: you can get there, you just cannot get
home. Anyone who built this sweep from `movesFrom()` has a column of infinity
where a 7 belongs.

## Edge cases the tests also check

- A budget of zero.
- Moving the aeroplane to the apron, which shifts the whole table.
- Agreement with Problem 15 on the bypass network: ten minutes, measured from
  either end.

## Follow-up

Add the final cost and you have a complete fixed-length optimal plan measured
from the front rather than the back:

```
  best over places of [ minutesSpent(place, K) + finalMinutes(place) ]
```

Work out why that is the same number Problem 15 puts in `G[K][start]`, and you
have understood why the book presents both.

*In the book:* LaValle Section 2.3.1.2, equation (2.16), and Figure 2.12.
