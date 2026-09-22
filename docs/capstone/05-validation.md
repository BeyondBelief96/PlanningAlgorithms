# 5. Validating the sweep — Step 9

> Exercise: [10 the swept footprint](../../exercises/capstone/ex10_swept_footprint/README.md)

Up to here the planner has reasoned about a *curve*. This is the first and only
place it reasons about the *aeroplane*.

## Why it is a separate step

Every earlier step is an approximation with a known direction of error.

- The zone layer is a human's tracing of a survey, good to a metre or so.
- The configuration-space shrink is isotropic, so it is conservative across the
  wingspan and optimistic along the fuselage — a 37-metre aeroplane grown by
  22 metres of half-wingspan still has 25 metres of tail unaccounted for.
- The graph is a set of centrelines, and the fillet at a corner cuts inside them.
- The candidate filters in Step 7 test a straight line between two points, not
  the shape that travels along it.

None of those is wrong. Together they are not a proof, and the four checks here
are the proof. Accept the first candidate that passes, then run the same check on
the assembled route — the graph should already be safe, but map error and this
particular wingspan make it worth asking.

## The four checks

**1. Gear tracks stay on load-bearing pavement.** All three tyres, at every
sampled pose. Shoulders do not count, and they get their own violation kind:
"you clipped the shoulder" and "you drove into the grass" are different bugs with
different fixes, and collapsing them costs you the information.

A real implementation would also account for main-gear cut-in — the mains track
inside the nose gear through a turn, by an amount that depends on the wheelbase
and the turn radius. The capstone models the gear as three points at fixed
offsets, which is conservative on a straight and optimistic in a tight turn. It
is the most obvious place to make this exercise harder.

**2. Wingtip envelope clear of structures,** by the ICAO Annex 14 separation for
the aircraft's code letter, with the larger margin on aprons. This is the check
that catches the classic: gear perfectly on the lead-in line the whole way, wing
through a jet bridge.

**3. No part of the outline crosses a holding position, or enters a runway or
protected area, without a clearance that names it.** Tested against the **swept
outline**, not the centreline. That distinction is the whole check:

```
path stops 10 m short of the line   ->  reference point never reaches it
nose is 12.6 m ahead of the reference point
                                    ->  the nose is over the line
```

`test_ex10_swept_footprint.cpp` has exactly that case. A centreline test passes
it and an aeroplane ends up on a runway.

One wrinkle: a runway carries two identifiers for one strip. Naming either one —
"cross runway 36" for the 18/36 strip — opens it.

**4. The off-graph portion stays in one zone,** entering another only at the
chosen merge point. This is the invariant again, checked on the geometry this
time rather than on the candidate list. Stand-to-apron is the one permitted
exception, because the stand exists to be left.

## Two details that matter more than they look

**An empty path is a pass.** A capture-window merge plans no motion at all, and
there is nothing to sweep. Returning `ok = false` for it breaks the most common
case in the whole capstone.

**One report per distinct problem.** A path that runs four hundred metres off the
pavement will trip the same check at every one of two hundred samples. Four
hundred identical violations are not four hundred pieces of information, and the
refusal message the pipeline builds from `violations.front()` should name the
thing that went wrong, not the first of a wall of duplicates.

## Where the sweep sits in the pipeline

```
for each candidate, cheapest first:
    plan the merge (ladder, then hybrid A* if the mode allows)
    validate the merge path          <- off-graph: all four checks
    extract the graph route
    assemble the route
    validate the assembled path      <- on-graph: checks 1, 2, 3
    accept
```

Two things follow from that shape.

The sweep is the planner's **last line of defence**, but it is not the last line
of defence — Step 11's monitor is, and it runs against reality rather than
against a plan.

And a rejected candidate is not a failure. The pipeline moves to the next one.
Only when every candidate has been tried does the planner refuse, and the
refusal carries the reason the *last* one failed, which is usually the most
informative thing available.

---

Next: [the route, the monitor and the replan](06-route-and-monitor.md).
