# Exercise 07 — Merge candidates, and only in the start zone

**Step 7** · **Guide:** [docs/capstone/04-merging.md](../../../docs/capstone/04-merging.md)

## Implement

```cpp
std::vector<MergeCandidate> generateMergeCandidates(
    const TaxiGraph& gated, const ZoneLayer&, const AircraftModel&, const Localization&,
    const PermissionSet&, const EdgeFilter&, const CostToGo&);
```

Sample points along the guidance lines near the aircraft, and keep only the ones
it could legally drive to. This is the invariant written as a list of filters,
and every one of them exists to make a single thing impossible.

## The filters

- **Zone match.** Only edges whose zone is the start zone. Stand mode may also
  aim at apron taxilanes — stand-to-apron is the one free-space transition a pilot
  makes without a word from anybody.
- **Never a runway edge** unless you are already in Runway mode.
- **Allowed and reachable.** `filter.allows(d)`, then
  `k = advanceRouteIndex(edge, 0, routeLabels)` — negative means the clearance
  does not let you join this taxiway *first* — then `costToGo.reachable(d, k)`.
- **Junction exclusion.** `kJunctionExclusion` clear of both ends.
- **Lead-in.** `kMinLeadIn` metres of straight guidance line after the merge
  point, following collinear continuations across junctions.
- **Range and bearing.** Within `kCandidateRadius`, and within
  `kMaxCandidateBearing` of the nose — both in *where* the candidate is and in
  *which way its line points*.
- **Forward only on a runway.** You cannot pick an exit behind you.
- **No holding position crossed** by the straight from the aircraft to the
  candidate...
- **...and that straight stays in the start zone** the whole way.

Sort cheapest first: cost-to-go plus the drive to the merge point, charged at the
local zone rate.

## The traps

**Both bearing tests, not one.** A candidate ahead of you on a line that points
back the way you came is a U-turn, whatever the geometry says. On the
`landing-no-exit` scenario, the runway centreline edges *ahead* of a westbound
aircraft are eastbound-reachable, and only the heading test throws them out.

**The lead-in has to cross junctions.** Taxiway A is cut into three by the
de-icing junction and the F junction. Measuring edge by edge says "100 metres and
then a vertex" where the real answer is 375, and rejects perfectly good merge
points. Walk forward while exactly one allowed outgoing edge has the same
heading; stop at the first real junction.

**The hold-short test is not enough on its own.** A runway *edge* is not a painted
line, and an aircraft sitting in a protected area can reach the runway 36
centreline without crossing any hold-short line at all. Sample the straight and
check the zone the whole way. Keep both tests: the hold-short one is cheaper and
names the thing it caught.

**Charge for the drive.** Without the distance term, a merge two hundred metres
away looks free, because cost-to-go only counts what happens after you get there.

**An empty result is a legitimate answer.** From inside the protected area with no
crossing clearance there is genuinely nowhere to aim, and the pipeline turns that
into `NoForwardExit`. Do not relax a filter to avoid it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R capstone.ex07 --output-on-failure
```

## What the tests check

- A stand start produces candidates on stand and apron lines only.
- An apron start never aims at a taxiway.
- No start off a runway ever produces a runway candidate.
- **Cleared to cross runway 36, sitting 75 m short of the holding position: every
  candidate is still west of it.** The crossing happens on the graph, at the gate,
  or not at all.
- Inside the protected area with no crossing clearance: nothing.
- On a runway: every candidate is strictly ahead.
- Junction exclusion and lead-in hold for every candidate.
- The lead-in on taxiway A exceeds 200 m, so it crossed at least one junction.
- The list is sorted, every candidate's route index matches
  `advanceRouteIndex(edge, 0, labels)`, and a localization fault produces nothing.

## Once it is green

```powershell
./build/vs/Debug/taxi_demo.exe apron-off-line
```

The `o` characters leaving the aircraft are the merge; the ones running east are
the graph route.

## Extension

Candidates are sampled every five metres along every nearby edge, which on a
busy apron is a few hundred of them, and the pipeline tries up to forty-eight.
Replace the uniform sampling with something smarter — one candidate per edge,
placed by projecting the aircraft onto the line and pushing forward by a
speed-dependent lead distance — and compare the routes produced. Then work out
what you lost, and construct a case where the uniform sampling finds a merge the
clever version misses.
