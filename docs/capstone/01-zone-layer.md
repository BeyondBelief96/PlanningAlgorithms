# 1. The zone layer and the gated graph — Steps 1 and 2

> Exercises: [01 the zone layer](../../exercises/capstone/ex01_zone_layer/README.md),
> [02 the gated graph](../../exercises/capstone/ex02_gated_graph/README.md)

Two steps, one idea: turn a pile of polygons into something with *rules*, and
then push those rules into the graph so that the search cannot avoid them.

## Step 1: zones and their policies

Real airport maps come in ARINC 816, which describes the movement area as a few
dozen kinds of area feature. The capstone collapses them into nine classes, each
with a policy:

| Zone | ARINC 816 source | Policy |
|---|---|---|
| Runway | `AM_RunwayElement`, `AM_RunwayIntersection`, blast pads, stopways | Entry on-graph only, only with clearance |
| Runway protected | between the runway edge and the hold-short lines | Treated as runway |
| Taxiway | `AM_TaxiwayElement` | On-graph travel; off-graph only to capture |
| Apron | `AM_ApronElement` | Off-graph allowed, with obstacle checks |
| Stand | `AM_ParkingStandArea` | Off-graph allowed, lead-out line preferred |
| De-icing | `AM_DeicingArea` | Only if the mission asks |
| Shoulder | `AM_TaxiwayShoulder`, `AM_RunwayShoulder` | Gear forbidden, wing overhang fine |
| Forbidden | service roads, closed areas, structures, unpaved, water | Never enter; structures exclude the wingtip too |
| Hotspot | `AM_Hotspot` | Allowed, penalised, slowed |

Three of those rows repay a second look.

**Runway protected areas are runway.** The strip between the hold-short line and
the runway edge is not a place to plan through. Treating it as runway means the
planner needs a clearance to be there at all, which is what a controller
assumes.

**Shoulders are not load-bearing.** A taxiway shoulder is paved and looks exactly
like taxiway on a chart, and it will not take the weight of a main gear. So the
gear test and the wingtip test are different tests against different zones, and
Exercise 10 reports them as different violations — "you clipped the shoulder" and
"you drove into the grass" are different bugs with different fixes.

**Hotspots are an overlay, not a zone.** A hotspot painted over a taxiway leaves
it a taxiway; it just costs more and is driven more slowly. That is why
`ZonePolygon::overlay` exists, and why `zoneAt()` treats overlay polygons as a
source of *flags* and never of the zone class itself. Closed areas work the same
way: a taxiway closed by NOTAM is still a taxiway, and it is the *edge* that gets
struck out, in Step 5.

### Priority: most restrictive wins

Polygons overlap. Where taxiway B crosses runway 18/36, both polygons cover the
same concrete, and the question "which zone is this point in" has to have one
answer. The rule is *most restrictive first*, which `zonePriority()` encodes:

```
Forbidden  100    a service road painted over an apron is still a service road
Runway      90    a taxiway that crosses a runway is, where it crosses, a runway
Protected   80
De-icing    70
Stand       60
Taxiway     50
Apron       40
Shoulder    30
Unknown      0
```

That single ordering is why `zoneAt(1600, 400)` on Kilo Field answers "runway"
even though taxiway B's polygon covers it, and why it answers "runway protected"
fifty metres either side. Get it backwards and the planner will taxi across a
runway thinking it is on B.

### Configuration space, cheaply

The third function in Exercise 01 is the one that makes everything else
affordable. Shrink every load-bearing polygon by the aircraft's combined error
budget:

```
navigation error + map accuracy + gear margin
```

and grow everything it must stay out of. Then a *point* test on the shrunken
polygon guarantees a *footprint* test on the real one, and the free-space search
in Exercise 09 can check one point per sample instead of a polygon overlap.

This is Section 4.3 of the book, done with a miter offset on convex rectangles
instead of a Minkowski sum on a general obstacle. Two honest caveats:

- It is isotropic, so it is conservative across the wingspan and optimistic along
  the fuselage. A 37 m aeroplane grown by 22 m of half-wingspan still has 25 m of
  tail sticking out the back of the approximation. **That is what Step 9 is for.**
- A polygon that collapses under the shrink is dropped. That is not a bug: it is
  how "this aircraft does not fit here" is spelled, and it is worth an explicit
  test.

## Step 2: gates

Now the part that makes the invariant enforceable.

Walk every guidance-line edge from the chart. Wherever the zone class changes
along it, split the edge and put a vertex at the boundary. Then look at every
vertex: if its incident edges do not all agree on the zone, it is a **gate**.

```
soft  GA              (500, 200)   apron | taxiway
soft  STAND 2 gate    (290, 130)   apron | stand
soft  DEICE gate      (680, 235)   taxiway | de-icing
hard  HS 36 W         (1525, 400)  taxiway | runway protected   protects 18 36  [painted]
hard  EDGE RWY 18/36  (1575, 400)  runway protected | runway    protects 18 36
```

**Hard gates** guard runways and protected areas. Impassable unless the clearance
names that crossing. **Soft gates** are the apron/taxiway and stand/apron
boundaries: passable, but they generate a communication event — the ramp-to-ground
handoff, in particular — and possibly a mandatory stop.

Each gate records `innerZone` and `outerZone`, the less and more restrictive
sides. That pair is what makes Step 5's gate check *directional*, which matters
more than it sounds: an aeroplane that has just landed has to be able to leave
the runway without asking permission to do so. A hard gate stops you going in.
It never stops you coming out.

### Two details worth getting right

**Bisect, do not sample.** Scanning the edge in one-metre steps finds the
*bracket*; bisecting inside it finds the boundary to a centimetre. The tests check
the split lands on x = 1525, not near it, because everything downstream —
stop-point arithmetic, especially — inherits that error.

**Flags come from the whole edge.** The hotspot on Kilo Field sits on the F/B
junction, and taxiway F runs two hundred metres of which only the last fifty are
inside it. A midpoint test misses that completely. Sample the sub-edge and OR the
flags.

### What it should produce

On Kilo Field: 24 vertices and 25 edges in, 36 vertices and 37 edges out, with
five soft gates and eight hard ones. `taxi_demo gates` prints them.

The eight hard gates are four for each runway crossing on taxiway B (the
holding position, the runway edge, the far runway edge, the far holding
position) and two each for taxiways C and E where they meet runway 09/27. Note
that only *four* of the eight sit on a painted line: the runway edges are hard
gates too, but nobody paints a line there, and the gate takes its name from the
holding position only when there is one to take it from.

---

Next: [localization and the clearance](02-localization-and-clearance.md).
