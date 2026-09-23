# 5. The answer for everywhere, on a fixed budget

> Exercises: [06, the cost still to go](../../exercises/ch02/ex06_backward_value_iteration/README.md),
> [07, the cost already spent](../../exercises/ch02/ex07_forward_value_iteration/README.md)

This is the part of the unit that pays for everything after it. It is worth going
slowly, and it is worth doing the tables by hand at least once.

Search gives you a route from where the aeroplane is. What follows gives you a
*number for every place on the airport*: how long the taxi still is, from there.
It costs far more to compute and it answers a far better question, because an
aeroplane on a real surface is routinely not where the plan said it would be.

## What changes

Three additions to guide 1's model:

1. **A stage index.** Places get a step number attached: where were you after
   two moves, after three.
2. **Costs that add up.** The cost of a route is the sum of the per-move costs,
   plus a final term that is 0 if you finished somewhere acceptable and infinity
   if you did not.
3. **A budget.** The route must use **exactly** K moves.

The additivity is doing real work in that list. It means the cost of a route is a
sum of terms each depending only on where you are and what you do — and that is
exactly the structure the next section needs.

The infinity is the same trick as before: a route that does not finish where it
should costs infinity, so any minimisation throws it away for free. Finite means
feasible, at that cost.

Two special cases worth noting. Make every move free and you are back to guide 1,
restricted to K-move routes. Make every move cost 1 and you are minimising the
number of moves, which is breadth first.

### Why on earth a fixed budget?

Because it makes the recurrence clean, and because the machinery generalises the
moment you remove it — which guide 6 does, in about four lines.

Be clear that the budget itself is an artefact. Nobody plans a taxi in exactly
four moves. Exercise 06 makes this concrete and slightly absurd: with a budget of
four and a three-move route out to the holding point, the best the aeroplane can
do is *hold at the stand for two minutes* and then taxi. Six minutes instead of
four, and the extra two are pure padding.

Hold onto that absurdity. It is the whole motivation for guide 6.

## Portions of good routes are good routes

> Portions of optimal plans are themselves optimal.

Almost a tautology once stated — if you could swap out part of a best route for a
cheaper part with the same two ends, it was not the best route. But it licenses an
enormous saving.

Enumerating every K-move sequence costs `options^K`. Building the table costs
`K × places × options`. For `openApron`, with 240 squares, 4 options each and a
23-move route, that is the difference between 7 × 10^13 and about 22,000.

## Working backwards: the cost still to go

Define, for each place and each number of moves remaining, the cheapest way to
finish. At the boundary there are no moves left, so you just collect the final
term: zero if you are already somewhere acceptable, infinity otherwise.

Then each row comes from the one before it:

```
still to go(place, k moves left) = min over moves of
                                      [ cost of the move
                                        + still to go(where it leads, k-1 moves left) ]
```

One sweep over every place per row, K sweeps in all.

### The departure taxi, with a budget of four

`departureTaxi()`: stand 2, out to the holding point short of runway 27 at
taxiway E.

```
  STAND 2 --(2)-> STAND 2      hold at the stand
  STAND 2 --(2)-> APRON        push back and start the taxi
  APRON   --(1)-> TWY A
  APRON   --(4)-> HS 27 E      the long way round on the apron lanes
  TWY A   --(1)-> HS 27 E
  TWY A   --(1)-> STAND 2      give up, return to stand
  HS 27 E --(1)-> TWY A        abandon the crossing
  HS 27 E --(1)-> RWY 27       line up, once cleared
```

Costs are minutes. With a budget of four moves, the table is:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 0 moves left        inf    inf    inf        0     inf
 1 move left         inf      4      1      inf     inf
 2 moves left          6      2    inf        2     inf
 3 moves left          4      6      3      inf     inf
 4 moves left          6      4      5        4     inf
```

`test_ex06` checks this row by row, so you will know at once if you have the
recurrence backwards. Three things in it are worth staring at.

**The `RWY 27` column is infinite everywhere.** An aeroplane that has entered the
runway has no edge back to the holding position — there is no such thing as
un-entering a runway, and nothing on the surface graph pretends otherwise. The
table is telling you the airport is not strongly connected, which is information
you would otherwise have to go looking for. It is also, on a real surface, the
single most important thing a planner can say: *from here, your clearance cannot
be complied with.*

**`HS 27 E` is infinite with one move left, even though it is the goal.** There is
no "and stop" in this model. From the holding point with one move to spend you
must spend it, and the only places it takes you are back onto A or onto the
runway. Being where you want to be is worthless if you are not allowed to stop.
Guide 6 is precisely about fixing this.

**The numbers are not monotone down a column.** Three moves left gives 4 at
`STAND 2`; two moves left gives 6. Longer is not worse; longer is a *different
question*, because "finish in exactly four" and "finish in exactly three" are not
the same request. This is an artefact of the budget and it disappears in guide 6.

### Getting the route back out

Storing the best move at every place and every row costs `K × places`. Guide 6
brings it down to just `places`, which is what `Stationary::policy` is.

For Exercise 06 you re-derive the best move from the table instead, and the index
arithmetic is the fiddly part: to decide what to do at row `k` you need row
`k - 1`, which is row `K - k` of the returned table. Write it out for K = 4 on
paper before you write any code.

## Working forwards: the cost already spent

The mirror image. For each place and each number of moves *made*, the cheapest
way to be standing there:

```
already spent(place, after k+1 moves) = min over moves that arrive here of
                                           [ already spent(where it came from, after k)
                                             + cost of the move ]
```

starting from 0 where the aeroplane is and infinity everywhere else. On the same
departure taxi:

```
                  STAND 2  APRON  TWY A  HS 27 E  RWY 27
 0 moves made          0     inf    inf      inf     inf
 1 move made           2       2    inf      inf     inf
 2 moves made          4       4      3        6     inf
 3 moves made          4       6      5        4       7
 4 moves made          6       6      5        6       5
```

### Two asymmetries, and why they matter

**The cost already spent does not know where you are going.** Nothing in the
recurrence mentions the goal at all. Re-clear the aircraft to a different
destination and every row is unchanged — `test_ex07` checks exactly that. What it
cost to get somewhere depends on the airport and where you started, not on the
clearance.

Working backwards is the opposite: it cannot even start without knowing where the
route is supposed to end.

**Working forwards needs to know how places are reached.** To fill in a value at
`x` you need to know who can get to `x`, not where `x` leads. `predecessors(x)`
hands it over here; on a real surface graph with headings it is the harder of the
two directions, which is why the backward form is usually presented first even
though starting from the aeroplane feels more natural.

Which one you want depends on what you are going to do with it. If you want a
route now, either. If you want to be able to answer "and what if the aeroplane is
somewhere else", you want the backward one, because it is a function over the
whole airport rather than a path across it.

## Three open extensions

These are pencil exercises, and they are good ones, because the recurrence barely
changes.

**Cost that depends on where you land.** Let a move's cost depend on the place it
leads to as well as the place it starts from. Show the argument still works.
(Hint: the derivation never used the fact that it did not. Write it out.)
`Transition` already carries the destination alongside the cost, so the code
change is smaller than you would expect. This is not academic — a taxi cost that
charges extra for *entering* a hotspot is exactly this shape.

**Cost that depends on the stage.** Let the cost of a move depend on which step
you are at. What breaks when you try to run this to settlement in guide 6, and
why? (A departure slot that closes in six minutes is this problem, and the answer
is that you cannot drop the stage index any more.)

**A real stopping place.** Instead of "stay where you are", add a dedicated
finished-state that everything falls into and never leaves. Work out what has to
change. Then compare against `kTerminate` in `Stationary::policy` — the two
formulations are equivalent, and seeing why is the exercise.

---

## In the book

LaValle Section 2.3.1, pages 43–50, Formulation 2.2. The stage index is `k`, the
stage-additive cost functional is `L(π_K) = Σ l(x_k, u_k) + l_F(x_F)` with
`F = K + 1`, and `l_F` is 0 on `X_G` and infinity elsewhere.

The principle of optimality is quoted verbatim. The backward recurrence is
(2.6) at the boundary and (2.11) in general:

```
G*_F(x_F) = l_F(x_F)
G*_k(x_k) = min over u_k of [ l(x_k, u_k) + G*_{k+1}(f(x_k, u_k)) ]
```

and the forward one is (2.16):

```
C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
                        of [ C*_k(x_k) + l(x_k, u) ]
```

The departure-taxi table above is Figure 2.9, and the cost-to-come table is
Figure 2.12, both for Example 2.3 on Figure 2.8 with `K = 4`, `x_I = a`,
`X_G = {d}`. The relabelling is exact: a → STAND 2, b → APRON, c → TWY A,
d → HS 27 E, e → RWY 27.

The book's remark that "even though it may appear superficially to be easier to
progress from `x_I`, it turns out that progressing backward from `X_G` is
notationally simpler" is from this section. The three open extensions are book
Exercises 3, 4 and 5.

---

Next: [taking the budget away](06-unspecified-length.md).
