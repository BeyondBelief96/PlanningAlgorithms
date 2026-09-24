# Exercise 08 — The merge ladder, simplest first

**Step 8** · **Guide:** [04-merging.md](04-merging.md)

## Implement

```ts
paramsFor(mode: StartMode, aircraft): MergeParams

planCaptureWindow   (start: Pose, candidate: MergeCandidate, params): MergePath
planStraightThenTurn(start, candidate, params): MergePath
planSCurve          (start, candidate, params): MergePath
planIntercept       (start, candidate, params): MergePath
planDubinsMerge     (start, candidate, params): MergePath
planMerge           (start, candidate, params): MergePath
```

Five ways to get from a pose onto a line, in the order a pilot would reach for
them. `planMerge()` tries each in turn and takes the first that works.

**This exercise needs nothing else in the capstone.** Every test builds its own
candidate from two poses, so it passes on its own, in any order. If you want to
start somewhere other than the beginning, start here.

## The five

**1. Capture window.** Cross-track and heading errors both inside tolerance:
nothing to plan. Return the guidance line itself, from where the aircraft
projects onto it to the merge point. Fail when the merge point is behind you.

**2. Straight then turn.** One straight of length `run`, one arc of signed radius
`R` through `sweep`. The whole thing is one observation — an arc displaces the
aircraft by

```
R · (sin ψ₁ − sin ψ₀,  cos ψ₀ − cos ψ₁)
```

so `Δ = run · u₀ + R · w` is two linear equations in two unknowns and Cramer's
rule solves it.

**3. S-curve.** Two opposite arcs and a trailing straight, for a roughly parallel
line with a lateral offset. In the line frame, with cross-track `e` and heading
error `φ`, the heading `α` at the end of the first arc satisfies

```
cos α = (e / R₁ + cos φ + 1) / 2
```

where `R₁` is the first signed radius — turn **toward** the line first. `α` gives
both sweeps; the trailing straight closes what is left along the line.

**4. Intercept.** Four pieces: turn to a 30–45° intercept on the side the line
is, run straight, roll out, track in.

**5. Dubins.** `dubinsShortestPath()` is given (see `src/airport/geometry.ts`)
because it is Section 15.3.1 of the book. What *is* yours is trying the preferred
radius then the minimum, and applying the loop-rejection filter.

## The traps

**Reject the negative run.** Cramer's rule will hand you a perfectly valid
algebraic solution with a straight that goes backwards. So will a radius whose
sign does not match the sweep — that is the arc turning the wrong way round.

**The S-curve exists because the straight-then-turn solver fails.** Six metres off
the centreline and eight degrees out, that solver wants to reverse two hundred
metres first. That is not a bug in it; it is the geometry, and it is what rung 3
is for. The test asserts both halves of that.

**The intercept's roll-out closes some of the offset by itself.** Turning through
`α` at radius `r` moves you `r(1 − cos α)` toward the line during the roll-out,
so the straight only has to close *the rest*. Forget that and the roll-out
overshoots and the whole thing fails for no visible reason.

**Every merge must land exactly on the target pose.** The graph route is
concatenated at that point and a metre of gap there is a metre the controller has
to invent. The test checks position to a millimetre and heading to a
milliradian, for all five.

**Loop rejection is part of the exercise.** A Dubins solution may wind round
twice; a taxi manoeuvre may not. `totalTurning(path) > params.maxTotalTurning` is
the test, and it is what makes `planMerge()` refuse a merge point five metres
behind the aircraft instead of planning a circle.

**Taxiway capture disallows hybrid A\*.** You are on a taxiway: rejoin the line or
stop. A planner that starts searching free space on a taxiway is one that will
eventually search its way onto the grass.

## Run it

```bash
npm test -- ex08
```

## What the tests check

- `paramsFor` differs by mode, and only apron and stand allow the search.
- Capture window: on the line it is a 200 m straight; just outside either
  tolerance, or behind, it fails.
- **Straight-then-turn recovers the geometry it was built from.** The test drives
  100 m and turns 45° at radius 50, then hands the solver only the two end poses
  and checks it finds 100 and 50 back.
- It refuses to drive backwards, and refuses a radius below the minimum.
- The S-curve solves the case the previous rung cannot, respects the minimum
  radius, and is what `planMerge()` picks — it does not fall through to Dubins.
- The intercept solves a case where neither of the first three works.
- Dubins lands exactly, and **a merge point five metres behind is refused**
  rather than looped.
- The ladder picks capture, then straight-then-turn, then S-curve, on three cases
  designed to land on each rung.

## Once it is green

```bash
npm run taxi taxiway-capture
npm run taxi hybrid
```

The first says `merged by S-curve`. The second runs the ladder and the search on
the same merge and prints both.

## Extension

**Implement Dubins yourself** — Section 15.3.1. The geometric construction (circle
centres, external and internal tangents, then the three-arc cases) is more
readable than the usual transcription of the Shkel–Lumelsky formulae, and you can
verify each branch by integrating the word and checking it lands where you asked.
`src/airport/geometry.ts` does it that way, including the self-check, so read it
only after you have tried.
