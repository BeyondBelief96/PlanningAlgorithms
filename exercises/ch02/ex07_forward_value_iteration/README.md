# Exercise 07 — The cost already spent

**Guide:** [The answer for everywhere, on a fixed budget](../../../docs/ch02/05-optimal-fixed-length.md)

## Implement

```cpp
CostTable forwardValueIteration(const Problem& problem, int K);
```

The mirror image of Exercise 06. For each place and each number of moves *made*,
the cheapest way to be standing there:

```
already spent(place, after k+1 moves) = min over moves that arrive here of
                                           [ already spent(where it came from, after k)
                                             + cost of the move ]
```

starting from 0 where the aeroplane is and infinity everywhere else. Return
`K + 1` rows: row 0 is zero moves made, row `k` is exactly `k` moves made.

## The two things this exercise exists to teach

Both are asymmetries with Exercise 06, and both matter later.

**The cost already spent does not know where you are going.** Nothing in the
recurrence mentions the goal at all. The test makes this explicit: it re-clears
the aircraft to a different destination and checks that every row is unchanged.

What it cost to get somewhere depends on the airport and where you started, not on
the clearance. Working backwards is the opposite — it cannot even start without
knowing where the route is supposed to end.

**Forwards needs to know how places are *reached*.** To fill in a value at `x` you
must know who can get to `x`, not where `x` leads. `problem.predecessors(x)` hands
it over here, but on a real surface graph — where the state carries a heading and
arriving eastbound is not the reverse of departing westbound — the backward
transition can be much harder to compute than the forward one. That is exactly why
the backward form is usually presented first, even though starting from the
aeroplane feels more natural.

## The trap

Same infinity handling as Exercise 06: skip a predecessor whose value is infinite
rather than adding to it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex07 --output-on-failure
```

## What the tests check

`departureTaxi()` from stand 2, budget of four, cell by cell:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 0 moves made          0     inf    inf      inf     inf
 1 move made           2       2    inf      inf     inf
 2 moves made          4       4      3        6     inf
 3 moves made          4       6      5        4       7
 4 moves made          6       6      5        6       5
```

Plus the destination-independence check, and the route choice at a budget of four
on `bypassTaxi()`: counting forwards from the stand and counting backwards from
the holding point both give **ten minutes**. They must agree — it is the same
taxi, measured from opposite ends.

## A warning that catches people

These are *fixed-budget* tables. At a budget of five on `bypassTaxi()` the answer
is no longer ten: a five-move route has to pad, and padding is not free while the
aeroplane is not allowed to stop. Try it, and look at what it does with the spare
move. Exercise 08 removes the budget.

---

**In the book:** LaValle Section 2.3.1.2. The recurrence is (2.16) from
`C*_1(x) = 0` at `x_I`, and the table above is **Figure 2.12** exactly, with
a → STAND 2, b → APRON, c → TWY A, d → HS 27 E, e → RWY 27; rows are `C*_1`
through `C*_5`. The cross-check on `bypassTaxi()` (Figure 2.21) is book
Exercise 1, and comparing the two directions is book Exercise 23. The book's own
justification for presenting backward first —"even though it may appear
superficially to be easier to progress from `x_I`" — is the asymmetry above.
