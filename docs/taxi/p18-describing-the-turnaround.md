# Problem 18 — Describing the turnaround instead of drawing it

## The situation

Problems 11 and 12 scheduled a turnaround whose jobs came with a precedence
order already written down: this before that, so many minutes, so many crew.
That works because somebody had done the hard part.

This is the case where nobody has.

You are given the **facts** — is the hold door shut, is ULD1 loaded, is the
aeroplane on its own battery — and the **jobs**, each of which needs certain
facts to hold and leaves certain facts changed. The order is not given. Finding
one is the problem.

Why describe rather than draw: three facts is eight states, ten facts about a
real turnaround is a thousand, thirty is a billion. The description stays four
lines long while the thing it names does not.

## The two descriptions

**`cargoHold()`** — two containers to go in, and the door has to end shut.

```
  facts:     the hold door is shut, ULD1 is loaded, ULD2 is loaded
  jobs:      shut the door, open the door, load ULD1, load ULD2
  arrival:   the door is shut
  must end:  the door is shut AND both containers are loaded
```

**`groundPower()`** — somebody has to walk to the panel before they can connect
the ground power unit.

```
  facts:     the crew is at the panel, the GPU is connected,
             the aeroplane is on its own battery
  arrival:   on its own battery
  must end:  the GPU is connected AND it is NOT on its own battery
```

Note that the second goal names a fact that must be **false**. That difference
matters in Problem 20.

## Write

```ts
jobIsPossible(desc, state, job): boolean
afterJob(desc, state, job): RampState
turnaroundIsDone(desc, state): boolean
shortestJobList(desc): JobList
```

A `RampState` is one yes-or-no answer per fact, packed into the bits of a
number. Read as an integer, that is a point in a graph every search from
Problems 01 to 17 already knows how to walk.

## Examples

**1 — which jobs can be started.**

```ts
const start = arrivalState(cargoHold());   // door shut, nothing loaded

jobIsPossible(hold, start, 'open the door')  ->  true
jobIsPossible(hold, start, 'load ULD1')      ->  false   // needs the door open
jobIsPossible(hold, start, 'shut the door')  ->  false   // already shut
```

**2 — everything the job does not mention stays as it was.**

```ts
const open   = afterJob(hold, start, 'open the door');
const loaded = afterJob(hold, open,  'load ULD1');

  the hold door is shut  ->  false   // still open
  ULD1 is loaded         ->  true
  ULD2 is loaded         ->  false
```

That single sentence is the whole trick of this representation. A job says what
it changes, not what the world looks like afterwards.

**3 — and the answer opens the door first.**

```ts
shortestJobList(cargoHold())

  ->  ['open the door', 'load ULD1', 'load ULD2', 'shut the door']
```

The aeroplane arrives with the hold door **shut**, and the door must **end**
shut. The only working plan begins by opening it — a step that moves *away* from
the goal.

A planner that only ever takes steps which look like progress never solves this.
That is the entire reason this example is in the book, and it is why "search"
and "hill climbing" are different words.

**4 — ground power.**

```ts
shortestJobList(groundPower())  ->  ['walk to the panel', 'connect the GPU']
```

## Constraints

- "Must end with" names a **set** of states, not one state: any fact it does not
  mention may go either way. The crew may stand where they like.
- Fewest jobs is the right thing to want. Every job occupies the ramp.
- A description whose arrival state already satisfies the goal needs no jobs at
  all — an empty list is a real answer, not a refusal.

## Traps

**A need may be negative.** "The hold door is *not* shut" is a precondition.
Compare against `need.holds`, not against truth.

**A refusal here is about the description.** If no sequence of these jobs makes
the aeroplane ready, the roster is wrong, not the ramp. Say so.

## Edge cases the tests also check

- The state space is eight states for a four-line description, and the search
  touches a fraction of it.
- A description with a job removed, which becomes unsatisfiable.
- A job index that is not a job.

## Follow-up

Every search you have written now runs on a turnaround unchanged, because they
were written against an interface rather than against a map. Try Problem 14's
bidirectional search on `cargoHold()`. Then try to write `predecessors` for a
state — *"which states could have led here"* — and notice that regression
through effects is much fiddlier than progression through preconditions. That
asymmetry is why backward planning over STRIPS is its own research area.

*In the book:* LaValle Section 2.4, Formulation 2.4, and Section 2.4.2. The
cargo hold is Example 2.6 — the flashlight — relabelled fact for fact; ground
power is book Exercise 14, the light switch.
