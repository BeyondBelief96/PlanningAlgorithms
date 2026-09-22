# 4. Backward and bidirectional search — Sections 2.2.3–2.2.4

> Read alongside book pages 39–43, Figures 2.6 and 2.7.
> Exercise: [05, backward and bidirectional](../../exercises/ch02/ex05_backward_bidirectional/README.md)

## Backward search

Figure 2.6 is Figure 2.4 with `f` replaced by `f^{-1}` and the roles of `x_I` and
`X_G` swapped. Start at the goal, walk backward, stop when you reach `x_I`.

The motivation is asymmetry in the branching factor. Many problems fan out
enormously from `x_I` and only narrowly into `X_G` — think of a robot that must end
up in one precise configuration, or the Rubik's cube, whose goal is a single state.
Searching from the narrow end first can be dramatically cheaper.

### The one thing that is genuinely new

Going forward, you apply `u` at `x` and read off `f(x, u)`. Going backward, you
must answer a different question:

> For some `x'`, determine the preceding state `x in X` and action `u in U(x)` such
> that `x' = f(x, u)`.

That is `f^{-1}`, and it is a different computation, not a different spelling of
the same one. Sometimes it is easy (the grid: stepping north is inverted by
stepping south). Sometimes it is expensive. Sometimes it does not exist in usable
form at all — which is why `Problem` makes it a separate virtual method rather than
deriving it, and why `StripsStateSpace::predecessors` in Exercise 09 has to fall
back on brute force.

In this repo, `predecessors(x)` returns Transitions whose `.x` field holds the
*predecessor* `x'` and whose `.cost` is `l(x', u)` — the cost taken at the
originating state, as always. So the backward relaxation reads:

```cpp
for (const Transition& t : problem.predecessors(x))
  candidate = G(x) + t.cost;   // this is a candidate for G(t.x)
```

### What backward Dijkstra computes

Not the cost-to-come. The **cost-to-go** `G(x)`: the least cost to get from `x` to
the goal. This is the same quantity value iteration computes in Section 2.3, and
noticing that now will make Section 2.3.3 much easier.

Book Exercise 6 asks you to (a) develop backward Dijkstra and argue it is optimal,
(b) relate it to backward value iteration, and (c) derive backward A*. Parts (a)
and (c) are Exercise 05 here; part (b) is [guide 7](07-dijkstra-revisited.md).

## Bidirectional search

Figure 2.7 grows two trees, one from `x_I` along `f` and one from `x_G` along
`f^{-1}`, and stops when they touch.

The payoff is geometric. If the shortest plan has `d` actions and the branching
factor is `b`, one wavefront reaches roughly `b^d` states, but two wavefronts of
depth `d/2` reach roughly `2·b^(d/2)`. For `b = 4` and `d = 20` that is the
difference between 10^12 and 10^6.

### One place where the book's pseudocode is worth improving on

Figure 2.7 pops a *single* state from each queue per iteration. That is the
simplest thing to write, and it is what the book presents — but it can return a
plan one action longer than necessary, because the two trees may meet partway
through a level rather than at its boundary.

Expanding one whole wavefront per round — always the smaller of the two — costs
nothing extra and restores breadth-first's "fewest actions" guarantee. That is what
Exercise 05 asks for, and the test insists on it:

```cpp
CHECK_EQ(both.length(), breadthFirstSearch(problem).length());
```

The general version of the difficulty is real, though, and the book is right to
flag it. Book Exercise 20 asks you to study the trade-off between exploring the
state space and the cost of connecting the two trees. With unit costs the
connection is trivial; with a continuous state space (Chapter 5, where RRT-Connect
does exactly this) joining two trees is a subproblem of its own.

## Section 2.2.4: the unified view

The section closes by collapsing all of Section 2.2 into four steps, and it is
worth memorising because Section 5.4 extends *this* list, not any particular
algorithm, to continuous state spaces:

1. **Initialisation.** Build a search graph `G(V, E)` with `E` empty and `V`
   holding the starting states. Forward: `V = {x_I}`. Backward: `V = {x_G}`.
   Bidirectional: `V = {x_I, x_G}`. More trees are allowed.
2. **Select vertex.** Choose some `n_cur in V` to expand — usually by popping a
   priority queue. *This step is where all the algorithms differ.*
3. **Apply an action.** Obtain `x_new`, either as `f(x, u)` going forward or as
   the `x` with `f(x_new, u) = x` going backward.
4. **Insert a directed edge.** If the algorithm-specific tests pass, add the edge.
   (Sometimes the vertex is added without an edge — that starts another tree.)

Then check whether a solution has been found and iterate.

The reason this matters: when you reach Chapter 5, RRTs and PRMs will look like
completely different animals. They are not. They are this template with step 2
replaced by "sample a random configuration and find the nearest vertex" and step 3
replaced by "integrate the system toward it until you hit an obstacle." Getting the
template into your hands now is the point of Exercise 01.

---

Next: [optimal fixed-length plans](05-optimal-fixed-length.md) — the conceptual
centre of the chapter.
