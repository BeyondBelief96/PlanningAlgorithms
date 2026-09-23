# Reference solutions

One file per exercise, mirroring `exercises/ch02/`. Every one compiles against the
same headers and is checked by the same tests, so if you want to know whether the
reference actually works:

```powershell
ctest --test-dir build/vs -C Debug -L reference --output-on-failure
```

All eleven pass, and between them they reproduce every number printed in the
guides — the cost tables in guides 5 and 6, the round-by-round structure in guide
9, the satisfiability ladder in guide 10.

## How to use these

**Read them after you have written yours, not before.** The value of the exercise
is almost entirely in the hour before you get it working.

When you do read them, the comments carry the reasoning rather than a narration of
the code — why meeting a place twice is a no-op for breadth first and not for
Dijkstra, why the stale-entry trick is safe, why stopping means two different
things depending on which direction you are sweeping. Those are the parts worth
arguing with.

If your version differs and both pass the tests, yours is not wrong. There are
several reasonable ways to write most of these, and the tests only pin down the
things that are genuinely pinned down.

## Where the interesting decisions are

| File | Worth a look for |
|---|---|
| `ex01_forward_search` | the whole family factored into one function |
| `ex02_dijkstra` | the decrease-key workaround, and why `dead` makes it safe |
| `ex03_astar` | A\* and best first as one function with a weight on the cost-so-far |
| `ex04_iterative_deepening` | choosing the next IDA\* ceiling from the rejected value |
| `ex05_backward_bidirectional` | wavefront-at-a-time, and why it beats the textbook version |
| `ex06_backward_value_iteration` | the row-index arithmetic, written out |
| `ex07_forward_value_iteration` | how little changes, and which two things do |
| `ex08_stationary_value_iteration` | the stop option as one extra term; breaking ties towards it |
| `ex09_strips_state_space` | bit masks, and an honest note on what will not scale |
| `ex10_planning_graph` | the conflict conditions, and the escape clause in the second one |
| `ex11_planning_as_sat` | the five clause families, and a compact DPLL |

## Deliberate limitations

These are teaching implementations. Three places where something you would fly
would differ, all flagged in comments:

- **`ex02`** uses a binary heap with lazy deletion, giving `O(|E| log |V|)`. The
  textbook figure of `O(|V| log |V| + |E|)` needs a Fibonacci heap.
- **`ex09`** computes `predecessors()` by enumerating the whole state space. Fine
  at eight states, hopeless beyond about twenty facts.
- **`ex11`** implements plain DPLL, with no clause learning, watched literals or
  restarts. Modern solvers are orders of magnitude faster.

There is a fourth, which is not in the code but in the problems: every surface
here treats the aeroplane as a point that turns on the spot and pavement as
usable-or-not. The capstone is what removes that.
