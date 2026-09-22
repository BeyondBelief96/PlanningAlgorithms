# Exercise 11 — Planning as satisfiability

**Book:** Section 2.5.3 · **Guide:** [docs/ch02/10-sat.md](../../../docs/ch02/10-sat.md)

Covers book Exercise 16 (encode the light-switch model as a Boolean satisfiability
problem).

## Implement

```cpp
SatEncoding encodePlanningAsSat(const StripsProblem& problem, int K);
std::optional<std::vector<bool>> dpll(const CnfFormula& formula);
std::vector<int> extractPlan(const SatEncoding&, const std::vector<bool>& assignment);
std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem&, int maxK = 8);
```

The variable numbering is already laid out for you:

```cpp
int atomVar(int atom, int k) const;  // "atom is true at stage k",  k in [1, K+1]
int opVar(int op, int k) const;      // "op is applied at stage k", k in [1, K]
int totalVars() const;
```

Set `cnf.numVars = encoding.totalVars()` and then add clauses. Clauses use the
DIMACS convention: variables numbered from 1, a literal is `+v` or `-v`, a clause
is a disjunction.

## The five families

**1. Initial state.** Every literal of `S` at stage 1, plus the negation of every
positive literal not in `S`. Unit clauses.

**2. Goal state.** Every literal of `G` at stage `F = K + 1`. Unit clauses.

**3. Operator encodings.** Equation (2.33):

```
!o_k  OR  (p_1 AND ... AND p_m  AND  e_1 AND ... AND e_n)
```

Preconditions at stage `k`, effects at stage `k + 1`. Distributing the OR over the
AND gives one binary clause per literal: `(!o_k OR p_i@k)` and
`(!o_k OR e_j@k+1)`.

**4. Frame axioms.** Equation (2.34) — two clauses per atom per stage:

```
(!a_k OR  a_{k+1} OR  ops at stage k with effect !a)    -- a was true, became false
( a_k OR !a_{k+1} OR  ops at stage k with effect  a)    -- a was false, became true
```

These encode the assumption Section 2.4 made silently: unmentioned complementary
pairs keep their values. Nothing else in the formula says so.

> **Do this once, deliberately.** Skip the frame axioms, run the tests, and look
> at the "plan" you get. The solver will happily have the batteries teleport into
> the flashlight with no operator responsible. It is the fastest possible way to
> understand what a frame axiom is for.

**5. Complete exclusion axiom.** At most one operator per stage: `(!o_k OR !o'_k)`
for every pair.

**Note what is deliberately absent.** Nothing forces an operator to be applied at
every stage. An empty stage just means the frame axioms hold the state still, and
that is what lets a `K`-stage formula express any plan of length `<= K`. Same
trick as `u_T` in Exercise 08 and the trivial operators in Exercise 10 — third
time in one chapter.

## DPLL

- **Unit propagation.** A clause with exactly one unassigned literal and no
  satisfied literal forces that literal. Repeat to a fixpoint. A clause with no
  unassigned and no satisfied literal is a conflict.
- **Pure literal elimination.** A variable occurring with only one polarity among
  the still-unsatisfied clauses can be assigned that way for free.
- **Branch.** Pick an unassigned variable, try true, then false.

Recursion with a copied assignment vector is fine at this scale — the flashlight at
`K = 4` has 31 variables and 94 clauses. Return `std::nullopt` for unsatisfiable.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex11 --output-on-failure
```

## What the tests check

- Variable count matches the stage tagging: `3 atoms x 3 stages + 4 ops x 2 stages`
  for the light switch at `K = 2`.
- The light switch is satisfiable at `K = 2` with plan `(MoveToSwitch, FlipOn)`,
  and unsatisfiable at `K = 1` — the robot has to walk to the switch first.
- Neither problem is satisfiable at `K = 0`.
- The flashlight is unsatisfiable at `K = 3` and satisfiable at `K = 4`.
- `planAsSatisfiability` recovers equation (2.24): four operators, `RemoveCap`
  first, `PlaceCap` last, the two inserts in between **in either order** — that
  choice is genuinely free, so the test sorts before comparing.
- The returned assignment actually satisfies the formula
  (`cnf.satisfiedBy(assignment)`), and the extracted plan actually works when
  simulated.
- DPLL handles an empty formula (satisfiable) and `{x} AND {!x}` (not).

## Once it is green

```powershell
./build/vs/Debug/logic_demo.exe
```

You should see the whole ladder — four unsatisfiability proofs, then the answer:

```
K = 0:  3 variables,  6 clauses -> unsatisfiable
K = 1: 10 variables, 28 clauses -> unsatisfiable
K = 2: 17 variables, 50 clauses -> unsatisfiable
K = 3: 24 variables, 72 clauses -> unsatisfiable
K = 4: 31 variables, 94 clauses -> SATISFIABLE
    RemoveCap / Insert(Battery1) / Insert(Battery2) / PlaceCap
```

Equation (2.24), produced by a solver that knows nothing about planning.

Then notice the loop's limitation, which the book flags and which is not a defect
of your code: if the problem has no solution at all, `planAsSatisfiability` never
terminates on its own. That is why `maxK` exists. This is a complete method for
*finding* plans and only a semi-decision procedure for their non-existence.

## Book Exercise 17

> In the worst case, how many terms are needed for the Boolean expression?

Count the five families. `SatEncoding::totalVars()` and `cnf.clauses.size()` let
you check your arithmetic against the code. The punchline is that the exclusion
axiom is quadratic in `|O|` and dominates for operator-rich problems — which is
why it is the first thing real encodings replace. Worked through in
[guide 10](../../../docs/ch02/10-sat.md).
