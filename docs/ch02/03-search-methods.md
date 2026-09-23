# 3. Which one to look at next

> Exercises: [02 Dijkstra](../../exercises/ch02/ex02_dijkstra/README.md),
> [03 A\* and best first](../../exercises/ch02/ex03_astar/README.md),
> [04 iterative deepening](../../exercises/ch02/ex04_iterative_deepening/README.md)

Each method below is guide 2's template with a different answer to "what comes
out of the queue next". That is the only difference, and writing them that way —
rather than as four separate programs — is most of what this guide has to teach.

## Dijkstra: count the minutes

Give every move a cost that is never negative, and take out whichever place is
cheapest to have reached so far.

- Where the aeroplane is now costs 0 to have reached.
- Reaching `x'` from `x` costs whatever `x` cost, plus the move.
- Line 12 finally has work to do. If `x'` is already in the queue at a higher
  cost, lower it.

This is the first method here that would survive contact with a flight crew.
Breadth first minimises the number of legs, which is not a quantity anybody cares
about; `bypassTaxi` is built to make the difference visible. Three legs round
taxiway A is thirteen minutes. Four legs cutting north through B is ten. Breadth
first takes the thirteen and reports success.

### When is the cost final?

This is the part worth understanding rather than memorising, because the same
argument reappears in guide 7 and again in every later chapter that does dynamic
programming.

> Once a place is taken out of the queue it is dead, and it is known that it
> cannot be reached more cheaply.

By induction. The starting place costs 0, which is optimal, giving the base case.
Suppose every dead place has its true cheapest cost. Let `x` be the cheapest thing
in the queue. Any cheaper route to `x` would have to pass through something else
still in the queue — but everything still in the queue already costs *more*, and
no move costs less than nothing, so that route cannot be cheaper. Routes that
pass only through dead places were already counted. So `x`'s cost is final, and
it can join the dead.

Two things that argument leans on, both worth noticing because they are exactly
what breaks elsewhere:

- **No move costs less than nothing.** With a negative move, something still in
  the queue at a higher cost could yet lead somewhere cheaper. Guide 6 handles
  negative costs, but only through value iteration, and only when no *cycle* is
  negative.
- **You check for arrival on removal, not on generation.** The proof establishes
  finality at the moment of removal. Return earlier and you return a
  best-so-far, not a best.

### There is no lowering a key

`std::priority_queue` cannot reach inside and lower the cost of something already
in it. The standard workaround is to push a *second* entry at the new lower cost
and throw away stale ones as they surface:

```cpp
const auto [c, x] = q.top();
q.pop();
if (dead[x]) continue;   // a stale duplicate; the real one came out already
dead[x] = true;
```

This is safe precisely because of the induction above: the first time a place
comes out, its cost is final, so every later copy is by definition stale.

## A\*: count the minutes, and guess the rest

A\* is Dijkstra with one line changed. Take out whichever place minimises

```
minutes spent getting here  +  guess at the minutes still to go
```

> If the guess never exceeds the truth, A\* is guaranteed to find the best route.

A guess that never runs high is called *admissible*. On a grid of pavement where
every move costs 1 and you can only move on the square, `|Δrow| + |Δcol|` is
admissible: it is the route you would taxi if the buildings were not there, and
buildings only ever make things longer.

The two extremes are worth holding onto:

- **guess ≡ 0** — A\* is exactly Dijkstra. The `standArea` demo shows this
  literally: `A* (zero)` and `Dijkstra` expand the same 32 squares.
- **guess ≡ the truth** — A\* walks straight down the best route and looks at
  nothing else.

Everything useful is in between, and the closer the guess gets, the less airport
gets examined. The catch, which becomes a running theme once the state space is
poses rather than squares, is that a better guess is usually a more expensive
guess, and at some point it costs more than the search it saves.

### Square-corner distance versus straight-line distance

Both never run high on a 4-connected grid, so both give the best route. But the
straight line is a *weaker* guess: `sqrt(Δr² + Δc²) ≤ |Δr| + |Δc|`, with equality
only when the goal is on the same row or column. A weaker guess means less
guidance means more of the apron examined.

```powershell
./build/vs/Debug/surface_demo.exe open
```

On `openApron` — 240 squares of pavement — the reference produces:

```
  Dijkstra                 23.000 minutes   expanded 226
  A* (Euclidean)           23.000 minutes   expanded 169
  A* (Manhattan)           23.000 minutes   expanded 129
  best first               23.000 minutes   expanded  24
```

All three A\* variants return the same 23 minutes. Square-corner distance beats
straight-line distance because it is *exact* on clear pavement, while the
straight line systematically undershoots — a taxiing aeroplane cannot travel
diagonally across an apron, so the straight-line distance is never achievable.

Then notice the number that should bother you. A\* still examines 129 of 240
squares with an exact guess. With the guess exact, every square on every
staircase between the stand and the holding point scores the same 23, and A\* has
no reason to prefer any of them, so it works through the lot. Best first, which
throws the cost-so-far away entirely, examines 24 — and on this apron happens to
get the right answer anyway.

That plateau is the honest limitation of heuristic search on open pavement, and
it is why the capstone's cost function has a hotspot penalty and a turn penalty
in it: not because those things dominate taxi time, but because they break ties,
and a search with no ties to break goes very much faster.

## Best first: forget where you came from

Take out whichever place has the smallest guess. Drop the cost-so-far entirely.

Because the cost-so-far is gone, there is no claim that the route is any good,
and no reason for the guess to be an underestimate. What you get instead is
speed — often far less of the airport examined.

> Sometimes the price must be paid for being greedy.

`deadEndPier` is the demonstration. A row of stands walled in on three sides,
opening west, holding point to the south-east. Best first taxis east because east
is towards the goal, wedges the aeroplane against the inside of the pier, and has
to exhaust the entire pocket before it will accept a single move that increases
the distance. It is the surface equivalent of taxiing into a cul-de-sac between
two piers and needing a tow to get out.

Best first is also **not systematic**, which is the part that should disqualify it
from anything safety-relevant: on an infinite state space it can miss a route
that exists, and it cannot tell you the difference between "no route" and "I gave
up".

> **An open exercise.** `deadEndPier` makes best first *work* harder, but it still
> returns the best route, because once it escapes the pier there is only one way
> round. Building a surface where best first comes back with a route that is
> genuinely longer is the exercise. You need two routes to the holding point: a
> long one whose first move decreases the guess, and a short one whose first move
> increases it. Add it to `planning::maps` in `src/grid.cpp` and check it with
> `surface_demo`.

## Iterative deepening: search shallow, then deeper

Run depth first with a limit of 0 moves, then 1, then 2, throwing away all the
previous work each time.

This sounds wasteful and mostly is not. If each place has `b` options, the level
`i + 1` holds roughly `b` times as many places as level `i`, so all the earlier
passes together cost a constant fraction of the last one. What you buy is breadth
first's guarantee — fewest moves, systematic — with depth first's memory profile:
you hold one branch, not the whole frontier.

**When it is a good idea:** many options per place and few places reachable two
ways. A turnaround description with many jobs. A state space of poses, where the
frontier will not fit in memory.

**When it is not:** a grid of pavement. Every square is reachable several ways,
and iterative deepening deliberately keeps no record of where it has been — a
square too deep on one branch may be shallow enough on another — so the running
time is exponential in the number of moves. `surface_demo` refuses to run it when
the route is longer than 12 moves, and that refusal is itself the result:

```
iterative deepening     skipped: the shortest route is 23 moves, and depth-limited
                        search with no visited set is exponential in that
```

**IDA\*** replaces the move limit with a limit on minutes-plus-guess. The subtlety
is choosing the next ceiling: raise it by a fixed step and you either re-explore
the same ground or step straight over the answer. The right answer is to have each
pass report the smallest value it *rejected*, and use exactly that next.

## Summary

| Method | What comes out next | Best route? | Can it honestly say "no route"? |
|---|---|---|---|
| breadth first | the oldest | fewest moves only | yes |
| depth first | the newest | no | only when the space is finite |
| Dijkstra | cheapest so far | yes | yes |
| A\* | cheapest so far + guess | yes, if the guess never runs high | yes |
| best first | guess alone | no | **no** |
| iterative deepening | depth-limited | fewest moves only | yes |
| IDA\* | cost-limited | yes, if the guess never runs high | yes |

The last column is the one the capstone cares about.

---

## In the book

LaValle Section 2.2.2, pages 35–39. Dijkstra's cost-to-come is `C(x)` and the
optimality argument is the book's; A\* sorts by `C(x) + Ĝ(x)` and the quoted
guarantee is from that section, as is "sometimes the price must be paid for being
greedy!"

Square-corner distance is the book's Manhattan heuristic and straight-line is
Euclidean; comparing them is book Exercise 18, and the `openApron` numbers above
are its measurable content — 18(a) is why Manhattan wins, and the second half of
18 is the plateau of equal-`f` states, which motivates book Exercise 21.

`deadEndPier` is the 2D shadow of Figure 2.5, the spiral tube whose opening faces
away from the goal. The open exercise above is book Exercise 2.

Iterative deepening and the quoted "way of converting depth-first search into a
systematic search method" are from the same section; running times are
`O(|V| log |V| + |E|)` with a Fibonacci heap and `O(|E| log |V|)` with the binary
heap and lazy deletion used here.

---

Next: [planning from the other end](04-backward-bidirectional.md).
