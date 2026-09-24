# Problem 11 — Before pushback

## The situation

An aeroplane blocks a stand for forty minutes and taxis for eight. Problems 01
to 10 were about the eight.

The forty is a different shape of problem, and nothing in it has coordinates.
There is a list of jobs. Each needs certain other jobs finished first, takes a
certain number of minutes, and occupies a certain number of ground crew. Nobody
writes the state space down: fifteen yes-or-no facts about a turnaround is
32,768 states, for an aircraft type that will be retired before you finish
drawing it.

## Write

```ts
pushbackOrder(t: Turnaround): JobPlan
```

An order the ground crew could work to, **one job at a time**. Not the fastest
order — the one that exists.

## Examples

**1 — an order that works.**

```ts
pushbackOrder(shortTurnaround())

  order[0]    -> 'CHOCKS ON'
  order.last  -> 'PUSHBACK'
  order.length -> 12
```

**2 — and it takes 78 minutes.**

```ts
plan.totalMinutes  ->  78
```

Which is a terrible answer, and correct. One job at a time is not how a ramp
works, and Problem 12 is the fix. It is worth seeing the 78 first so that the
39 means something.

**3 — a roster somebody wrote down wrong.**

```ts
pushbackOrder(circularTurnaround())

  -> refused, naming REFUEL and CATERING
```

The fuelling waits for the catering and the catering waits for the fuelling.
The answer has to **name the jobs in the loop**, because the fix is to go and
edit the roster and nobody can do that from "no valid order exists".

## Constraints

- Every job appears exactly once.
- No job starts before everything it waits for has finished.
- `startMinutes[i]` is when `order[i]` starts, in minutes after on-blocks.
- `totalMinutes` is when the last job finishes.

## Traps

**Naming the loop, not just detecting it.** Detecting a cycle is four lines.
Saying which jobs are in it is the part that makes the answer useful, and it is
the part the test checks.

**A job that waits for something that does not exist.** That is a typo in the
roster, and it is a different message from a loop.

**An empty turnaround is a plan of no jobs**, not a refusal. Nothing to do is a
valid state of the world.

## Edge cases the tests also check

- The winter roster, where de-icing appears late and has to land before the push.
- A roster naming a job that is not in the list.
- An empty turnaround.

## Follow-up

This is a topological sort, and there are usually many valid answers. Which one
you get depends on the order you take jobs off the ready list — and *that* is
the same "which one comes out of the container next" question that separated
breadth first from depth first in Problems 01 and 13. Take the ready job with
the longest tail first and you have most of Problem 12 already.
