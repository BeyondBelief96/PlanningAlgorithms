# Exercise 10 — Validating the swept footprint

**Step 9** · **Guide:** [05-validation.md](05-validation.md)

## Implement

```ts
validateSweep(
  layer, aircraft, path: Path, startZone: ZoneClass,
  permissions: PermissionSet, offGraph: boolean
): SweepResult
```

Up to here the planner has reasoned about a *curve*. This is the first and only
place it reasons about the *aeroplane*. Step along the path in `SWEEP_STEP`
metres and apply four checks at every pose.

## The four checks

**1. Gear tracks stay on load-bearing pavement.** All three tyres. Shoulders get
their own violation kind — "you clipped the shoulder" and "you drove into the
grass" are different bugs with different fixes, and collapsing them costs you the
information.

**2. Wingtip envelope clear of structures,** by the ICAO separation for this
aircraft, with the larger margin on aprons. This is the check that catches the
classic: gear perfectly on the lead-in line the whole way, wing through a jet
bridge.

**3. No part of the outline crosses a holding position, or enters a runway or
protected area,** without a clearance that names it. Tested against
`footprintOf(aircraft, pose)` — `segmentIntersectsPolygon()` and
`polygonsOverlap()` do the geometry.

**4. When `offGraph` is true, the whole sweep stays in `startZone`.** Stand to
apron is the one permitted exception, because the stand exists to be left.

## The traps

**The centreline is not the aeroplane.** A path that stops ten metres short of a
holding position puts the *nose* over it, because the nose is 12.6 m ahead of the
reference point. There is a test for exactly that, and a centreline check passes
it while an aeroplane ends up on a runway.

**A runway has two identifiers for one strip.** Naming either one opens it. Match
on *any*.

**An empty path is a pass.** A capture-window merge plans no motion at all, and
there is nothing to sweep. Returning `ok: false` for it breaks the most common
case in the whole capstone.

**One report per distinct problem.** A path four hundred metres off the pavement
trips the same check at two hundred samples. Four hundred identical violations
are not four hundred pieces of information, and the pipeline builds its refusal
message from `violations[0]`.

**`offGraph` changes only check 4.** The same route that is fine as an on-graph
route is a violation as free-space motion, and the difference is the invariant,
not the geometry. There is a test with both.

## Run it

```bash
npm test -- ex10
```

## What the tests check

- Empty path passes; taxiing down the centreline passes.
- Thirteen metres off the centreline is `'gearOnShoulder'`; thirty-five metres is
  `'gearOffPavement'`. Two different reports.
- Driving up taxiway E past the holding position is `'holdShortCrossed'` — and so
  is stopping ten metres short of it, because of the nose.
- Crossing runway 36 with the clearance is clean; without it, it is not.
- The same apron-to-taxiway path passes on-graph and fails off-graph with
  `'leftStartZone'`.
- Stand to apron passes off-graph.
- Taxiing along the front of the terminal is `'wingtipConflict'`, with the gear
  on pavement the whole way.
- A 400 m violation produces fewer than ten reports.

## Once it is green

Every scenario in `npm run taxi` now gets its merge *and* its assembled route
checked. Try breaking something on purpose — change the fillet radius in Exercise
11 from `minTurnRadius` to `preferredRadius` — and watch the pipeline refuse with
`route rejected, gear on a shoulder`. That is the system working.

## Extension

**Main-gear cut-in.** The capstone models the gear as three points at fixed
offsets, which is conservative on a straight and optimistic in a tight turn: real
main gear tracks *inside* the nose gear through a corner, by an amount that
depends on the wheelbase and the turn radius. Model it — the standard
approximation is that the main gear follows a circle of radius
`√(R² − wheelbase²)` — and find out which of the capstone's routes stop passing.

**Continuous sweep.** Sampling every two metres can step over a thin obstacle.
Build the swept polygon between consecutive poses (the convex hull of the two
footprints is a decent approximation) and test that instead. `convexHull()` is
given.
