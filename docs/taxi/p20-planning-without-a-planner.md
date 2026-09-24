# Problem 20 — Planning without a planner

## The situation

A third way at the same turnaround, and the strangest one.

Do not search, and do not build a structure. **Write the problem down as a
Boolean formula**, and hand it to a solver that has never heard of an aeroplane,
a hold door or a ground power unit.

Fix a number of steps K. Give every fact one true/false variable per step, and
every job one per step. Then say, in clauses, what it means for a turnaround to
work. The formula is satisfiable exactly when a K-step turnaround exists, and a
satisfying assignment *is* the plan.

A good deal of industrial planning is still done this way, because forty years
of work has gone into SAT solvers and none of it has to be redone for your
domain.

## Write

```ts
encodeRamp(desc, K): RampEncoding
solveCnf(cnf): boolean[] | undefined
jobsFromAssignment(encoding, assignment): number[]
jobListByFormula(desc, maxK?): JobList
```

The variable layout is **given** — `factVar(encoding, fact, k)` and
`jobVar(encoding, job, k)` — so that a test can look inside your formula.

## The five families of clauses

**1 — how it starts.** Every fact at step 1 is pinned to the value it has on
arrival, *including the false ones*. "Not stated" has to mean "false" and the
formula must say so out loud, or the solver is free to decide the hold arrived
full.

**2 — how it must end.** Each of `mustEndWith`, at step K + 1.

**3 — what a job means.** If job *o* runs at step *k* then everything it needs
holds at *k* and everything it leaves holds at *k* + 1. Distribute the OR over
the AND and you get one two-literal clause per condition.

**4 — nothing changes by itself.** If a fact differs between *k* and *k* + 1,
some job at step *k* must have left it that way. Two clauses per fact per step,
one for each direction of change.

**These are the ones people forget.** A formula without them produces a "plan"
in which the hold door quietly shuts itself, and it looks entirely convincing.
There is a test that drops every job from the formula and checks the door still
cannot open on its own.

**5 — one job at a time.**

## Examples

**1 — the shape of the formula.**

```ts
const encoding = encodeRamp(cargoHold(), 4);   // 3 facts, 4 jobs

  totalVars(encoding)  ->  31     // 5 * 3 facts + 4 * 4 jobs
  factVar(encoding, 0, 1)  ->  1
  jobVar(encoding, 0, 1)   ->  16
```

**2 — and it solves the hold.**

```ts
jobListByFormula(cargoHold())

  ->  ['open the door', 'load ULD1', 'load ULD2', 'shut the door']
```

The same answer as Problem 18, from a completely different direction.

**3 — one step too few is unsatisfiable.**

```ts
solveCnf(encodeRamp(cargoHold(), 3).cnf)  ->  undefined
solveCnf(encodeRamp(cargoHold(), 4).cnf)  ->  an assignment
```

## The solver

Davis–Putnam–Logemann–Loveland, 1962, and still the shape of every serious SAT
solver. Three ideas:

- **unit propagation** — a clause with one unassigned literal left forces it.
  Repeat until nothing more is forced; a clause with every literal false is a
  conflict, and you back out.
- **pure literals** — a variable that only ever appears one way round among the
  still-unsatisfied clauses can be set that way without ever regretting it.
- **branch** — when neither applies, guess, and recurse on both values.

About eighty lines. Modern solvers add clause learning and good branching
heuristics on top of exactly this skeleton.

## The honest limit

You do not know K before you solve the problem, so `jobListByFormula` tries
K = 0, 1, 2, ... and gives up at `maxK`.

That makes this a **complete method for finding** a turnaround and only a
**semi-decision procedure for proving there is none** — when the answer is
"impossible", the outer loop just keeps counting. Say so when you give up. "No
turnaround of 2 steps or fewer" is true; "there is no turnaround" is not
something this method ever gets to say.

## Traps

**Check the assignment.** A solver that returns a plausible-looking assignment
nobody verifies is the easiest thing here to get subtly wrong. `satisfiedBy` is
given; use it in your own testing, not only in the supplied tests.

**The goal may name a negative.** Ground power must end *not* on its own
battery. An encoder that only ever emits positive goal literals solves the hold
and silently mis-solves ground power.

## Edge cases the tests also check

- At most one job runs per step.
- The formula prints as DIMACS, so you can feed it to any other solver.
- Giving up says *how far* it looked.

## Follow-up

Take the DIMACS output and run it through a real solver — MiniSat, CaDiCaL,
whatever is to hand — and time both. Then encode `shortTurnaround()` from
Problem 11 as facts and jobs and watch the formula size grow: clauses go up like
K × facts × jobs, and the interesting engineering question in SAT planning is
entirely about keeping that number down.

*In the book:* LaValle Section 2.5.3, equations (2.33) and (2.34).
