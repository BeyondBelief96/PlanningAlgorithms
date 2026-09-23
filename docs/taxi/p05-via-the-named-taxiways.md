# Problem 05 — Via the named taxiways

## The situation

> *"KLM1234, taxi to holding point Echo One via Alpha Delta Bravo Echo, cross
> runway one eight three six, hold short of runway two seven."*

That sentence is the input. Not a map of obstacles — a sentence, from a person,
who is talking to eleven other aircraft and expects to be obeyed literally.

This is the most important problem in Part 1 and the one with no counterpart in
a textbook.

## Write

```ts
routeUnderClearance(chart, ac, from, clr: Clearance): TaxiRoute
```

The quickest route that **complies** with the clearance: uses the taxiways of
`clr.via` in the order given, and ends at `clr.destination`.

## Examples

**1 — the routine departure.**

```ts
routeUnderClearance(kilo, a320(), at('STAND 2'), standDeparture())

  taxiwaysUsed -> ['STAND 2', 'APRON', 'A', 'D', 'B', 'E']
  ends at      -> 'HS 27 E'
```

Note what it does *not* do: it does not take Problem 02's runway shortcut, and
it does not use Foxtrot, even though Foxtrot is free and exactly as quick as
Delta. Neither was named, so neither is an option.

**2 — a clearance that does not reach where it says it does.**

```ts
routeUnderClearance(kilo, a320(), at('STAND 2'), unreachableVia())
  // via Alpha Delta Charlie, destination HS 27 E

  -> refused: 'UNABLE: HS 27 E cannot be reached via the taxiways given
               (A D C); request a different routing'
```

Charlie does not join Delta to Echo. The destination exists, a route to it
exists, and the sentence still does not work. The crew needs to know that
specifically, because the fix is to ask for a different routing.

**3 — an arrival, which is a different list in a different order.**

```ts
routeUnderClearance(kilo, a320(), at('CR'), arrivalToStand1())

  taxiwaysUsed -> ['C', 'B', 'D', 'A', 'APRON', 'STAND 1']
```

## Why this is not a filter

The tempting implementation is: find the quickest route, then check it used A,
D, B and E in order. It is wrong, and not subtly.

When the quickest route does not comply you have nothing to say — but a
perfectly good complying route may exist one taxiway over. **You never looked
for it.** The clearance is a constraint you search *under*, not a test you apply
afterwards.

## The state

Carry how much of the clearance you have used up:

```
stage 0   have not joined via[0] yet.  May move on stands and aprons only --
          that is how you get off the stand -- or join via[0].
stage k   on via[k-1].  May stay on it, or join via[k].
done      stage === via.length AND standing at the destination.
```

The same point appears once per stage, and that is correct. Standing at D1
having joined Delta and standing at D1 having joined Bravo are genuinely
different situations to be in, and only one of them can still comply.

## Constraints

- An empty `via` is "by any route" — controllers do say that. Fall back to
  Problem 03.
- The route must end at the destination *and* have consumed the whole list.
- Two different refusals, and they mean different things on the radio:
  **"I cannot get there at all"** is a chart problem; **"I cannot get there that
  way"** is a readback problem. Say which.

## Traps

**Order, not membership.** Reversing the via list describes a route that does
not exist, even though every taxiway in it is one the real route uses. A test
checks this.

**The stand and the apron before the first named taxiway.** A clearance does not
say "via STAND 2 and the apron"; getting off the stand is assumed. Allow it, and
only at stage 0.

**`clr.destination` is a name, not an id.** It may not be on the chart at all,
and that is a refusal rather than a crash.

## Edge cases the tests also check

- A destination that does not exist on the aerodrome.
- An aircraft for which no route exists at all, which must refuse *differently*.
- The de-icing routing, which uses a taxiway that goes nowhere else.

## Follow-up

The `text` field carries what was actually said. Parsing
`"via Alpha Delta Bravo"` into `['A', 'D', 'B']` is a genuinely useful exercise
in its own right — the ICAO spelling alphabet, runway designators like "one
eight three six", and the difference between "hold short of" and "cross". It is
a string problem rather than a planning one, which is why it is not Problem 05.
