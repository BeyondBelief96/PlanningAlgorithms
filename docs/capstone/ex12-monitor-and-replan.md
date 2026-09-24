# Exercise 12 — The geofence monitor, and replanning

**Steps 11 and 12** · **Guide:** [06-route-and-monitor.md](06-route-and-monitor.md)

## Implement

```ts
geofenceMonitor(
  layer, aircraft, state: VehicleState, permissions,
  horizonSeconds?: number, stepSeconds?: number
): MonitorReport
shouldReplan(
  triggers: ReplanTriggers, speed: number,
  crossTrackLimit?, periodSeconds?, commitSeconds?
): ReplanDecision
spliceRoute(committed: Route, commitS: number, fresh: Route): Route
```

**This exercise needs nothing else in the capstone.** Every test builds its own
vehicle state or its own toy route.

## The monitor

Project the footprint forward at the current speed and steering. If the
projection touches an unauthorized runway or protected area, a holding position,
or a forbidden zone, command a stop and name what it was about to hit.

**The monitor is deliberately stupid, and that is the feature.** It does not know
about the graph, the route, the clearance route labels, the cost function or the
merge ladder. It knows the zone layer, the permission set, where the aircraft is
and where it is pointed. That is all.

The argument for trusting it is that you can read all of it in one sitting. In a
certified system it would be developed independently, from its own requirements,
by people who had not seen the planner — the same relationship as between a
runway incursion alerting system and the thing it is watching. The reference is
about seventy lines. Keep it there.

Do not be tempted to make it cleverer. A monitor that consults the route is a
monitor that fails in the same way the planner does, which is precisely what it
exists not to do.

## The traps

**Carry the steering.** A monitor that projects a straight line misses the case
where the nose wheel is over and the aeroplane is about to leave the pavement
sideways. Projecting an arc is two extra lines, and there is a test for it.

**Use the footprint, not the point.** Same argument as Exercise 10, same failure
if you skip it.

**Include t = 0.** If the aeroplane is *already* somewhere it should not be, the
monitor should say so. The pipeline puts the runway the aircraft is standing on
into `enterableRunways` precisely so this does not fire on a landing rollout.

**Priority order in `shouldReplan()`.** Monitor intervention first, then a new
clearance, then a new obstacle, then cross-track, then the periodic timer. The
trigger string is a log line somebody has to read; "it replanned" is not one.

**A monitor intervention commits nothing.** It has already commanded a stop, so
`commitDistance` is zero. Every other trigger commits `speed × commitSeconds` —
which is what stops the path jumping underneath the controller.

**Splicing shifts everything.** Path samples, events, stops and speed points all
carry an arclength, and all of them move by the length of the committed prefix.
Events from the committed route beyond the cut must not survive.

## Run it

```bash
npm test -- ex12
```

## What the tests check

- Stationary in the middle of a taxiway: clear.
- Forty metres from an unauthorized holding position at taxi speed: stop, in
  under six seconds, naming the runway.
- The same projection with a line-up clearance: clear.
- Stopped, and crawling, at the same place: clear. **The horizon is what makes it
  a warning rather than a collision report.**
- Nose wheel over, at taxi speed: stop. Same speed, straight ahead: clear.
- Straight at the terminal: stop, naming the zone.
- An authorized crossing does not fire; the same geometry without the clearance
  does.
- Five replan triggers, each naming itself; `commitDistance` is speed × 3 s, and
  zero after an intervention.
- Splicing keeps the prefix, drops the committed events beyond the cut, and
  shifts the fresh ones.

## Once it is green

The whole capstone runs:

```bash
npm run taxi
```

Eight scenarios. Four succeed, four refuse, and they refuse for four different
reasons. **A planner that returns a path for all eight is worse than one that
returns a path for four** — that is the last idea in this capstone and the one
most worth taking away.

## Extension

**Close the loop.** Write a small simulator: take a route, drive the aircraft
along it with a pure-pursuit controller and a little noise, run the monitor every
tick, and call `shouldReplan()` on a timer. Then watch what happens when you
inject a new clearance halfway along, or park an obstacle on the route, or start
the aircraft two metres off the line. That is the system this capstone has been
building parts of, and it takes about two hundred lines to assemble.

**Independence for real.** Write the monitor a second time, from the guide rather
than from your own first version, ideally a week later. Run both. Where they
disagree is where at least one of them is wrong, and finding out which is the
actual work of building something you would put on an aeroplane.
