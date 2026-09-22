# 10. Planning as satisfiability — Section 2.5.3

> Read alongside book pages 69–71.
> Exercise: [11, planning as SAT](../../exercises/ch02/ex11_planning_as_sat/README.md)

The last idea in the chapter, and the boldest: do not write a planner at all.
Compile the planning problem into one large Boolean formula and hand it to a
general-purpose SAT solver.

## The setup

Tag every literal and every operator with a stage index. `On(Cap, F)` at stage 1
and `On(Cap, F)` at stage 3 become different Boolean variables. Fix the number of
stages `K`; literals are tagged `1..K+1` and operators `1..K`, with `F = K + 1`.

`SatEncoding` lays out the variables for you:

```cpp
int atomVar(int atom, int k) const;  // "atom is true at stage k",   k in [1, K+1]
int opVar(int op, int k) const;      // "op is applied at stage k",  k in [1, K]
```

Fixing `K` in advance is the method's central weakness, and the book says so
plainly:

> Setting a stage limit is a significant drawback of the approach because this is
> usually not known before the problem is solved. A planning algorithm can assume
> a small value for `F` and then gradually increase it each time the resulting
> Boolean expression is not satisfied. If the problem is not solvable, however,
> this approach iterates forever.

That loop is `planAsSatisfiability()`, and the `maxK` parameter exists precisely
because of the last sentence. Worth pausing on: this is a *complete* method for
finding plans and a *semi-decision* procedure for their non-existence.

## The five families of clauses

The formula is a conjunction of terms from five sources.

**1. Initial state.** Every literal of `S` tagged with stage 1, plus the negation
of every positive literal not in `S`. Unit clauses.

**2. Goal state.** Every literal of `G` tagged with stage `F = K + 1`. Unit clauses.

**3. Operator encodings.** For each operator `o` at each stage `k`, equation (2.33):

```
!o_k  OR  (p_1 AND p_2 AND ... AND p_m  AND  e_1 AND e_2 AND ... AND e_n)
```

Preconditions are read at stage `k`; effects are asserted at stage `k + 1`.
Distributing the OR over the AND gives one binary clause per literal:

```
(!o_k OR p_i@k)      for each precondition
(!o_k OR e_j@k+1)    for each effect
```

**4. Frame axioms.** Equation (2.34), and the part everyone underestimates:

> If a literal `l` becomes negated to `!l`, then an operator that includes `!l` as
> an effect must have been executed.

Two clauses per atom per stage, one for each direction of change:

```
(!a_k OR  a_{k+1} OR  o's at stage k with effect !a)     -- a was true, became false
( a_k OR !a_{k+1} OR  o's at stage k with effect  a)     -- a was false, became true
```

These encode the assumption that Section 2.4 made silently: unmentioned
complementary pairs keep their values. Nothing else in the formula says so.

> **Worth doing once, deliberately.** Comment out the frame axioms and run
> `test_ex11`. The solver will cheerfully produce a "plan" in which the batteries
> teleport into the flashlight with no operator responsible, because nothing
> forbids it. That failure teaches the frame problem faster than any amount of
> reading about it.

**5. Complete exclusion axiom.** At most one operator per stage:

```
(!o_k OR !o'_k)      for every pair o != o'
```

### What is deliberately *not* required

Nothing forces an operator to be applied at every stage. A stage may be empty, in
which case the frame axioms hold the state still. This is intentional: it lets a
`K`-stage formula express any plan of length `≤ K`, which is the same trick `u_T`
played in Section 2.3.2 and the trivial operators played in Section 2.5.2. Third
time in one chapter.

## DPLL

The Davis–Putnam–Logemann–Loveland procedure: a depth-first search over variable
assignments, with backtracking, and two rules that do most of the work.

- **Unit propagation.** A clause with exactly one unassigned literal and no
  satisfied literal forces that literal. Repeat to a fixpoint. A clause with no
  unassigned and no satisfied literal is a conflict — backtrack.
- **Pure literal elimination.** A variable occurring with only one polarity among
  the still-unsatisfied clauses can be assigned that way for free.
- Otherwise branch on an unassigned variable: try true, then false.

> The algorithm is complete and reasonably efficient.

Modern solvers add clause learning, watched literals and restarts, and are
thousands of times faster. The plain version is a page of code and is more than
enough here — the flashlight at `K = 4` has 31 variables and 94 clauses.

The book also mentions stochastic local search (WalkSAT and relatives) as a
practical alternative: much faster on satisfiable instances, but unable to prove
unsatisfiability, which matters because the `K` loop *depends* on proving
unsatisfiability to know it should try a larger `K`.

## What you should see

`logic_demo` prints the whole ladder for the flashlight:

```
K = 0:  3 variables,  6 clauses -> unsatisfiable
K = 1: 10 variables, 28 clauses -> unsatisfiable
K = 2: 17 variables, 50 clauses -> unsatisfiable
K = 3: 24 variables, 72 clauses -> unsatisfiable
K = 4: 31 variables, 94 clauses -> SATISFIABLE
    RemoveCap
    Insert(Battery1)
    Insert(Battery2)
    PlaceCap
```

Equation (2.24), recovered by a SAT solver that knows nothing about planning.

Two observations worth making while you look at it. The formula grows linearly in
`K` here, and the ladder is doing real work — four unsatisfiability proofs before
the answer. And compare this against the planning graph from
[guide 9](09-planning-graphs.md): the graph reached the goal after **three
operator layers**, because it can put both inserts in one layer, while the SAT
encoding's complete exclusion axiom forces one operator per stage and therefore
needs **four stages**. Same
plan, different notion of length. (Dropping the exclusion axiom in favour of a
weaker "no two mutex operators per stage" is how you recover parallel plans — and
is a natural extension exercise.)

## Book Exercise 17, left open

> In the worst case, how many terms are needed for the Boolean expression for
> planning as satisfiability? Express your answer in terms of `|I|`, `|P|`, `|O|`,
> `|S|` and `|G|`.

Count the five families. Let `n` be the number of complementary pairs — which is
itself bounded by `|P| · |I|^k` for arity `k`, the bound Section 2.4.2 gives.

- Initial state: `n` unit clauses.
- Goal: `|G|` unit clauses.
- Operators: `K · |O| · (preconditions + effects)` binary clauses.
- Frame axioms: `2 · K · n` clauses, each up to `|O| + 2` literals long.
- Exclusion: `K · |O| · (|O| - 1) / 2` binary clauses.

The exclusion axiom is quadratic in `|O|` and dominates for operator-rich problems
— which is exactly why it is the first thing real encodings replace.

You can check your arithmetic against the code, since `SatEncoding::totalVars()`
and `cnf.clauses.size()` are both right there.

---

That is Chapter 2. Back to the [chapter index](README.md), which closes with what
to carry into Chapter 3.
