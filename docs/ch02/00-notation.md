# Notation

LaValle's notation is consistent across all 800 pages, so it is worth learning
properly once. This table maps every symbol in Chapter 2 to its name in this repo.

## The model

| Book | Meaning | In code |
|---|---|---|
| `X` | the state space | states are `int` in `[0, problem.numStates())` |
| `x` | a state | `planning::State` |
| `U(x)` | the action space at `x` | the actions listed by `successors(x)` |
| `U` | the union of all `U(x)` | never needed explicitly |
| `u` | an action | `planning::Action` |
| `f(x, u)` | the state transition equation | `Transition::x` from `successors(x)` |
| `f^{-1}` | the backward transition | `predecessors(x)` |
| `x_I` | the initial state | `problem.initialState()` |
| `X_G` | the goal set | `problem.isGoal(x)`, `problem.goalStates()` |
| `π_K` | a K-step plan `(u_1, ..., u_K)` | `Plan::actions` |

A `Transition` means slightly different things in the two directions, and this is
the one place the interface is genuinely asymmetric:

```cpp
for (const Transition& t : problem.successors(x))   // t.x is f(x, t.u)
for (const Transition& t : problem.predecessors(x)) // t.x is the x' with f(x', t.u) == x
```

In both cases `t.cost` is `l` evaluated at the *originating* state — that is,
`l(x, t.u)` going forward and `l(t.x, t.u)` going backward. The book is explicit
about this in the caption to Figure 2.8: "the weights on the edges represent
`l(x_k, u_k)` (`x_k` is the originating vertex of the edge)."

## Costs

| Book | Meaning | In code |
|---|---|---|
| `l(x, u)` | the cost of applying `u` at `x` | `Transition::cost` |
| `l_F(x_F)` | the final-stage cost: 0 on `X_G`, ∞ elsewhere | `problem.finalCost(x)` |
| `L(π_K)` | the total cost of a plan | `Plan::cost` |
| `K` | the number of actions in a plan | `Plan::length()` |
| `F = K + 1` | the final stage index | — |
| `u_T` | the termination action | `planning::kTerminate` |

`l_F` is a trick, and it is worth naming as such. Rather than carrying a
feasibility constraint around, the book gives every plan that misses the goal a
cost of ∞, so that any minimisation automatically discards it. `L(π_K) = ∞` means
infeasible; `L(π_K) < ∞` means feasible at that cost.

## Value functions

| Book | Meaning | In code |
|---|---|---|
| `C(x)` | a cost-to-come, not yet known to be optimal | a local in Dijkstra |
| `C*(x)` | the optimal cost-to-come from `x_I` to `x` | `StationaryForward::C` |
| `C*_k(x)` | the optimal cost-to-come in exactly `k - 1` actions | a row of `forwardValueIteration()` |
| `G(x)` | a cost-to-go | a local in `backwardDijkstra` |
| `G*(x)` | the optimal cost-to-go from `x` to `X_G` | `Stationary::G` |
| `G*_k(x)` | the optimal cost-to-go from stage `k` to `F` | a row of `backwardValueIteration()` |
| `Ĝ(x)` | a heuristic *underestimate* of `G*(x)` | `planning::Heuristic` |

The asterisk always means "optimal", as in the optimisation literature. When the
book writes `C` without one, it is saying "the best we know so far" — and the
whole argument for Dijkstra's correctness is about the moment `C` becomes `C*`.

Two easy confusions, worth getting straight now:

- **`C` is about the past, `G` is about the future.** `C*(x)` is what it cost to
  get to `x`; `G*(x)` is what it will cost to finish from `x`. `C*(x) + G*(x)` is
  the cost of the best plan through `x`.
- **`Ĝ` must not exceed `G*`.** A* stays optimal exactly when the heuristic
  underestimates. `Ĝ = 0` always qualifies, which is why A* with a zero heuristic
  degenerates to Dijkstra.

## Stage indices

The stage subscript trips people up more than anything else in Section 2.3, so:

- A `K`-step plan visits states `x_1, ..., x_{K+1}` and applies `u_1, ..., u_K`.
- `x_1 = x_I`, and `x_{k+1} = f(x_k, u_k)`.
- `F = K + 1` is the final stage.
- Backward value iteration computes `G*_F`, then `G*_K`, then `G*_{K-1}`, down to
  `G*_1`. It runs from high index to low.
- Forward value iteration computes `C*_1`, then `C*_2`, up to `C*_{K+1}`.

In `CostTable` both directions are stored as row 0 first, so:

```
backwardValueIteration(problem, K)   row 0 = G*_F,  row r = G*_{F-r},  row K = G*_1
forwardValueIteration(problem, K)    row 0 = C*_1,  row k = C*_{k+1},  row K = C*_{K+1}
```

That matches the printed order of Figures 2.9 and 2.12, top to bottom, so you can
read your output straight against the page.

For the unspecified-length case (Section 2.3.2) the book shifts the indices so
that stage 0 is where the backward iteration *starts*, and counts downward:
`G*_0 = l_F`, then `G*_{-1}`, `G*_{-2}`, ... until the values stop moving. That is
what `Stationary::history` holds — `history[k]` is `G*_{-k}`. The negative indices
look odd, but they are making a real point: the particular stage number stops
mattering once the values are stationary.

## STRIPS (Section 2.4)

| Book | Meaning | In code |
|---|---|---|
| `I` | instances | `StripsProblem::instances` |
| `P` | predicates | `StripsProblem::predicates` |
| a positive literal | a predicate applied to instances | `Literal` with `positive == true` |
| a complementary pair | a literal together with its negation | one entry of `StripsProblem::atoms` |
| `O` | operators | `StripsProblem::operators` |
| `S` | the initial set (positive literals only) | `StripsProblem::initial` |
| `G` | the goal set (positive and negative) | `StripsProblem::goal` |

A *state* in this representation is one choice of positive-or-negative from every
complementary pair — which is exactly a bit string over `atoms`. That is
`StripsState`, and it is what makes `|X| = 2^|atoms|`.
