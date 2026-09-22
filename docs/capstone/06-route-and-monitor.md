# 6. The route, the monitor and the replan — Steps 10, 11 and 12

> Exercises: [11 route assembly](../../exercises/capstone/ex11_route_assembly/README.md),
> [12 the monitor and replanning](../../exercises/capstone/ex12_monitor_and_replan/README.md)

## Step 10: what the controller actually gets

A path is not a plan. The thing handed downstream is one curve plus three lists:
where the radio calls happen, where the aeroplane must stop, and how fast it may
go at every point.

### One curve

The merge path and the graph route become a single `Path`, with a circular fillet
at every corner. Use the **minimum** turn radius, not the preferred one.

That is worth a paragraph, because the instinct is to use the gentler radius and
it is wrong. A fillet of radius `r` cuts a right-angle corner by `0.41 r`. On a
30-metre taxiway, half-width 15, with the main gear 3.8 metres off the
centreline:

```
r = 45 m  ->  cuts 18.6 m  ->  the inner main gear is on the shoulder
r = 20 m  ->  cuts  8.3 m  ->  everything stays on the pavement
```

Which is why a taxiing aeroplane turns a junction as tightly as it can. If you
use the preferred radius here, Exercise 10 will reject the route with
`GearOnShoulder`, and that rejection is the system working.

### Events

| Event | Where |
|---|---|
| `SoftGate` | every soft gate: ramp-to-ground handoff, stand boundary, de-icing pad |
| `RunwayCrossingStart` | an authorized hard gate entered from the inside |
| `RunwayCrossingEnd` | a hard gate left from the outside — leaving needs no clearance |
| `HoldShort` + `StopPoint` | an unauthorized hard gate entered from the inside |
| `HotspotEnter` / `HotspotExit` | from the hotspot flags on the edges |

"Entered from the inside" is decided by the zone of the edge you arrived on: if
it matches the gate's `innerZone`, you are about to go in. That test works at the
last gate of the route, where there is no next edge to compare against — which is
exactly the gate that matters, since it is usually the goal.

### The stop point

The **nose** stops short of the line, by `limits.stopMargin`. The reference point
is the main gear centre, twelve metres behind the nose, and near a junction the
path is *curving* — so walking back a fixed arclength from the gate puts you part
way round a fillet and several metres from where you meant to be.

Bisect instead. `alongTrack` of the nose tip, in the frame of the gate, is
monotone near the end of the approach, so forty iterations of bisection land the
nose within a millimetre of where it belongs. The reference does exactly that,
and the test checks the nose position rather than the arclength for the same
reason.

### The speed profile

Four terms, in order:

1. the zone limit — stands slow, aprons slow, taxiways faster, runways fastest;
2. times the hotspot factor where the sample is inside one;
3. capped by `v ≤ √(a_lat · r)` in the turns, which is what makes a turn bearable
   in the cabin;
4. then a pass for the deceleration into every stop: `v² = 2 a d`.

The last is the only formula in the whole capstone a pilot would recognise
without being told what it is for.

## Step 11: the monitor

Run a separate, simple geofence monitor. Project the aircraft footprint forward
over the next few seconds using the current speed and steering. If the projection
touches an unauthorized runway or protected area, a holding position, or a
forbidden zone, command a stop and trigger a replan.

**The monitor is deliberately stupid, and that is the feature.** It does not know
about the graph, the route, the clearance route labels, the cost function or the
merge ladder. It knows the zone layer, the permission set, where the aircraft is
and where it is pointed. That is all.

The argument for trusting it is that you can read all of it in one sitting. In a
certified system it would be developed independently, from its own requirements,
by people who had not seen the planner — the same relationship as between a
runway incursion alerting system and the thing it is watching. Exercise 12's
`geofenceMonitor()` is about sixty lines. Keep it there.

Three things about it are worth getting right.

**Carry the steering.** A monitor that projects a straight line misses the case
where the nose wheel is over and the aeroplane is about to leave the pavement
sideways. Projecting an arc is two extra lines.

**Use the footprint, not the point.** Same argument as Step 9, and the same
failure if you skip it.

**The horizon is what makes it a warning.** Stopped, nothing fires. Crawling,
nothing fires. At taxi speed forty metres from an unauthorized holding position,
it fires with two seconds to spare. Tuning the horizon is tuning how annoying the
monitor is, and a monitor that is never annoying is not doing anything.

The monitor is the safety net; the planner is the performance layer. If the
monitor fires during normal operation, something upstream was wrong, and the
first thing to look at is whether Step 10's deceleration profile was being
followed.

## Step 12: replanning without the path jumping

Replan periodically and on triggers: a new clearance, a new obstacle, cross-track
error beyond a threshold, or a monitor intervention. Say which — "it replanned"
is not a log line anybody can use.

The subtlety is `commitDistance`. Replanning from the current pose produces a
slightly different path every time, and a controller tracking a path that moves
underneath it will wander. So keep the first few seconds of travel from the
current route and splice the new plan onto the end of it. Three seconds at
current speed is a reasonable commitment: long enough that the controller has
something stable, short enough that a genuinely new plan takes effect quickly.

The exception is a monitor intervention. It has already commanded a stop, so
there is nothing to commit to, and `commitDistance` is zero.

## Failing properly

If no valid candidate exists, return an explicit result rather than a degraded
path. The capstone has six ways to refuse:

| Status | Means |
|---|---|
| `PushbackRequired` | nose-in stand, no forward exit |
| `NoForwardExit` | on a runway or in a protected area, nothing legal ahead |
| `NotCleared` | the clearance does not reach the destination |
| `BlockedByObstacle` | every merge candidate failed the sweep check |
| `NoRoute` | the filtered graph does not connect the start to the goal |
| `LocalizationInconsistent` | the footprint straddles zones that cannot coexist |

Each one means something different to whoever is listening, and each one has a
different next action: call for a tug, call the controller, wait, or stop and get
a human to look at the map.

This is the last idea in the capstone and it is the one most worth taking away. A
planner that always returns a path is not more useful than one that sometimes
says "I cannot do this". It is less useful, because you can no longer tell the
difference between a route it is confident about and a route it made up.

---

Back to the [capstone index](README.md), or on to
[Kilo Field](07-the-map.md) for the coordinates.
