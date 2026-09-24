# Problem 09 — From where it actually is

## The situation

Problem 08 built the table. This is what it is for.

The aeroplane is at F1. Nobody planned for it to be at F1 — it was held, or it
took Foxtrot when the plan said Delta, or it simply stopped and nobody wrote
down where. Ground asks what to tell the crew.

The answer has to come back in the time it takes to key the microphone, and it
must not involve a search.

## Write

```ts
nextInstruction(chart, table, at): string
followTable(chart, ac, table, at): TaxiRoute
```

`nextInstruction` — what to say. A taxiway name, `"HOLD POSITION"`, or
`"UNABLE: ..."`.

`followTable` — the whole route the table implies, from anywhere.

## Examples

**1 — an instruction from a point the plan never mentioned.**

```ts
const table = secondsToGo(kilo, a320(), at('HS 27 E'));

nextInstruction(kilo, table, at('F1'))       ->  'B'
nextInstruction(kilo, table, at('A2'))       ->  'D'
nextInstruction(kilo, table, at('STAND 2'))  ->  'STAND 2'
```

One array lookup each.

**2 — already there.**

```ts
nextInstruction(kilo, table, at('HS 27 E'))  ->  'HOLD POSITION'
```

**3 — the wrong side of the closure.**

```ts
nextInstruction(kilo, table, at('P0'))  ->  'UNABLE: ... P0 ...'
```

Name the point. "Unable" without saying from where is not something a controller
can do anything with.

## Constraints

- `followTable` must do **no searching at all**: `expanded` and `generated` come
  back as zero, and a test checks it.
- Following from the goal is a route of no legs, not a refusal.
- A point that is not on the chart gets `UNABLE`, not an exception.

## Traps

**Bound the walk.** A table with a mistake in it — two points pointing at each
other — makes this loop forever. The chart has `numLinks` legs, so that is the
bound, and hitting it is a refusal rather than a hang.

**The answer may differ from Problem 03's, and both are right.** Foxtrot and
Delta both join Alpha to Bravo and both cost exactly 60 s. There are two best
routes out of the apron, and searching forwards from the stand and backwards
from the holding point break that tie differently. The *time* must match. The
route need not.

That is worth knowing before it surprises you: "the optimal route" is usually
"an optimal route".

## Edge cases the tests also check

- Walking the table into a whole route from five different points, and agreeing
  with Problem 03 on the seconds every time.
- Refusing to invent a route from an unreachable point.
- A point that is not on the chart.

## Follow-up

This is replanning, and it costs one array lookup. Now add the thing that makes
it hard: the aeroplane is not *at* a point, it is thirty metres past one, at an
angle, on a curve. The capstone's Exercise 03 is that problem and Exercise 12 is
what to do about it — and the answer is still "read the table", with a merge
onto the guidance line in front of it.
