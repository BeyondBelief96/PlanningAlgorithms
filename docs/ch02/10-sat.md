# 10. Planning without a planner

> Exercise: [11, planning as satisfiability](../../exercises/ch02/ex11_planning_as_sat/README.md)

The last idea in the unit, and the boldest: do not write a planner at all.
Translate the turnaround into one large true-or-false formula and hand it to a
solver that has never heard of an aeroplane.

## The setup

Tag every fact and every job with a step number. "The door is shut at step 1" and
"the door is shut at step 3" become different variables. Fix the number of steps
K; facts are tagged 1 through K+1, jobs 1 through K.

`SatEncoding` lays the variables out for you:

```cpp
int atomVar(int atom, int k) const;  // "this fact holds at step k",  k in [1, K+1]
int opVar(int op, int k) const;      // "this job runs at step k",    k in [1, K]
```

Having to fix K in advance is the method's central weakness, and it is worth being
blunt about it:

> Setting a step limit is a significant drawback, because this is usually not
> known before the problem is solved. A planner can assume a small limit and
> increase it each time the formula comes back unsatisfiable. If the problem is
> not solvable, however, this approach iterates forever.

That loop is `planAsSatisfiability()`, and its `maxK` parameter exists precisely
because of the last sentence. Pause on what that means: this is a *complete*
method for finding plans and only a *semi-decision* procedure for proving there
is none. It will always eventually tell you a turnaround is possible. It will
never tell you one is impossible.

That is a real property to know about a tool before you put it in a pipeline that
is supposed to refuse.

## The six things the formula has to say

**1. How things start.** Every fact true on arrival, tagged step 1, plus the
negation of every positive fact not listed. One-literal clauses.

**2. How things must end.** Every goal fact, tagged step K+1. One-literal
clauses.

**3. A job only runs if it can.** For each job at each step:

```
NOT (job runs at k)  OR  (all its preconditions hold at k
                          AND all its effects hold at k+1)
```

Distributing gives one two-literal clause per fact involved:

```
(NOT job@k  OR  precondition@k)     for each precondition
(NOT job@k  OR  effect@k+1)         for each effect
```

**4. Nothing changes by itself.** The part everyone underestimates:

> If a fact changes, then a job with that change as an effect must have run.

Two clauses per fact per step, one for each direction:

```
(NOT fact@k  OR  fact@k+1  OR  jobs at step k whose effect makes it false)
(fact@k      OR  NOT fact@k+1  OR  jobs at step k whose effect makes it true)
```

These encode the assumption guide 8 made silently, that a job changes only what
it names. Nothing else in the formula says so, and the solver will exploit the
omission instantly.

> **Worth doing once, deliberately.** Comment these out and run `test_ex11`. The
> solver will cheerfully produce a "plan" in which the containers teleport into
> the hold with no loader responsible and the door shuts itself, because nothing
> forbids it. Five minutes of that teaches the frame problem better than any
> amount of reading about it — and it is the same class of bug as a route planner
> that lets an aeroplane change taxiway without traversing the junction.

**5. One job at a time.** For every pair of distinct jobs at the same step:

```
(NOT job@k  OR  NOT otherjob@k)
```

**6. Nothing at all is also allowed.** This one is a *non*-requirement, and it is
deliberate: no clause forces a job to run at every step. A step may be empty, in
which case rule 4 holds everything still.

That is what lets a K-step formula express any plan of length at most K — the
same trick the stop option played in guide 6 and the do-nothing jobs played in
guide 9. Third time in one unit, and by now you should be expecting it.

## Solving it

DPLL: a depth-first search over assignments, with backtracking, and two rules
that do most of the work.

- **Unit propagation.** A clause with exactly one unassigned literal and nothing
  already satisfying it forces that literal. Repeat to a fixpoint. A clause with
  nothing unassigned and nothing satisfied is a contradiction — backtrack.
- **Pure literal elimination.** A variable that appears with only one polarity
  among the still-unsatisfied clauses can be set that way for free.
- Otherwise pick an unassigned variable and try both values.

Modern solvers add clause learning, watched literals and restarts, and are
thousands of times faster. The plain version is a page of code and is more than
enough here — the hold at K = 4 has 31 variables and 94 clauses.

Stochastic local search is the practical alternative: much faster on satisfiable
instances, and unable to prove unsatisfiability — which matters, because the loop
over K *depends* on proving unsatisfiability to know it should try a larger one.

## What you should see

```powershell
./build/vs/Debug/turnaround_demo.exe
```

```
K = 0:  3 variables,  6 clauses -> unsatisfiable
K = 1: 10 variables, 28 clauses -> unsatisfiable
K = 2: 17 variables, 50 clauses -> unsatisfiable
K = 3: 24 variables, 72 clauses -> unsatisfiable
K = 4: 31 variables, 94 clauses -> SATISFIABLE
    OpenDoor
    Load(ULD1)
    Load(ULD2)
    CloseDoor
```

Open the door, load both containers, shut it — recovered by a solver that knows
nothing about holds, containers or doors.

Two things worth noticing while you look at it. The formula grows linearly in K
here, and the ladder is doing real work: four unsatisfiability proofs before the
answer.

And compare it against [guide 9](09-planning-graphs.md). The planning graph
finished after **three rounds**, because it can put both loads in one round. The
formula needs **four steps**, because rule 5 forces one job at a time. Same plan,
different notion of length — and the difference is precisely "may these two run
in parallel", which for a turnaround is the question that decides whether the
aircraft departs on time.

Replacing rule 5 with the weaker "no two *conflicting* jobs per step" is how you
recover parallel plans, and is a natural extension.

## An open exercise

> In the worst case, how many terms does the formula need? Express it in terms of
> the number of instances, predicates, jobs, and the sizes of the start and goal
> sets.

Count the six families. Let `n` be the number of complementary pairs, itself
bounded by `predicates × instances^arity`.

- Start: `n` one-literal clauses.
- Goal: one per goal fact.
- Jobs: `K × jobs × (preconditions + effects)` two-literal clauses.
- Nothing-changes-by-itself: `2 × K × n` clauses, each up to `jobs + 2` literals.
- One-at-a-time: `K × jobs × (jobs - 1) / 2` two-literal clauses.

The last is quadratic in the number of jobs and dominates for anything
job-rich — which is exactly why it is the first thing real encodings replace. A
turnaround with forty jobs spends most of its formula saying that no two of them
happen at once, which is both enormous and false.

You can check your arithmetic against the code, since `SatEncoding::totalVars()`
and `cnf.clauses.size()` are both right there.

---

## In the book

LaValle Section 2.5.3, pages 69–71. The step tagging runs literals `1..K+1` and
operators `1..K` with `F = K + 1`; the quoted passage about the stage limit is the
book's. Rule 3 is equation (2.33) and rule 4 is (2.34), the frame axioms; rule 5
is the complete exclusion axiom. The quoted frame-axiom sentence is the book's.

DPLL is Davis–Putnam–Logemann–Loveland, described there as "complete and
reasonably efficient"; WalkSAT and relatives are the stochastic local search
alternative the book mentions. The worked ladder is the flashlight of Example
2.6 — here the hold, relabelled as in [guide 8](08-logic-formulation.md) — and
the four-job answer is equation (2.24). The counting exercise is book
Exercise 17; book Exercise 16 is the light switch's encoding, which is
`groundPowerProblem()` here and is what most of `test_ex11` runs on.

---

That is the end of the unit. Back to the [index](README.md), which closes with
what carries into the capstone.
