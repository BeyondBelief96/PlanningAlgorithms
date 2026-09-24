# Exercise 11 — Assembling the route

**Step 10** · **Guide:** [06-route-and-monitor.md](06-route-and-monitor.md)

## Implement

```ts
assembleRoute(
  gated, layer, aircraft, merge: MergePath,
  graphRoute: readonly DirectedEdge[], permissions, limits?: SpeedLimits
): Route
```

A path is not a plan. What goes downstream is one curve plus three lists: where
the radio calls happen, where the aeroplane must stop, and how fast it may go at
every point.

## The curve

The merge path, then each graph edge in turn, with a circular fillet at every
corner. Record the arclength of every junction as you go — the events hang off
those.

**Use the minimum turn radius, not the preferred one.** A fillet of radius `r`
cuts a right-angle corner by `0.41 r`. On a 30-metre taxiway, with the main gear
3.8 m off the centreline:

```
r = 45 m  ->  cuts 18.6 m  ->  the inner main gear is on the shoulder
r = 20 m  ->  cuts  8.3 m  ->  everything stays on the pavement
```

Which is why a taxiing aeroplane turns a junction as tightly as it can. Get this
wrong and Exercise 10 rejects the route with `'gearOnShoulder'` — the system
working, but a confusing half-hour if you have not read this paragraph.

## The events

| Event | Where |
|---|---|
| `'departure'` | s = 0 |
| `'mergeComplete'` | the end of the off-graph part |
| `'softGate'` | every soft gate: ramp-to-ground handoff, stand boundary, de-icing pad |
| `'runwayCrossingStart'` | an authorized hard gate entered from the inside |
| `'runwayCrossingEnd'` | a hard gate left from the outside |
| `'holdShort'` + a `StopPoint` | an unauthorized hard gate entered from the inside |
| `'hotspotEnter'` / `'hotspotExit'` | from the hotspot flags on the edges |
| `'arrival'` | the end |

## The traps

**Decide the direction from the edge you arrived on.** If its zone matches the
gate's `innerZone`, you are about to go in. Comparing against the *next* edge
fails at the last gate of the route — which is the one that matters, since it is
usually the goal.

**Leaving a runway is not a crossing.** It needs no clearance, and it needs no
stop. The inbound scenario passes two hard gates on its way off runway 09/27 and
must not stop at either.

**The nose stops short, and the path is curving.** The reference point is the
main gear centre, twelve metres behind the nose, and near a junction the path is
inside a fillet — so walking back a fixed arclength from the gate puts you part
way round an arc and several metres from where you meant to be. Bisect on
`alongTrack` of the nose tip in the frame of the gate. Sixty iterations is exact
to the sampling resolution.

**Truncate the path at the stop,** and drop the events beyond it. A route that
continues past the place it stops is not a route.

**The speed profile has four terms, in order:** zone limit, times the hotspot
factor, capped by `v ≤ √(a_lat · r)` in the turns, then a pass for the
deceleration into every stop, `v² = 2 a d`. Do the deceleration pass *last*, over
the already-limited profile, or the zone limit will undo it.

## Run it

```bash
npm test -- ex11
```

## What the tests check

- One curve, over 2 km, starting where the merge starts.
- Every corner respects the minimum turn radius.
- The soft gates become events, and one of them says "ramp".
- The authorized crossing is announced at both ends.
- Exactly one stop, naming `HS 27 E`.
- **The nose stops at y = 419**, six metres short of the line at 425, with the
  reference point at 406.4.
- The route ends where the stop is, at zero speed.
- No speed point exceeds its zone limit, or `√(a_lat · r)` in a turn, or the
  braking curve into the stop.
- Arriving at a stand needs no stop point at all.

## Once it is green

```bash
npm run taxi stand-departure -- -v
```

That is the whole capstone output: route, events, stop, speed profile every
hundred metres. Read the event list against the map and check that every radio
call is somewhere a pilot would expect one.

## Extension

**Clothoids.** The routes here join straights to arcs with a curvature
discontinuity, which a real steering controller cannot track exactly — the wheel
would have to move instantly. Replace each junction with a clothoid pair, then
extend the speed profile to limit *jerk* as well as lateral acceleration. This is
the single biggest gap between the capstone and something you could drive.

**Timing.** The speed profile gives `v(s)`. Integrate it to `t(s)` and you have an
estimated time at every gate, which is what a surface movement system actually
schedules against. Then ask what happens when two aircraft want the same holding
position at the same time.
