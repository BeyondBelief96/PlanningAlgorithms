# Exercise 11 — Planning without a planner

**Guide:** [Planning without a planner](../../../docs/ch02/10-sat.md)

Translate the turnaround into one large true-or-false formula, and hand it to a
solver that has never heard of an aeroplane.

## Implement

```cpp
SatEncoding encodePlanningAsSat(const StripsProblem& problem, int K);
std::optional<std::vector<bool>> dpll(const CnfFormula& formula);
std::vector<int> extractPlan(const SatEncoding&, const std::vector<bool>& assignment);
std::optional<std::vector<int>> planAsSatisfiability(const StripsProblem&, int maxK = 8);
```

The variable numbering is already laid out for you:

```cpp
int atomVar(int atom, int k) const;  // "this fact holds at step k",  k in [1, K+1]
int opVar(int op, int k) const;      // "this job runs at step k",    k in [1, K]
int totalVars() const;
```

Set `cnf.numVars = encoding.totalVars()` and then add clauses. Clauses use the
DIMACS convention: variables numbered from 1, a literal is `+v` or `-v`, a clause
is a disjunction.

## The five families

**1. How things start.** Every fact true on arrival, at step 1, plus the negation
of every positive fact not listed. One-literal clauses.

**2. How things must end.** Every goal fact, at step `K + 1`. One-literal clauses.

**3. A job only runs if it can.**

```
NOT job@k  OR  (all preconditions hold at k  AND  all effects hold at k+1)
```

Distributing gives one two-literal clause per fact: `(NOT job@k OR pre@k)` and
`(NOT job@k OR eff@k+1)`.

**4. Nothing changes by itself.** Two clauses per fact per step:

```
(NOT fact@k  OR  fact@k+1  OR  jobs at k whose effect makes it false)
(fact@k      OR  NOT fact@k+1  OR  jobs at k whose effect makes it true)
```

These encode the assumption Exercise 09 made silently — that a job changes only
what it names. Nothing else in the formula says so.

> **Do this once, deliberately.** Skip these, run the tests, and look at the
> "plan" you get. The solver will happily have the containers teleport into the
> hold with no loader responsible and the door shut itself. Five minutes of that
> teaches what a frame axiom is for better than any amount of reading — and it is
> the same class of bug as a route planner that lets an aeroplane change taxiway
> without traversing the junction.

**5. One job at a time.** `(NOT job@k OR NOT otherjob@k)` for every pair.

**Note what is deliberately absent.** Nothing forces a job to run at every step.
An empty step just means family 4 holds everything still, and that is what lets a
K-step formula express any plan of length at most K. Same trick as the stop
option in Exercise 08 and the do-nothing jobs in Exercise 10 — third time, and by
now you should be expecting it.

## DPLL

- **Unit propagation.** A clause with exactly one unassigned literal and nothing
  already satisfying it forces that literal. Repeat to a fixpoint. A clause with
  nothing unassigned and nothing satisfied is a contradiction.
- **Pure literal elimination.** A variable appearing with only one polarity among
  the still-unsatisfied clauses can be set that way for free.
- **Branch.** Pick an unassigned variable, try true, then false.

Recursion with a copied assignment vector is fine at this scale — the hold at
K = 4 has 31 variables and 94 clauses. Return `std::nullopt` for unsatisfiable.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex11 --output-on-failure
```

## What the tests check

- Variable count matches the step tagging: `3 facts × 3 steps + 4 jobs × 2 steps`
  for ground power at K = 2.
- Ground power is satisfiable at K = 2 with `(WalkToPanel, ConnectGpu)`, and
  **unsatisfiable at K = 1** — somebody has to walk to the panel before they can
  connect anything, and the formula is unsatisfiable rather than approximately
  satisfiable. A SAT encoding cannot fudge a precondition.
- Neither problem is satisfiable at K = 0.
- The hold is unsatisfiable at K = 3 and satisfiable at K = 4.
- `planAsSatisfiability` recovers the four jobs: open the door first, shut it
  last, the two loads in between **in either order** — that choice is genuinely
  free, so the test sorts before comparing, and so should a ramp agent reading
  the plan.
- The returned assignment actually satisfies the formula
  (`cnf.satisfiedBy(assignment)`), and the extracted plan actually works when
  simulated.
- DPLL handles an empty formula (satisfiable) and `{x} AND {NOT x}` (not).

## Once it is green

```powershell
./build/vs/Debug/turnaround_demo.exe
```

```
K = 0:  3 variables,  6 clauses -> unsatisfiable
K = 1: 10 variables, 28 clauses -> unsatisfiable
K = 2: 17 variables, 50 clauses -> unsatisfiable
K = 3: 24 variables, 72 clauses -> unsatisfiable
K = 4: 31 variables, 94 clauses -> SATISFIABLE
    OpenDoor / Load(ULD1) / Load(ULD2) / CloseDoor
```

Four unsatisfiability proofs, then the answer — produced by a solver that knows
nothing about holds, containers or doors.

Two things to notice while you look at it.

**Compare against Exercise 10.** The planning graph finished after **three
rounds**, because it can put both loads in one. This needs **four steps**, because
family 5 forces one job at a time. Same plan, different notion of length — and the
difference is precisely "may these two run in parallel", which for a turnaround is
the question that decides whether the aircraft departs on time. Replacing family 5
with "no two *conflicting* jobs per step" is how you recover parallel plans.

**And notice the loop's limitation**, which is not a defect of your code: if the
turnaround has no solution at all, `planAsSatisfiability` never terminates on its
own. That is why `maxK` exists. This is a *complete* method for finding plans and
only a *semi-decision* procedure for proving there is none — it will always
eventually tell you a turnaround is possible, and it will never tell you one is
impossible.

That is a real property to know about a tool before you put it in a pipeline that
is supposed to refuse.

## An open exercise

> In the worst case, how many terms does the formula need?

Count the five families. `SatEncoding::totalVars()` and `cnf.clauses.size()` let
you check your arithmetic against the code. The punchline: family 5 is quadratic
in the number of jobs and dominates for anything job-rich, which is why it is the
first thing real encodings replace. A turnaround with forty jobs spends most of
its formula saying that no two of them happen at once — which is both enormous and
false. Worked through in [the guide](../../../docs/ch02/10-sat.md).

---

**In the book:** LaValle Section 2.5.3, and this covers book Exercise 16
(encoding the light-switch model — here `groundPowerProblem()`). Family 3 is
equation (2.33), family 4 is (2.34), the frame axioms, and family 5 is the
complete exclusion axiom. The worked ladder is the flashlight of Example 2.6 —
here the hold, relabelled fact for fact — and the four-job answer is equation
(2.24). DPLL is Davis–Putnam–Logemann–Loveland. The counting question is book
Exercise 17.
