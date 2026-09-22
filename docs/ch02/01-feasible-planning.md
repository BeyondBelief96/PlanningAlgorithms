# 1. Feasible planning — Section 2.1

> Read alongside book pages 27–33.

## Formulation 2.1

Five pieces, and that is the whole model:

1. A nonempty **state space** `X`, finite or countably infinite.
2. For each `x in X`, a finite **action space** `U(x)`.
3. A **state transition function** `f` producing `x' = f(x, u)`.
4. An **initial state** `x_I in X`.
5. A **goal set** `X_G ⊆ X`.

A *plan* is a finite sequence of actions that carries `x_I` into `X_G`. That is
all "feasible" means here — no cost, no preference, no optimality. Section 2.3
adds those.

In this repo Formulation 2.1 is the abstract class `planning::Problem`:

```cpp
class Problem {
 public:
  virtual int numStates() const = 0;                            // |X|
  virtual State initialState() const = 0;                       // x_I
  virtual bool isGoal(State x) const = 0;                       // x in X_G ?
  virtual std::vector<State> goalStates() const = 0;            // X_G
  virtual std::vector<Transition> successors(State x) const = 0; // U(x), f, l
  virtual std::vector<Transition> predecessors(State x) const = 0; // f^{-1}
};
```

`numStates()` is a small concession to Chapter 2 being finite — value iteration
needs to sweep `X`, and the search methods want an array indexed by state. From
Chapter 5 onward that assumption is gone, but everything else on this interface
survives.

## Why the state space must be chosen carefully

The book's warning is worth quoting: a planning problem about moving a robot in
France "should not encode information about whether certain light bulbs are on in
China." Irrelevant state does not merely waste memory — it multiplies `|X|`, and
it can turn a tractable problem into an intractable one.

The tension is real, though, because `X` also has to be *large enough*. If you
leave out something the plan depends on, the transition function stops being a
function: the same `(x, u)` leads to different outcomes depending on the thing you
did not model.

A concrete instance of this shows up in book Exercise 10. Adding a `Remove`
operator to the flashlight problem requires knowing whether a battery is *blocked*
by another battery — which the three-atom model of Example 2.6 simply cannot say.
The model has to grow before the operator can be written.

## The two standard examples

**Example 2.1, the labyrinth.** A robot on a grid, four actions, walls. `X` is the
set of free cells. This is the running example for everything in Section 2.2, and
it is `planning::GridProblem` here:

```
.......
.S..#..      S is x_I, G is the single goal state,
....#..      # is blocked, . is free
....#.G
.......
```

The shortest plan is 9 actions, although the Manhattan distance is 7 — the wall
costs two extra steps. That gap is exactly what makes the Manhattan distance a
useful *underestimate* in Section 2.2.2.

**Example 2.2, the Rubik's cube.** `|X|` is about 4.3 × 10^19. You cannot write
the graph down, cannot store a visited set, cannot do a breadth-first search. But
`f` is trivial to compute and `X_G` is a single state. This is the example to keep
in mind whenever the implicitness of the representation feels like an
inconvenience: it is the only thing making the problem expressible at all.

## The state transition graph

Formulation 2.1 induces a directed graph: a vertex per state, an edge `x → x'`
whenever some `u` has `f(x, u) = x'`. Planning is then "find a path from `x_I` to
a vertex in `X_G`", which is a solved problem in graph theory.

The catch, and the reason Chapter 2 is 50 pages rather than 5:

> The graph is not the input.

The input is `f`, `U(x)`, `x_I` and `X_G` — a description from which the graph can
be *generated*, one vertex at a time, but which is typically exponentially smaller
than the graph itself. Section 2.4 makes this precise: a STRIPS description with a
handful of predicates can name a state space with billions of states, and the book
connects this to Kolmogorov complexity — the description is a compressed form of
the graph.

Everything in Section 2.2 is therefore about *how much of the graph you can avoid
generating*.

## Systematic search

One definition from Section 2.2 that belongs with the formulation:

> A search algorithm is **systematic** if, when `X` is finite, it visits every
> reachable state and correctly reports failure otherwise; and when `X` is
> infinite, it reaches every reachable state in the limit.

Depth-first search is systematic on a finite `X` but not on an infinite one — it
can charge off in one direction forever. Best-first search is not systematic at
all. Keeping track of which methods are systematic is the difference between "no
plan was found" and "no plan exists."

---

Next: [the search template](02-search-template.md) — one algorithm, five names.
