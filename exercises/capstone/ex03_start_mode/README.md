# Exercise 03 — Localization and start mode

**Step 3** · **Guide:** [docs/capstone/02-localization-and-clearance.md](../../../docs/capstone/02-localization-and-clearance.md)

## Implement

```cpp
const char* toString(StartMode mode);
Localization localize(const ZoneLayer&, const TaxiGraph& gated, const AircraftModel&,
                      const Pose&, const Localization* previous = nullptr);
```

Not "what are the coordinates" — the navigation system already said. Which of five
situations the aeroplane is in, because each one permits a different kind of
planning.

| Mode | Where | What is allowed |
|---|---|---|
| Stand | inside a stand area | free space; prefer the lead-out line |
| Apron | apron pavement, off any line | full off-graph planning |
| Taxiway capture | taxiway pavement, off the centreline | capture-style merges only |
| Runway | a runway **or a protected area** | centreline capture, graph following |
| Fault | off pavement, straddling, inconsistent | refuse, and say why |

## The traps

**A protected area is runway.** No free-space planning between the holding
position and the runway edge. Map it to `StartMode::Runway`, not to something in
between.

**Three tyres, not one point.** The fault cases are: a wingtip inside a structure,
any tyre off load-bearing pavement, or the three tyres disagreeing about which
zone they are in. The third is the one a single-point test never notices, and it
is a real state a real aeroplane gets into — half on the taxiway, half on the
shoulder. Refuse; do not guess which zone was meant.

**Put the reason in `detail`.** The pipeline turns it straight into a
`LocalizationInconsistent` refusal that a human has to act on. "Fault" on its own
is not actionable.

**Hysteresis needs the footprint, not the reference point.** "Properly inside the
new zone" means every tyre is `kModeHysteresis` metres from the boundary of the
polygon it is in. And it only applies when the mode has *changed*; a previous
localization in the same mode should not slow anything down.

**In Stand mode, pick the direction that leads *out*.** Every other mode picks the
direction closest to the current heading. Stand mode must not, because that is
what makes a nose-in parking position show up as a heading error of 180 degrees —
which is how the pipeline knows to ask for a pushback, with no flag to keep in
sync with the map. Use the stand polygon's centroid: the outbound direction is
the one whose head is further from it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R capstone.ex03 --output-on-failure
```

## What the tests check

- Each of the four working modes, from a pose in the right zone.
- A protected area gives `StartMode::Runway`.
- A footprint off the pavement, and a footprint straddling the taxiway and its
  shoulder, are both faults — and both carry a reason.
- Cross-track is **signed**: six metres north of an eastbound centreline is +6,
  because north is left when you are heading east.
- Sitting on the line is inside the capture window; six metres off it is not.
- **Pushed back at stand 2: heading error zero. Nose-in at stand 3: 180 degrees.**
- Hysteresis holds the previous mode one metre into taxiway A, and gives way a
  hundred metres in.

## Once it is green

```powershell
./build/vs/Debug/taxi_demo.exe nose-in-stand
./build/vs/Debug/taxi_demo.exe taxiway-capture -v
```

The first refuses with `pushback or tow required` and no path at all. The second
prints the localization block: mode, zone, cross-track, heading error.

## Extension

Real localization comes with a covariance, not a point. Extend `Localization` to
carry one, inflate the footprint by the 3σ ellipse before classifying it, and
work out what should happen when the *uncertainty* straddles a zone boundary even
though the estimate does not. That is a different and more interesting question
than the one this exercise asks, and it is the one a certification authority will
ask you.
