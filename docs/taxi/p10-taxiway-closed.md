# Problem 10 — Bravo is closed

## The situation

A NOTAM arrives at 0600: taxiway Bravo closed for resurfacing until further
notice.

Somebody has to answer, before the first bank of departures, *"what does that
cost us?"*. Not "is there still a route" — there usually is — but how much
longer, for which aeroplanes, and which of them can no longer go at all.

## Write

```ts
withTaxiwayClosed(chart, taxiway): Chart
closureCost(chart, ac, from, to, taxiway): Disruption
```

```ts
interface Disruption {
  before: TaxiRoute;
  after: TaxiRoute;
  delaySeconds: number;  // UNREACHABLE when there is no route at all
}
```

## Examples

**1 — closing Delta costs an A320 nothing.**

```ts
closureCost(kilo, a320(), at('STAND 2'), at('HS 27 E'), 'D')

  delaySeconds -> 0
  after        -> does not use D
```

Foxtrot goes the same way for the same 60 seconds. This is the answer the ramp
wants to hear, and it is worth being able to say it with a number.

**2 — closing Bravo costs it everything.**

```ts
closureCost(kilo, a320(), at('STAND 2'), at('HS 27 E'), 'B')

  after.ok     -> false
  delaySeconds -> UNREACHABLE
```

Bravo is the only way east. There is no delay to quote, and saying "infinite" is
more honest than saying "no route found".

**3 — two closures at once.**

```ts
const withoutF = withTaxiwayClosed(kilo, 'F');
closureCost(withoutF, a320(), at('STAND 2'), at('HS 27 E'), 'D')

  after.refusal -> mentions D
```

`withTaxiwayClosed` returns a chart, so closures compose. The refusal has to
name the taxiway that finally did it.

## Constraints

- **The original chart is not modified.** Not once, not "only the closed flag".
- Every leg of the taxiway closes, not just the first one found.
- A closure that changes nothing is a delay of zero, not a refusal.
- Closing a taxiway that does not exist changes nothing.

## Traps

**Mutating the argument.** This is the one that costs an afternoon. The tests
close a taxiway and then go on using the chart; a `withTaxiwayClosed` that
edits in place breaks tests three files away, in ways that look like a bug in
something else entirely. `Chart.clone()` is given for exactly this.

**The refusal is about the aeroplane that asked.** The same closure strands an
A320 and a DHC8, and each message must name its own type. A message that names
the wrong aeroplane is worse than one that names none.

## Edge cases the tests also check

- Closing a taxiway the route never used.
- Closing a name that is not on the chart.
- The same closure reported for two different aeroplanes.

## Follow-up

`closureCost` answers for one aeroplane and one pair of points. The question the
duty manager actually asked is *"what does it cost us today"* — every departure
on the schedule, weighted by how many there are. Run it over a stand list and
sort by total minutes lost. The answer is usually not the taxiway you expected.
