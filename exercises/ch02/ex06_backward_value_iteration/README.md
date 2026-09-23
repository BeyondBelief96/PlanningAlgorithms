# Exercise 06 — The cost still to go

**Guide:** [The answer for everywhere, on a fixed budget](../../../docs/ch02/05-optimal-fixed-length.md)

Search gives you a route from where the aeroplane is. This gives you a number for
**every place on the airport**: how long the taxi still is, from there.

## Implement

```cpp
CostTable backwardValueIteration(const Problem& problem, int K);
Plan planFromBackwardValues(const Problem& problem, const CostTable& G);
```

Row by row, from a boundary row that is `problem.finalCost(x)` — zero where the
aeroplane may stop, infinity everywhere else:

```
still to go(place, k moves left) = min over moves of
                                      [ cost of the move
                                        + still to go(where it leads, k-1 moves left) ]
```

Return `K + 1` rows: row 0 is the budget fully spent, row `r` is `r` moves still
to spend, row `K` is the whole budget available. That is the order the guide
prints them in, so you can read your output straight against it.

## The traps

**Beware infinity.** If the place a move leads to is infinite, skip that move
rather than computing `inf + something`. The arithmetic is defined in IEEE 754 and
your `min` will end up carrying infinity where you meant "no such option".

**There is no "and stop" here.** The route must use *exactly* the budget. So a
place can be a perfectly good holding point and still have an infinite value:
look at the `HS 27 E` column and work out why it is 0 with no moves left and
infinity with one. (From the holding point with one move to spend you must spend
it, and the only places it takes you are back onto taxiway A or onto the runway.)
This absurdity is what Exercise 08 removes.

**The index arithmetic in `planFromBackwardValues` is the fiddly part.** To decide
what to do at row `k` you need row `k - 1`, which is row `K - k` of the table.
Write the mapping out for K = 4 on paper before you write any code.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex06 --output-on-failure
```

## What the tests check

`departureTaxi()` with a budget of four, cell by cell:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 0 moves left        inf    inf    inf        0     inf
 1 move left         inf      4      1      inf     inf
 2 moves left          6      2    inf        2     inf
 3 moves left          4      6      3      inf     inf
 4 moves left          6      4      5        4     inf
```

Three things in that table are worth staring at.

**The `RWY 27` column is infinite everywhere.** There is no such thing as
un-entering a runway. The table has discovered, without being told, that the
airport is not strongly connected — and on a real surface that is the single most
important thing a planner can say: *from here, your clearance cannot be complied
with.*

**The numbers are not monotone down a column.** Three moves left gives 4 at the
stand; two moves left gives 6. Longer is not worse; longer is a different
question, and that is entirely an artefact of the budget.

**The recovered route uses exactly four moves and costs six minutes, not four.**
The quick way out is three legs, so to spend a budget of exactly four the
aeroplane holds at the stand for two minutes and then taxis. Padding is not free,
and that is the honest reason nobody plans a taxi with a fixed move count.

Plus: a budget of one produces no route at all, and with enough budget the answer
agrees with Dijkstra on `standArea`.

If your table differs in one cell, print it and compare:

```cpp
std::cout << formatCostTable(problem, {"0 left", "1 left", "2 left", "3 left", "4 left"}, G);
```

One wrong cell usually points at one wrong line.

---

**In the book:** LaValle Section 2.3.1.1 — this is book Exercise 22, *"implement
backward value iteration and verify its correctness by reconstructing the costs
obtained in Example 2.5."* The recurrence is (2.11) from the boundary condition
`G*_F(x) = l_F(x)`, and the table above is **Figure 2.9** exactly, with a → STAND
2, b → APRON, c → TWY A, d → HS 27 E, e → RWY 27. Rows are `G*_5` down to `G*_1`.
