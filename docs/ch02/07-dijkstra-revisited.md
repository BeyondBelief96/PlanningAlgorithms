# 7. Dijkstra revisited — Section 2.3.3

> Read alongside book pages 56–57.
> No new exercise; this one ties Exercises 02, 07 and 08 together.

You have now written two programs that compute the same numbers by visibly
different means. Section 2.3.3 explains why.

## The observation

Look at the forward value iteration table for Example 2.5 again:

```
         a    b    c    d    e
 C*_1   inf    0  inf  inf  inf
 C*_2   inf    0    1    4  inf
 C*_3     2    0    1    2    5
 C*_4     2    0    1    2    3
```

Every sweep recomputes a value for all five states, but almost nothing changes.
`b` is 0 from the start and stays there. `c` reaches 1 in the second sweep and
never moves. The only cells doing any work are the handful on the frontier.

Dijkstra's algorithm is value iteration that only touches those cells.

## The dictionary

The book's mapping between the two algorithms is exact:

| In value iteration | In Dijkstra |
|---|---|
| a state whose value is still `∞` | **unvisited** — no plan has reached it |
| a state whose value has become stationary | **dead** — removed from `Q` |
| a state with a finite but possibly improvable value | **alive** — in `Q` |
| one sweep lowering a value | a relaxation along one edge |

> In a sense, Dijkstra's algorithm is very much like the value iteration, except
> that it efficiently maintains the set of states within which cost-to-go values
> can change.

And the payoff:

> At the end of both algorithms, the resulting values correspond to the
> stationary, optimal cost-to-come, `C*`.

You can see this directly in `grid_demo`. On `openRoom`:

```
  Dijkstra           cost 23   expanded 226
  value iteration    cost 23   swept the whole state space 28 times
```

240 states × 28 sweeps ≈ 6,700 state updates, against Dijkstra's 226 expansions
for the identical answer.

## So why keep value iteration at all?

Because the conditions that make Dijkstra work are narrow, and value iteration
survives their loss. Dijkstra's correctness rests on the induction in
[guide 3](03-search-methods.md), which needs:

1. **Nonnegative costs.** With a negative edge, popping the cheapest state no
   longer proves its value is final. Value iteration tolerates negative costs as
   long as there are no negative cycles.
2. **A deterministic transition function.** Chapter 10 replaces `f(x, u)` with a
   probability distribution over next states, and the `min` becomes a `min` over
   an expectation. The value iteration recurrence absorbs that change essentially
   unaltered. Dijkstra has nothing to say about it.
3. **A known state.** Chapter 11 plans in *information spaces*, where the current
   state is not observable. Value iteration carries over; the priority-queue
   argument does not.

Which is why the book spends its time on value iteration even though Dijkstra
wins on this chapter's problems. Section 2.3.3 closes with exactly that framing —
value iteration is the general method, and Dijkstra is the special case that falls
out "only under some special conditions."

There is one more reason, and it is the one that matters most for Part II:
**value iteration gives you `G*` everywhere, not just along one path.** Dijkstra
stops the moment it pops the goal. Value iteration hands you a function over the
whole state space, from which `u* = argmin[l(x, u) + G*(f(x, u))]` tells you what
to do from *any* state, including ones you never intended to be in. That is a
feedback plan, it is the subject of Chapter 8, and it is the reason `Stationary`
carries a `policy` field.

## Book Exercise 23

> For a planning problem under Formulation 2.3, implement both Dijkstra's
> algorithm and forward value iteration. Verify that these find the same plans.
> Comment on their differences in performance.

You have already written both — Exercise 02 and Exercise 08. To do the comparison
properly:

```cpp
const GridProblem problem = GridProblem::fromAscii(maps::bugTrap());
const Plan viaDijkstra = dijkstra(problem);
const StationaryForward viaValueIteration = forwardValueIterationStationary(problem);

// the numbers agree...
assert(viaValueIteration.C[goal] == viaDijkstra.cost);
// ...but count the work
const long long dijkstraUpdates = viaDijkstra.generated;
const long long vitUpdates = 1LL * problem.numStates() * viaValueIteration.iterations;
```

Then ask the question the exercise is really driving at: is there a problem where
value iteration wins? Try making the state space small and densely connected, so
that Dijkstra's priority queue overhead dominates while value iteration's sweeps
stay cheap. The answer is not always what you expect, and it is the reason both
algorithms are still in use.

## A thing worth noticing about `A*`

Since A* is Dijkstra with `C(x) + Ĝ(x)` as the key, and Dijkstra is value
iteration with a frontier, A* is value iteration with a frontier *and* a hint about
where the goal is. Heuristic search and dynamic programming are not two schools;
they are two ends of one dial. Chapter 8 slides back toward the dynamic programming
end, because a navigation function is worth more than a path when execution is
uncertain.

---

Next: [the logic-based formulation](08-logic-formulation.md). A change of register:
the state space stops being given and starts being *described*.
