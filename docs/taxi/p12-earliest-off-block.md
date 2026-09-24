# Problem 12 — Earliest off-block

## The situation

Problem 11's answer takes 78 minutes because it does one job at a time. A real
ramp does not: the fuel bowser and the catering truck and the cleaners are all
on the aeroplane at once, and the turnaround is as long as the longest *chain*
of jobs, not the sum of all of them.

Two questions follow, and the second is the valuable one.

- When can it push?
- **Which jobs is it worth putting another person on?** Speeding up a job with
  slack in it changes nothing at all, and most jobs have slack.

## Write

```ts
earliestOffBlock(t, crewAvailable?): JobPlan
criticalPath(t): string[]
```

`earliestOffBlock` — the earliest it can push, letting independent jobs run at
the same time. With `crewAvailable` set, no more than that many people are busy
at any minute.

`criticalPath` — the jobs with no slack: delay one by a minute and the whole
thing slips by a minute.

## Examples

**1 — 78 minutes becomes 39.**

```ts
earliestOffBlock(shortTurnaround()).totalMinutes  ->  39
```

**2 — everything starts the moment it can.**

```ts
startOf('CHOCKS ON')    ->  0
startOf('GPU ON')       ->  1
startOf('STEPS ON')     ->  1
startOf('OFFLOAD HOLD') ->  1
startOf('PUSHBACK')     ->  35
```

Three jobs wait on the chocks and all three start together at minute 1.

**3 — what is actually worth speeding up.**

```ts
criticalPath(shortTurnaround())

  contains     -> DISEMBARK, CLEAN CABIN, BOARD, PUSHBACK
  does not     -> REFUEL, GPU ON
```

Refuelling takes twelve minutes, longer than anything except boarding — and
putting a second bowser on it saves **nothing**, because it finishes long before
the doors shut. That is the answer nobody guesses right, and it is why this
problem is worth doing.

## Constraints

- With no crew limit, every job starts the minute its last dependency finishes.
- With a crew limit, `validateJobs(t, plan, crew)` must pass — no minute may
  have more than `crewAvailable` people busy.
- A circular roster refuses exactly as in Problem 11, and `criticalPath`
  returns `[]`.

## Traps

**A job needing more crew than exist is not a scheduling problem.** `CLEAN
CABIN` wants three people. With two on the ramp there is no schedule, and the
answer has to say *staffing*, not shuffle jobs forever looking for one.

**More people is never slower.** The crew-limited answer must be greater than or
equal to the unlimited one, and monotone as the limit rises. A greedy scheduler
that commits to an order early can violate this, which is a good sign it is
committing too early.

**Slack is not "has a gap after it".** A job is on the critical path when its
earliest and latest start are the same. Compute both — forwards for earliest,
backwards from the finish for latest — and compare.

## Edge cases the tests also check

- The winter roster: de-icing joins the critical path and adds exactly 11
  minutes.
- Three, four and six crew, and the answer never gets faster as crew falls.
- Two crew, which is a refusal about staffing.
- An empty turnaround.

## Follow-up

The crew limit turns this from a shortest-path problem into a scheduling one,
and scheduling with a resource limit is NP-hard in general. The answer here is
small enough to brute force; the interesting question is what a real ramp system
does when it is not. Look up list scheduling and its 2 − 1/m bound, then look at
what the bound is worth when the longest job is half the turnaround.

Problems 18 to 20 come back to the turnaround from a completely different
direction: not a list of jobs with an order already worked out, but a
description of what each job *needs* and *leaves*, with the order to be found.
