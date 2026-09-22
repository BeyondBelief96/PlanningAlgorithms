# Chapter 2 — Discrete Planning

Chapter 2 is the entry point to the whole book. The state spaces are finite, there
is no uncertainty, no geometry and no differential equations — which means the
ideas show up in their simplest possible form. Almost everything here comes back
later: the search template of Section 2.2 becomes the skeleton of the
sampling-based motion planners in Chapter 5, and the value iteration of Section 2.3
becomes the backbone of Chapters 8, 10 and beyond.

The chapter has three movements:

| Sections | Idea | Exercises |
|---|---|---|
| 2.1–2.2 | Feasible planning: reach the goal at all | 01–05 |
| 2.3 | Optimal planning: reach it cheaply, via dynamic programming | 06–08 |
| 2.4–2.5 | Logic-based representations, and planning on top of them | 09–11 |

Sections 2.4 and 2.5 are not needed for anything later in the book. They are worth
doing anyway — the planning graph and the SAT encoding are both beautiful, and
they are what most people mean by "AI planning."

## The guides

Read these in order. Each one corresponds to a section of the book and names the
exercise that goes with it.

| | Guide | Book | Exercise |
|---|---|---|---|
| 0 | [Notation](00-notation.md) — the symbols, and their names in the code | — | — |
| 1 | [Feasible planning](01-feasible-planning.md) | 2.1 | — |
| 2 | [The search template](02-search-template.md) | 2.2.1 | [01](../../exercises/ch02/ex01_forward_search/README.md) |
| 3 | [Particular search methods](03-search-methods.md) | 2.2.2 | [02](../../exercises/ch02/ex02_dijkstra/README.md), [03](../../exercises/ch02/ex03_astar/README.md), [04](../../exercises/ch02/ex04_iterative_deepening/README.md) |
| 4 | [Backward and bidirectional](04-backward-bidirectional.md) | 2.2.3–2.2.4 | [05](../../exercises/ch02/ex05_backward_bidirectional/README.md) |
| 5 | [Optimal fixed-length plans](05-optimal-fixed-length.md) | 2.3.1 | [06](../../exercises/ch02/ex06_backward_value_iteration/README.md), [07](../../exercises/ch02/ex07_forward_value_iteration/README.md) |
| 6 | [Plans of unspecified length](06-unspecified-length.md) | 2.3.2 | [08](../../exercises/ch02/ex08_stationary_value_iteration/README.md) |
| 7 | [Dijkstra revisited](07-dijkstra-revisited.md) | 2.3.3 | — |
| 8 | [Logic-based formulation](08-logic-formulation.md) | 2.4 | [09](../../exercises/ch02/ex09_strips_state_space/README.md) |
| 9 | [Planning graphs](09-planning-graphs.md) | 2.5.1–2.5.2 | [10](../../exercises/ch02/ex10_planning_graph/README.md) |
| 10 | [Planning as satisfiability](10-sat.md) | 2.5.3 | [11](../../exercises/ch02/ex11_planning_as_sat/README.md) |

## Suggested pace

Four sittings, roughly.

**Sitting 1 — the template (guides 0–2, exercise 01).**
The payoff is realising that breadth-first and depth-first are the *same program*
with a different queue. Get that, and the next three exercises are variations.

**Sitting 2 — the search family (guides 3–4, exercises 02–05).**
Dijkstra, then A*, then best-first, then iterative deepening, then the backward
and bidirectional templates. Each is a small delta on the one before. Run
`grid_demo` at the end of this sitting and look at the expanded/generated columns;
that comparison *is* book Exercises 18–21.

**Sitting 3 — dynamic programming (guides 5–7, exercises 06–08).**
The conceptual centre of the chapter, and the part most worth slowing down for.
The tests check your tables against Figures 2.9, 2.12, 2.14 and 2.15 cell by cell,
so you will know immediately whether you have the recurrence right. Finish with
guide 7, which explains why Dijkstra and value iteration are the same algorithm
seen from two angles.

**Sitting 4 — logic (guides 8–10, exercises 09–11).**
A change of register. The planning problem stops being a graph you search and
becomes a description you compile — into a state space (09), into a reachability
approximation (10), or into a Boolean formula (11).

## The worked examples, and where they live in code

Everything the book draws a figure for is available as a fixture.

**Figure 2.8 / Example 2.3** — `planning::figure2_8()` in `include/planning/graphs.hpp`.
Five states, x_I = a, X_G = {d}:

```
        a -> a  cost 2       c -> d  cost 1
        a -> b  cost 2       c -> a  cost 1
        b -> c  cost 1       d -> c  cost 1
        b -> d  cost 4       d -> e  cost 1
```

`e` has no outgoing edges, which is why `d` is unreachable from it and every table
in the chapter shows `inf` in the `e` column.

**Figure 2.21** — `planning::figure2_21()`, the graph for book Exercise 1.
x_I = a, X_G = {e}:

```
        a -> b  cost 2       c -> d  cost 3       d -> c  cost 1
        b -> a  cost 1       c -> e  cost 7       d -> d  cost 1
        b -> c  cost 4                            d -> e  cost 1
```

The optimal plan is a → b → c → d → e at 10, beating the shorter-looking
a → b → c → e at 13.

**Example 2.1, the labyrinth** — `planning::GridProblem` and three maps in
`planning::maps`: `tiny()`, `bugTrap()` and `openRoom()`. They exist to make
different algorithms look different: `tiny` for quick checks, `bugTrap` to punish
greedy search, `openRoom` to show what a good heuristic buys you.

**Example 2.6, the flashlight** — `planning::flashlightProblem()`.
Used for Exercises 09, 10 and 11, and it reproduces Figure 2.20 exactly.

**Book Exercise 14, the light switch** — `planning::lightSwitchProblem()`.
A second STRIPS model, small enough to trace by hand.

## Book exercises covered here

The written exercises (1–17) are pencil-and-paper; the implementation exercises
(18–24) are what this repo is built around.

| Book exercise | Where |
|---|---|
| 1 (value iteration on Figure 2.21) | `test_ex08`, `book_exercise_1_on_figure_2_21` |
| 2 (a 2D worst case for best-first) | open, see [guide 3](03-search-methods.md) |
| 3–5 (generalising the cost functional) | open, see [guide 5](05-optimal-fixed-length.md) |
| 6 (backward Dijkstra and A*) | Exercise 05 |
| 7–8 (search over the STRIPS representation) | Exercise 09 |
| 9–13 (extending Formulation 2.4) | open, see [guide 8](08-logic-formulation.md) |
| 14 (the light-switch model) | `lightSwitchProblem()` |
| 15 (its planning graph) | `test_ex10` |
| 16 (its SAT encoding) | `test_ex11` |
| 17 (size of the Boolean expression) | open, see [guide 10](10-sat.md) |
| 18–21 (comparing search methods) | `grid_demo` |
| 22 (backward value iteration) | Exercise 06 |
| 23 (Dijkstra vs forward value iteration) | Exercise 07, [guide 7](07-dijkstra-revisited.md) |
| 24 (multi-resolution search) | open |

## What to carry into the capstone

If you want to see these ideas carry weight, the
[capstone](../capstone/README.md) is twelve exercises building an autonomous taxi
planner for an airport surface. Exercise 06 there is Dijkstra run backwards over
a product state space; Exercise 09 is your A* from Exercise 03 with poses instead
of integers. What is new is everything around them: a planner that is allowed to
be wrong about the route and never about which piece of concrete it is on.

## What to carry into Chapter 3

Three things.

1. **The graph is never the input.** You are always handed `f`, `U(x)` and a way
   to test membership in `X_G`. Chapter 5 will hand you a collision checker
   instead, and the same template will still run.
2. **The priority function is the algorithm.** Breadth-first, depth-first,
   Dijkstra, A* and best-first differ in one line. When you meet RRTs and PRMs,
   ask what their priority function is.
3. **Backward is not merely forward reversed.** It needs `f^{-1}`, which may be
   expensive or undefined, and it computes cost-to-go rather than cost-to-come.
   Chapter 8 turns the cost-to-go function into a feedback plan — a function over
   the state space rather than a path through it — and that is the single biggest
   idea Chapter 2 sets up.
