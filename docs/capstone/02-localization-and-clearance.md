# 2. Localization and the clearance — Steps 3 and 4

> Exercises: [03 start mode](../../exercises/capstone/ex03_start_mode/README.md),
> [04 the permission set](../../exercises/capstone/ex04_permissions/README.md)

Two short exercises that between them answer the only two questions the planner
needs before it can start: *where am I*, and *what am I allowed to do*.

## Step 3: where am I

Not "what are the coordinates" — the navigation system already said. The question
is which of five situations the aeroplane is in, because each one permits a
different kind of planning.

| Mode | Where | What is allowed |
|---|---|---|
| Stand | inside a stand area | free space; prefer the lead-out line |
| Apron | on apron pavement, off any line | full off-graph planning, obstacle checks |
| Taxiway capture | on taxiway pavement, off the centreline | capture-style merges only |
| Runway | on a runway or protected area | centreline capture and graph following |
| Fault | off pavement, straddling forbidden, inconsistent | refuse to plan, and say why |

### Test the footprint, not the reference point

The reference point of every `Pose` in the capstone is the **main gear centre**,
because that is what a taxi guidance controller actually tracks. Keeping the main
gear centre on the centreline is what keeps the aeroplane on the pavement through
a turn.

But the zone the aircraft is *in* is decided by the nose gear and both mains, and
the wingtips get their own separate question. Testing only the reference point is
the single most common way to write a planner that taxis a wingtip through a jet
bridge.

`classifyFootprint()` returns the zone of six points and three summary flags. Any
of three conditions is a fault:

- a wingtip is somewhere `wingtipForbidden` — inside a structure;
- a tyre is somewhere not `loadBearing` — grass, or a shoulder;
- the three tyres disagree about which zone they are in.

The third is the interesting one. It catches the aeroplane sitting half on the
taxiway and half on the shoulder, which is a real state a real aeroplane gets
into, and which no single-point test notices at all. The right response is to
refuse and ask a human, not to guess which zone was meant.

### Hysteresis

A planner that replans every few seconds will be asked to localize a pose near a
zone boundary over and over. Position noise of a metre is normal. Without
hysteresis the mode flips between Apron and TaxiwayCapture on successive
replans, and since the two modes permit completely different planning, the route
jumps with it.

So: when a previous localization is supplied and the mode has changed, keep the
old one until the footprint is `kModeHysteresis` metres properly inside the new
zone. Three metres is enough to swallow the noise and small enough that a real
crossing still registers within a second of taxiing.

### Nose-in stands, without a special case

Here is the detail worth copying into your own work.

An aeroplane parked nose-in at a stand cannot taxi out; it needs a pushback or a
tow. You could carry a `driveThrough` flag on every stand in the map and keep it
up to date forever. Or you could notice that the stand's lead-out guidance line
already encodes it.

In Stand mode, `localize()` picks the direction of the nearest guidance line that
leads *out* of the stand — not the direction closest to the current heading, which
is what every other mode does. Then `headingError` tells you everything: parked
facing out it is zero, and parked facing the terminal it is 180 degrees. The
pipeline reads that one number:

```cpp
if (localization.mode == StartMode::Stand && std::fabs(localization.headingError) > 0.5 * kPi)
  return refuse(PlanStatus::PushbackRequired, ...);
```

No flag, no special case, nothing to keep in sync with the map.

## Step 4: what am I allowed to do

The clearance is the only thing in the whole system that can open a runway gate.
Everything in Exercise 04 is bookkeeping in service of that sentence.

```
TAXI TO RUNWAY 27 VIA A D B E CROSS RUNWAY 36 HOLD SHORT RUNWAY 27
```

The parser is given — turning words into a struct is not planning. What you build
from the struct is:

- **`routeLabels`**, the taxiways in the order given. Step 6 turns this into a
  route index that is part of the search state, so "via A, D, B, E" is a
  shortest-path problem rather than a filter applied afterwards.
- **`enterableRunways`**, the crossings, *plus* the destination but only when the
  clearance actually says you may enter it. "Hold short of 27" and "line up and
  wait on 27" name the same runway and mean opposite things.
- **`authorizedGates`**, every hard gate whose `protects` names one of them.
  Every other hard gate has infinite cost for this mission.
- **`mandatoryStops`**, the unauthorized hard gates that have a painted line.
- **`goal`**, where the mission ends.

### The goal is not obvious

"Taxi to runway 27" does not mean "drive onto runway 27". With a hold-short
instruction it means the *holding position* — and specifically the one on the last
taxiway of the cleared route. Kilo Field has two holding positions for runway 27,
on taxiways C and E; "via A D B E, hold short of 27" means the one on E. A
clearance that ends "line up and wait" moves the goal fifty metres further, onto
the runway edge gate beyond it.

A stand destination is different again: the goal is the parking position itself,
the far end of the stand lead-in line, not the stand entry gate.

Getting this wrong produces a planner that is confidently, silently off by one
gate, which is exactly the class of bug the rest of the capstone is built to
prevent.

### Why the stops are not filtered here

`mandatoryStops` contains *every* unauthorized painted holding position on the
airport, not just the ones on the route — because Step 4 runs before there is a
route. Step 10 decides which ones the route actually reaches, and in which
direction. That matters: the inbound scenario crosses the runway 27 holding
position on its way *off* the runway, and stopping before it would be exactly
wrong.

---

Next: [searching the gated graph](03-graph-search.md).
