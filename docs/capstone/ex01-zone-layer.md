# Exercise 01 — The zone layer

**Step 1** · **Guide:** [01-zone-layer.md](01-zone-layer.md)

## Implement

```ts
zoneAt(layer: ZoneLayer, p: Vec2): ZoneQuery
classifyFootprint(layer, aircraft: AircraftModel, pose: Pose): FootprintZones
configurationSpace(layer, aircraft): ZoneLayer
```

Three queries, and the whole capstone leans on them. `zoneAt()` is called
hundreds of thousands of times by the sweep check and by hybrid A\*, so the
broadphase matters. `classifyFootprint()` is what Step 3 localizes with.
`configurationSpace()` is the trick that turns a footprint test into a point
test.

## The traps

**Polygons overlap, and the answer has to be one thing.** Taxiway B runs straight
across runway 18/36; the shoulders run under taxiways C and E. `zonePriority()`
decides, and the ordering is *most restrictive first*. Higher wins.

**Overlays are flags, not geometry.** A hotspot painted over a taxiway leaves it
a taxiway. `poly.overlay` means "never decide the zone class from me" — only
contribute `hotspot` and `closed`. Get this backwards and the hotspot becomes an
`'unknown'` hole in the middle of your taxiway.

**`classifyFootprint()` is not `zoneAt(pose.p)`.** The reference point is the main
gear centre; the zone the aircraft is *in* is decided by the nose gear and both
mains, and the wingtips ask a different question entirely. Testing only the
reference point is the single most common way to write a planner that taxis a
wingtip through a jet bridge.

**`offsetConvex()` returns an empty polygon when a shrink collapses the shape.**
That is not an error to paper over — it is how "this aircraft does not fit here"
is spelled. Drop the polygon.

**The three deltas are different.** Load-bearing zones shrink by the gear budget;
structures grow by half a wingspan plus the wingtip separation; shoulders grow by
the gear budget, because the point is to keep the *gear* off them. Overlays keep
their shape.

## Run it

```bash
npm test -- ex01
```

## What the tests check

- The obvious lookups on Kilo Field: stand, apron, taxiway, runway, de-icing,
  terminal, shoulder, and off the map entirely.
- **A walk across taxiway B at y = 400**: taxiway, protected, runway, protected,
  taxiway, at x = 1450, 1550, 1600, 1650, 1700. That one line is `zonePriority()`
  working.
- Hotspot and closed flags come through without changing the zone.
- A parked A320 is consistently in its stand; one six metres off the taxiway
  centreline is not consistently anywhere.
- A wing over a shoulder is fine. A wing over a structure is not.
- The configuration-space stand is 4 m narrower on each side; the
  configuration-space terminal is 22.4 m taller; the holding positions have not
  moved.
- A 777 with a large enough margin collapses taxiway A, and the collapse is
  reported by the polygon simply not being there.

## Once it is green

```bash
npm run taxi map
```

That picture is one `zoneAt()` call per character. If the glyphs are in the right
places, the zone layer is right.

## Extension

The capstone uses a uniform grid for the broadphase, which is fine for a map this
size and this static. Swap it for an R-tree and measure; then try a signed
distance field, precomputed per zone class, and measure again. `zoneAt()` is hot
enough that the answer is interesting, and `validateSweep()` plus
`planHybridAStar()` will show the difference straight away.
