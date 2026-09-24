# Exercise 02 — Gated boundaries in the graph

**Step 2** · **Guide:** [01-zone-layer.md](01-zone-layer.md)

## Implement

```ts
buildGatedGraph(raw: TaxiGraph, layer: ZoneLayer): TaxiGraph
```

This is the exercise that makes the invariant enforceable. After it runs there is
exactly one way for a route to change zone: through a vertex marked as a gate.
Everything downstream — the permission set, the edge filter, the events, the stop
points — keys off those vertices.

Three passes:

1. **Copy the raw vertices.** Unchanged, same order, so their ids still mean what
   the chart meant.
2. **Split every edge where the zone changes.** Walk it in `ZONE_SCAN_STEP` steps
   asking `zoneAt()`; where the answer changes, bisect to
   `ZONE_SPLIT_TOLERANCE` and put a vertex there. Give each sub-edge the zone of
   its own midpoint, and carry `oneWay`, `maxWingspan` and `maxWeightTonnes` over
   from the parent.
3. **Mark the gates.** After `build()`, any vertex whose incident edges do not
   all agree on the zone class is a boundary, and a boundary on the graph is a
   gate.

## The traps

**Sample to bracket, bisect to place.** A one-metre scan tells you the boundary is
*somewhere* in a one-metre window; the tests check the split lands on x = 1525,
not near it. Everything downstream — the stop-point arithmetic especially —
inherits whatever error you leave here.

**Flags come from the whole sub-edge, not its midpoint.** The hotspot on Kilo
Field sits on the F/B junction, and taxiway F runs 200 m of which only the last
50 are inside it. A midpoint test misses it completely.

**Some gates are at existing vertices.** The apron/taxiway boundary falls exactly
on GA, which the chart already had. That is why the gate pass looks at *every*
vertex's incident edges rather than only at the ones splitting created.

**`innerZone` is the less restrictive side.** Compare by `zonePriority()`, not by
the order the union type happens to be written in. That pair is what makes
Exercise 05's gate check directional, and "directional" is what lets an aeroplane
leave a runway without a clearance.

**A hard gate does not have to have a painted line on it.** The runway *edge* is a
hard gate; nobody paints a line there. `holdShortId` stays −1, and the vertex
keeps whatever name you gave it. Only when a holding position is within half a
metre does the vertex take that line's name and identifiers.

## Run it

```bash
npm test -- ex02
```

## What the tests check

- **24 vertices and 25 edges in; 36 and 37 out.** Twelve edges cross a boundary
  somewhere in the middle.
- **Five soft gates and eight hard ones.**
- The four splits along taxiway B at x = 1525, 1575, 1625, 1675, and the two on
  taxiway E at y = 425 and 475.
- `innerZone` / `outerZone` on both kinds of hard gate.
- `HS 36 W` gets its name from the painted line; the runway edge fifty metres
  further on does not have one.
- `protects` names the right runway, and only that runway.
- The apron, stand and de-icing boundaries are soft.
- A junction between two taxiways is **not** a gate — and neither is the point
  where taxiway B crosses the runway 36 centreline, because everything there is
  runway.
- Split edges inherit one-way and wingspan limits from their parent.

## Once it is green

```bash
npm run taxi gates
```

Read the list. Every line of it is a place the rest of the capstone will ask a
question, and there are thirteen of them on an airport with two runways. That
number staying small is the point of the whole design.

## Extension

Real charts have curved guidance lines, and a curve can cross a zone boundary
more than once. The scan-and-bisect above assumes one crossing per bracket, which
is true for straight edges against convex polygons. Generalise it: keep the scan,
but bisect within *every* bracket where the answer changed, and think about what
happens when the step size is larger than the feature you are crossing.
