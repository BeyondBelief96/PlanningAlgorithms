# 0. The vocabulary

Everything in this unit is one problem asked over and over: **an aeroplane is
somewhere, it needs to be somewhere else, what should it do?** The algorithms
differ enormously. The question does not, and neither does the handful of words
used to ask it. This page is that handful.

## The problem

| In the code | What it means on an airport |
|---|---|
| `planning::State` | one place the aeroplane could be |
| `problem.numStates()` | how many such places there are |
| `problem.initialState()` | where it is now |
| `problem.isGoal(x)` | whether `x` will do — holding short, on stand, wherever the clearance ends |
| `problem.goalStates()` | every place that would do |
| `problem.successors(x)` | what it can do from `x`, what each option costs, where each leads |
| `problem.predecessors(x)` | how it could have arrived at `x` |
| `planning::Action` | one of those options — a move, a turn, a job |
| `planning::Plan` | the answer: the places, the moves, and the total |

A state is an `int`. On the surface grid it indexes a square of pavement; on the
taxi graphs it indexes a node; on a turnaround description it is a bit pattern of
which facts are true. Nothing in any algorithm cares which, and that is the
point — you write `dijkstra` once and it plans a taxi, a turnaround and a Rubik's
cube.

## The asymmetry worth learning now

`successors` and `predecessors` both hand back a `Transition`, and it means
something slightly different in each direction. This is the one genuinely
confusing corner of the interface, so it is worth ten seconds now rather than an
hour in Exercise 05.

```cpp
for (const Transition& t : problem.successors(x))   // t.x is where you end up
for (const Transition& t : problem.predecessors(x)) // t.x is where you came from
```

In both cases `t.cost` is the cost of the move **at the place the move starts
from**. Going forward that is `x`; going backward that is `t.x`. Put another way:
a taxiway leg costs what it costs, regardless of which end you are thinking about
it from.

## The two numbers

Two quantities run through the whole unit, and mixing them up is the most common
conceptual error in Section 2.3. One is about the past and one is about the
future.

| | What it answers | Where it lives |
|---|---|---|
| **cost-to-come** | "what did it cost to get here?" | `StationaryForward::C` |
| **cost-to-go** | "what will it cost to finish from here?" | `Stationary::G` |

- cost-to-come is measured from where the aeroplane started; it does not know or
  care where it is going.
- cost-to-go is measured to wherever it is allowed to stop; it does not know or
  care where it started.
- Add them at any place, and you get the cost of the best route **through** that
  place. That sum is what A\* sorts by, and it is why A\* works.

And one estimate:

| `planning::Heuristic` | a *guess* at the cost-to-go, computed cheaply |
|---|---|

The guess must never run high. A guess that never overestimates keeps A\*
optimal; a guess that sometimes overestimates turns A\* into something fast that
occasionally hands you a route three minutes longer than necessary. A guess of
zero always qualifies, which is exactly why A\* with a zero heuristic is Dijkstra.

## Sweeps and budgets

Section 2.3 builds tables, and the rows are the confusing part.

A **budget** of K means the route must use exactly K moves — no more, and no
fewer. That is an odd thing to want for a taxi, and Exercise 06 shows you why:
with a budget of four and a three-move route, the aeroplane has to sit at the
stand burning one. It is a stepping stone, not a destination. Exercise 08 takes
the budget away, and once it is gone the tables are what you actually want.

A **sweep** is one pass over every place on the airport, recomputing each one's
number from its neighbours' numbers.

```
backwardValueIteration(problem, K)   row 0 = the budget fully spent
                                     row r = r moves still to spend
                                     row K = the whole budget available

forwardValueIteration(problem, K)    row 0 = zero moves made
                                     row k = exactly k moves made
```

Both are printed row 0 first, so your output reads down the page in the same
order as the tables in the guides.

For the no-budget case (guide 6), `Stationary::history` holds every sweep in
order: `history[0]` is the starting table, `history[k]` is what it looked like
after `k` sweeps. Once two consecutive sweeps agree, the numbers have settled and
the sweep count stops meaning anything — which is the real content of Section
2.3.2, and the reason the capstone can replan from wherever the aeroplane
actually is rather than from where the plan said it would be.

## Describing a job (guides 8–10)

The last three guides change register. There, a problem is not a map to search;
it is a *description* of a task, and the state space is implied rather than
given.

| In the code | What it means on a turnaround |
|---|---|
| `StripsProblem::instances` | the things involved — containers, the door, the hold |
| `StripsProblem::predicates` | the kinds of fact — `Closed`, `Loaded` |
| `Literal` | one fact, or its negation: `Loaded(ULD1, Hold)` |
| `StripsProblem::atoms` | every fact the model can talk about, in a fixed order |
| `StripsProblem::operators` | the jobs, each with what it needs and what it changes |
| `StripsProblem::initial` | what is true when the aeroplane parks |
| `StripsProblem::goal` | what has to be true before it can leave |

A *state* of the turnaround is one yes-or-no answer for every fact — which is
exactly a bit string over `atoms`. That is `StripsState`, and it is why three
facts make eight states, ten facts make a thousand, and thirty facts make a
billion from a description that is barely longer.

---

## In the book

This page is LaValle's notation, renamed. If you are reading along, the
correspondence is exact:

| Book | Here |
|---|---|
| `X`, the state space | states are `int` in `[0, numStates())` |
| `x`, a state | `planning::State` |
| `U(x)`, the action space at `x` | the options listed by `successors(x)` |
| `u`, an action | `planning::Action` |
| `f(x, u)`, the state transition equation | `Transition::x` from `successors(x)` |
| `f^{-1}`, the backward transition | `predecessors(x)` |
| `x_I`, the initial state | `problem.initialState()` |
| `X_G`, the goal set | `problem.isGoal(x)`, `problem.goalStates()` |
| `π_K`, a K-step plan | `Plan::actions` |
| `l(x, u)`, the cost term | `Transition::cost` |
| `l_F(x_F)`, the final-stage cost | `problem.finalCost(x)` |
| `L(π_K)`, the total plan cost | `Plan::cost` |
| `K`, the number of actions | `Plan::length()` |
| `F = K + 1`, the final stage | — |
| `u_T`, the termination action | `planning::kTerminate` |
| `C(x)`, a cost-to-come | a local in Dijkstra |
| `C*(x)`, the optimal cost-to-come | `StationaryForward::C` |
| `C*_k(x)` | a row of `forwardValueIteration()` |
| `G(x)`, a cost-to-go | a local in `backwardDijkstra` |
| `G*(x)`, the optimal cost-to-go | `Stationary::G` |
| `G*_k(x)` | a row of `backwardValueIteration()` |
| `Ĝ(x)`, the heuristic underestimate | `planning::Heuristic` |
| `I`, `P`, `O`, `S`, `G` (STRIPS) | the `StripsProblem` fields above |

The asterisk always means "optimal", as it does throughout the optimisation
literature. When the book writes `C` without one it means "the best we know so
far", and the entire correctness argument for Dijkstra is about the moment `C`
becomes `C*`.

Two conventions to note. The book's caption to Figure 2.8 is explicit that edge
weights are `l(x_k, u_k)` with `x_k` the *originating* vertex — that is the
asymmetry described above. And the book's backward tables run from high stage
index down to low, writing `G*_F`, `G*_K`, …, `G*_1`, then continuing into
negative indices `G*_0`, `G*_{-1}`, … once the budget is removed. The negative
numbers look odd and are making a real point: once the values settle, the
particular stage number has stopped mattering.

```
backwardValueIteration(problem, K)   row 0 = G*_F,  row r = G*_{F-r},  row K = G*_1
forwardValueIteration(problem, K)    row 0 = C*_1,  row k = C*_{k+1},  row K = C*_{K+1}
Stationary::history                  history[k] = G*_{-k}
```

That matches the printed order of Figures 2.9 and 2.12 top to bottom, so you can
hold your output against the page.

---

Next: [a route at all](01-feasible-planning.md).
