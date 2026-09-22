# Chapter 2 reference solutions

One file per exercise, mirroring `exercises/ch02/`. Every one compiles against the
same headers and is checked by the same tests, so if you want to know whether the
reference actually works:

```powershell
ctest --test-dir build/vs -C Debug -L reference --output-on-failure
```

All eleven pass, and between them they reproduce Figures 2.9, 2.12, 2.14, 2.15
and 2.20 and equation (2.24) exactly as printed in the book.

## How to use these

**Read them after you have written yours, not before.** The value of the exercise
is almost entirely in the hour before you get it working.

When you do read them, the comments carry the reasoning rather than a narration of
the code — why line 12 of Figure 2.4 is a no-op for breadth-first and not for
Dijkstra, why the stale-entry trick is safe, why the forward and backward
termination actions look different. Those are the parts worth arguing with.

If your version differs and both pass the tests, yours is not wrong. There are
several reasonable ways to write most of these, and the tests only pin down the
things the book pins down.

## Where the interesting decisions are

| File | Worth a look for |
|---|---|
| `ex01_forward_search` | the whole family factored into one function |
| `ex02_dijkstra` | the decrease-key workaround, and why `dead` makes it safe |
| `ex03_astar` | A* and best-first as one function with a weight on `C(x)` |
| `ex04_iterative_deepening` | choosing the next IDA* bound from the rejected `f` |
| `ex05_backward_bidirectional` | wavefront-at-a-time, and why it beats Figure 2.7 |
| `ex06_backward_value_iteration` | the stage-index arithmetic, written out |
| `ex07_forward_value_iteration` | how little changes, and which two things do |
| `ex08_stationary_value_iteration` | `u_T` as one extra term; tie-breaking to terminate |
| `ex09_strips_state_space` | bit masks, and an honest note on what will not scale |
| `ex10_planning_graph` | the mutex conditions, and the escape clause in condition 2 |
| `ex11_planning_as_sat` | the five clause families, and a compact DPLL |

## Deliberate limitations

These are teaching implementations. Three places where a production version would
differ, all of them flagged in comments:

- **`ex02`** uses a binary heap with lazy deletion, giving `O(|E| log |V|)`. The
  book quotes `O(|V| log |V| + |E|)`, which needs a Fibonacci heap.
- **`ex09`** computes `predecessors()` by enumerating all of `X`. Fine at
  `|X| = 8`, hopeless beyond about twenty atoms.
- **`ex11`** implements plain DPLL, with no clause learning, watched literals or
  restarts. Modern solvers are orders of magnitude faster.
