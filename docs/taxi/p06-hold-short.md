# Problem 06 — Hold short

## The situation

Problem 05 produced a route that complies with the clearance. It is still not
something you can give to a crew, because it does not say where to stop.

> *"KLM1234, taxi to holding point Echo One via Alpha Delta Bravo Echo, cross
> runway one eight three six, **hold short of runway two seven**."*

Two runways are involved in that sentence and they are being treated completely
differently. One may be crossed. The other may not, and the taxi ends at the
line painted short of it.

This is the problem where the planner stops answering "where can I go" and
starts answering "what am I permitted to do", and the two are not the same
question. There is nearly always a paved route across a runway. Taking it
without being told to is an incident report.

## Write

```ts
runwaysCrossed(chart, route): string[]
planDeparture(chart, ac, from, clr: Clearance): TaxiRoute
```

`runwaysCrossed` — every runway this route crosses or enters, in order, without
repeats.

`planDeparture` — the whole departure: obey the clearance, cross only what it
permits, and stop where it says. Set `route.stopAt`.

## Examples

**1 — the routine departure.**

```ts
planDeparture(kilo, a320(), at('STAND 2'), standDeparture())

  taxiwaysUsed -> ['STAND 2', 'APRON', 'A', 'D', 'B', 'E']
  stopAt       -> 'HS 27 E'
```

**2 — and it noticed the crossing.**

```ts
runwaysCrossed(kilo, thatRoute)  ->  ['18/36']
```

One runway, once, even though the route touches the 18/36 pavement over several
legs.

**3 — the same taxi without the crossing.**

```ts
planDeparture(kilo, a320(), at('STAND 2'), noCrossingClearance())

  -> refused: 'UNABLE: ... 18/36 ... HS 36 W ...'
```

A perfectly ordinary thing for a controller to say when 18/36 is active. The
refusal must name the runway that stopped it **and the holding position it can
reach**, because "we can get as far as Hotel Sierra three six West" is the
readback the crew will give.

## Constraints

- `stopAt` must be a point the route actually visits, or `NO_NODE`.
- An arrival to a stand gets no stop point. Nothing is being held short of.
- A refusal from Problem 05 passes straight through. Do not re-word it.

## Traps

**Permission is not possibility.** The temptation is to treat an unauthorised
runway as an obstacle and route around it. That is wrong on both sides: too
strict, because you must cross runways and the controller just cleared you to;
and too loose, because once you un-mark it for one crossing, nothing stops the
search shaving a corner across it somewhere else. The capstone's
[invariant](../capstone/00-the-invariant.md) is two pages on exactly this.

**A runway you taxi *along* counts.** Problem 02's shortcut runs 500 m down
09/27. `runwaysCrossed` has to see it. If you only look for legs that *cross* a
runway you will miss the worst case in the repo.

**The runway you are already standing on does not count.** An arrival has just
landed; it is *on* 09/27, not crossing it. A planner that counts it refuses
every arrival, which is a very visible kind of wrong.

## Edge cases the tests also check

- An arrival from the runway to stand 1, which crosses 18/36 and stops nowhere.
- A route that stays on the taxiways and crosses nothing at all.
- A clearance whose destination does not exist.

## Follow-up

`mayCross` is a list of runways, which is a simplification: a real clearance
authorises *a crossing*, at a named place, once. Give the permission a location
and see what breaks. (Problem 04's answer — put it in the state — is the one
that works, and it is what the capstone's Exercise 04 does.)
