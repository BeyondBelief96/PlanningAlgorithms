# 4. Merging onto the line — Steps 7 and 8

> Exercises: [07 merge candidates](../../exercises/capstone/ex07_merge_candidates/README.md),
> [08 the merge ladder](../../exercises/capstone/ex08_merge_ladder/README.md),
> [09 hybrid A\*](../../exercises/capstone/ex09_hybrid_astar/README.md)

The graph route is the easy half. The hard half is the first hundred metres: the
aeroplane is somewhere on the apron at an arbitrary heading, and it has to get
onto a guidance line without leaving the zone it is in.

## Step 7: where you are allowed to aim

Exercise 07 is the invariant, written as a list of filters. Every one of them
exists to make a single thing impossible — producing a candidate the aircraft
could only reach by leaving its zone.

- **Zone match.** Only edges whose zone is the start zone. Stand mode may also
  aim at apron taxilanes, because stand-to-apron is the one free-space transition
  a pilot makes without a word from anybody.
- **Never a runway edge** unless you are already in Runway mode.
- **Reachable.** The route index after joining is
  `advanceRouteIndex(edge, 0, routeLabels)`; if that is negative, or the
  cost-to-go from there is infinite, the candidate is not a candidate.
- **Junction exclusion and lead-in.** Keep twenty-five metres clear of both ends
  of the edge, and require thirty metres of straight guidance line *after* the
  merge point. A merge that lands two metres before a corner is no use to the
  controller.
- **Bearing.** Within 120 degrees of the nose, both in where the candidate is and
  in which way its line points. Merging onto a line that points back the way you
  came is a U-turn, whatever the geometry says.
- **Forward only on a runway.** You cannot pick an exit behind you.
- **No holding position in between,** and — the general form of the same rule —
  **the straight line from the aircraft to the candidate stays in the start
  zone.**

That last pair is worth dwelling on. The hold-short test is what the design
document asks for, and it is the one that catches the common case. But a runway
*edge* is not a painted line, and an aeroplane sitting in a protected area can
reach the runway 36 centreline without crossing any hold-short line at all. So
the general test — sample the straight and check the zone the whole way — is the
one that actually enforces the invariant. Keep both: the hold-short check is
cheaper and names the thing it caught.

### The lead-in crosses junctions

Taxiway A on Kilo Field is cut into three edges by the de-icing junction and the
F junction. Measuring the lead-in edge by edge would say "375 metres of A" is
"100 metres and then a vertex", and reject perfectly good merge points.

So follow collinear continuations: from the merge point, walk forward while
exactly one allowed outgoing edge has the same heading. Stop at the first real
junction. It is ten lines and it is the difference between a planner that merges
where a pilot would and one that does not.

### Sorting

Cheapest first, where "cheapest" is the cost-to-go from the merge point plus the
drive to it, charged at the local zone rate. Without the second term a merge two
hundred metres away looks free, because cost-to-go only counts what happens after
you get there.

## Step 8: the ladder

Five ways to get from a pose onto a line, in the order a pilot would reach for
them. Try each in turn; take the first that works.

**1. Capture window.** Cross-track and heading errors both inside tolerance:
there is nothing to plan. Hand the controller the line itself, starting from
where the aircraft projects onto it. Roughly half of all real merges are this.

**2. Straight then turn (SC).** One straight, one arc, closed form. The whole
exercise is one observation: an arc of signed radius `R` through `sweep`
displaces the aircraft by

```
R · (sin ψ₁ − sin ψ₀,  cos ψ₀ − cos ψ₁)
```

so `Δ = run · u₀ + R · w` is two linear equations in two unknowns, and Cramer's
rule solves it. Then reject a negative run (that straight goes backwards), a
radius whose sign does not match the sweep (turning the wrong way), and a radius
below the minimum.

**3. S-curve.** Two opposite arcs and a trailing straight, for a line that is
roughly parallel but offset — the taxiway capture case, and the one where the SC
solver hands back a negative run no matter which target you feed it. In the line
frame, with cross-track `e` and heading error `φ`, the heading `α` at the end of
the first arc satisfies

```
cos α = (e / R₁ + cos φ + 1) / 2
```

where `R₁` is the first signed radius — turn *toward* the line first. Everything
else falls out: `α` gives both sweeps, and the trailing straight closes whatever
is left along the line.

**4. Intercept.** For diverging headings. Turn to a 30–45 degree intercept on the
side the line is, run straight, roll out, track in. Four pieces. The one piece of
arithmetic worth writing down is that **rolling out of a turn of `α` at radius
`r` moves you `r(1 − cos α)` toward the line all by itself**, so the straight only
has to close the rest. Forget that and the roll-out overshoots and the whole
thing fails for no visible reason.

**5. Dubins.** The general two-point solution, given in `geometry.hpp` because it
is Section 15.3.1 of the book and transcribing it is not what this exercise is
about. What *is* part of the exercise is the loop-rejection filter: a Dubins
solution is allowed to wind round twice, and a taxi manoeuvre is not.

### Why the order is the design

A planner that reaches for Dubins first produces paths that are valid and look
nothing like taxiing. It will answer a two-metre cross-track error with a
seventy-metre arc, because Dubins has no notion of "barely anything is wrong
here". The ladder encodes the judgement that a small error deserves a small
correction, which is both what a pilot does and what a passenger expects.

There is a second reason, and it shows up in Exercise 09. The closed forms cost
microseconds. The search costs milliseconds and thousands of expansions. When the
planner runs at 5 Hz and tries up to forty-eight candidates, that difference is
the whole budget.

### Parameters by mode

The same ladder, tuned differently:

- **Apron and stand.** Smaller radii, tighter capture window, larger wingtip
  margins, and hybrid A\* available — the apron is where off-graph motion lives.
- **Taxiway capture.** No free-space search at all. You are on a taxiway: rejoin
  the line or stop. A planner that starts searching free space on a taxiway is
  a planner that will eventually search its way onto the grass.
- **Runway.** A large radius, centreline capture, and graph following only.

## Step 8, last rung: hybrid A\*

Exercise 09 is [Part 1's Exercise 03](../../exercises/ch02/ex03_astar/README.md)
with poses instead of squares. The same priority queue, the same stale-entry
discard, the same guess that never runs high. Two things make it a *motion*
planner:

- The successors are motion primitives the aircraft can actually fly — straight,
  and one arc each way at a fixed radius — so every edge of the search tree is a
  feasible piece of path.
- The search space is clipped to the polygons of the start zone, which is what
  makes it **physically unable** to wander into another zone. Not penalised for
  it. Unable.

Poses are continuous, so the "dead" set becomes a lattice: discretise to a few
metres and a couple of dozen heading bins and keep the best cost per cell. This
is the one place in the capstone where the answer is not exactly optimal, and
that is fine — what is being searched for is a hundred metres of apron
manoeuvring.

### The analytic expansion

Plain hybrid A\* reaches a *region* around the goal, within some tolerance. That
is not good enough here: the merge point is where the free-space path is glued to
the graph route, and a metre of gap there is a metre the controller has to
invent.

So at every popped node, try a Dubins curve straight to the target. If it is
collision-free, you are done and the path lands exactly on the merge pose. In an
open yard this fires at the root and the whole search is one expansion; with
something in the way it fires when the search gets round it.

This is the standard trick and it is worth understanding why it works: the
heuristic guides A\* toward the goal, and the analytic expansion is a cheap test
for "is the remaining problem now easy?" applied to every node the heuristic
brings you to.

### Extensions

Two natural ones, in rough order of effort.

- **Implement Dubins yourself.** Section 15.3.1. The geometric construction —
  circle centres, external and internal tangents — is more readable than the
  usual transcription of the Shkel–Lumelsky formulae, and you can verify each
  branch by integrating the word and checking it lands where you asked.
- **Clothoid smoothing.** The routes here join straights to arcs with a curvature
  discontinuity, which a real steering controller cannot track exactly. Replacing
  each junction with a clothoid pair is a well-defined piece of work, and the
  speed profile in Step 10 would then be limited by jerk as well as lateral
  acceleration.

---

Next: [validating the sweep](05-validation.md).
