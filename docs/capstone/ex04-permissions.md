# Exercise 04 — The clearance and the permission set

**Step 4** · **Guide:** [02-localization-and-clearance.md](02-localization-and-clearance.md)

## Implement

```ts
buildPermissions(gated: TaxiGraph, layer: ZoneLayer, clearance: Clearance): PermissionSet
```

The clearance is the only thing in the whole system that can open a runway gate.
Everything here is bookkeeping in service of that one sentence.

```
TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27
```

`parseClearance()` is given — turning words into an object is not planning. What
you build from it:

| Field | From |
|---|---|
| `routeLabels` | `clearance.route`, in order |
| `enterableRunways` | the crossings, plus the destination *only* if cleared to enter |
| `authorizedGates` | every hard gate whose `protects` names one of those |
| `mandatoryStops` | every other hard gate that has a painted line |
| `deIcingInMission` | whether the route mentioned de-icing |
| `goal` | where the mission ends |

## The traps

**"Hold short of 27" and "line up and wait on 27" name the same runway and mean
opposite things.** The destination joins `enterableRunways` only when the
clearance actually says you may go in.

**A runway has two identifiers for one strip.** A gate that `protects` 18 and 36
is opened by "cross runway 36". Match on *any* identifier, not all of them.

**The goal is not the runway.** With a hold-short instruction it is the *holding
position* — and specifically the one on the **last taxiway of the cleared route**.
Kilo Field has two for runway 27, on taxiways C and E; "via A D B E" means the
one on E. With a line-up clearance the goal moves fifty metres further, onto the
runway edge gate beyond it.

**A stand destination ends at the parking position,** not at the stand entry
gate: the end of the stand lead-in line that is inside the stand area. On the
gated graph that is the endpoint of a `STAND n` edge that `zoneAt()` says is in a
stand and that has exactly one incident edge.

**Say why when there is no goal.** "Taxi to runway 27 via A, hold short of 27"
names no reachable holding position, and the pipeline turns your `detail` into a
`'notCleared'` refusal that someone has to read on a radio.

**Do not filter `mandatoryStops` by the route.** Step 4 runs before there is a
route. Step 10 decides which of them the route actually reaches, and in which
direction — which matters, because the inbound scenario crosses the runway 27
holding position on its way *off* the runway, and stopping before it would be
exactly wrong.

## Run it

```bash
npm test -- ex04
```

## What the tests check

- The four route labels, in order.
- "Cross runway 36" opens exactly four gates — the two painted lines and the two
  runway edges — and nothing else.
- "Hold short of 27" opens nothing, and leaves "27" out of `enterableRunways`.
- Two mandatory stops: the painted holding positions for runway 27. The runway
  edges behind them are hard gates but are not somewhere you stop.
- The goal is the holding position on **E**, not the one on C.
- A line-up clearance moves the goal to the runway edge and opens the holding
  position.
- A stand clearance ends at (290, 95), inside stand 2.
- A clearance that names nothing reachable has no goal, and says so.
- De-icing is in the mission only when the route mentions it.

## Once it is green

Try feeding the demo a different clearance by editing `standDeparture()` in
`src/airport/kilo-field.ts`, or read `parseClearance()` and see which phrasings
it understands. "Cross 36" works as well as "cross runway 36"; "hold short of
runway 27" as well as "hold short runway 27".

## Extension

Real clearances are read back, amended, and superseded. Add
`amend(permissions, clearance)`, work out what an amendment means when the
aircraft is already past the gate it changes, and decide what the planner should
do when the new clearance contradicts where the aeroplane currently is. The
answer is more interesting than "replan".
