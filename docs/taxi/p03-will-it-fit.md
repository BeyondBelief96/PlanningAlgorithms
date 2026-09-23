# Problem 03 — Will it fit?

## The situation

Two aeroplanes ask for the same taxi. One is an A320 with a 35.8 m wingspan; the
other is a 777 at 64.8 m. They do not get the same answer, and one of them does
not get an answer at all.

This is the first problem where the planner has to say **no**, and saying no
usefully turns out to be most of the work.

## Write

```ts
unusableReason(chart: Chart, e: LinkId, ac: Aircraft): string
quickestRouteFor(chart: Chart, ac: Aircraft, from: NodeId, to: NodeId): TaxiRoute
```

`unusableReason` returns `''` when this aeroplane may use this leg today, and
otherwise one sentence saying why not. Three reasons: the leg is closed, the
aeroplane is too wide, the aeroplane is too heavy.

`quickestRouteFor` is Problem 02 over legs it is allowed on.

## Examples

**1 — a specific refusal.**

```ts
unusableReason(kilo, legOf('D'), b777())
  -> 'D between A2 and D1 takes a wingspan of 36 m, B777 is 64.8 m'
```

Note what the message contains: the leg, the limit, and the number that fails.
That is a sentence somebody can act on. "No route found" sends them to read the
chart themselves.

**2 — the A320 clears taxiway D by twenty centimetres.**

```ts
unusableReason(kilo, legOf('D'), a320())  -> ''
```

35.8 against 36.0. Real aerodromes are full of margins like this, and it is
worth seeing one.

**3 — the 777 gets off stand 3 and no further.**

```ts
quickestRouteFor(kilo, b777(), at('STAND 3'), at('HS 27 E'))
  -> refused, and the reason mentions APRON and 64.8
```

Stand 3 is a code E stand, so it parks fine. The apron beyond it is code D. The
refusal has to land on the apron, because that is where the problem is — telling
the crew the *stand* is too narrow would send them to the wrong argument.

## Constraints

- Check **closed first**. A closed taxiway is closed to everybody, and calling
  it too narrow would be a lie.
- The filter goes where you enumerate the legs, **not** on the finished route.
- A refusal should, where it can, carry the reason the search ran out of
  pavement — not just "no route".

## Traps

**Filtering afterwards is a different algorithm, and it is wrong.** Plan the
unrestricted best route and then check it: when it fails you have to answer
"no", even though a perfectly good usable route may exist one taxiway over. You
never looked for it. This is the single most common way to get this problem
wrong and it passes a surprising number of tests.

**The reason strings are part of the answer.** Several tests read them. That is
deliberate: on a real surface the refusal *is* the output, and a planner whose
refusals are unreadable has not done its job.

**`ends.includes(taxiway)`.** A stand's leg is called "STAND 2" and runs from
the point "STAND 2", so a naive message reads "STAND 2 between STAND 2 and P2".
Worth ten seconds to avoid.

## Edge cases the tests also check

- Which of "closed" and "too wide" wins when both are true.
- Whether an A320 routes *around* the closed apron stub or through it.
- That an aircraft which fits everywhere gets exactly Problem 02's route back,
  runway shortcut and all.

## Follow-up

Kilo Field's limits are wingspan and weight. Real ones also have a minimum turn
radius per taxiway, a maximum tail height under a pier, and a jet-blast
restriction behind certain stands. Add one of them to `Link` and see how far the
change spreads. (Answer: almost nowhere, which is the point of putting the test
in one function.)
