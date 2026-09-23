# 4. Planning from the other end

> Exercise: [05, backward and bidirectional](../../exercises/ch02/ex05_backward_bidirectional/README.md)

## Starting at the holding point

Everything so far started where the aeroplane is and worked outwards. Turn it
round: start at the holding point, work backwards along the taxiways, stop when
you reach the aeroplane.

The motivation is asymmetry. Many problems fan out enormously from where you
start and narrow sharply into where you are going. An inbound aircraft that must
end up parked on one specific stand, nose on the lead-in line, is the obvious
case: one place to finish, thousands of ways to get there. Searching from the
narrow end first can be dramatically cheaper.

### The one thing that is genuinely new

Going forward you pick a move and read off where it lands you. Going backward you
have to answer a different question:

> Given this place, what could have been done, from where, to arrive here?

That is a different computation, not a different spelling of the same one.
Sometimes it is easy: on a grid, arriving at a square from the north is inverted
by having moved south. Sometimes it is expensive. Sometimes it does not exist in
usable form at all — which is why `Problem` makes it a separate method rather than
deriving it, and why `StripsStateSpace::predecessors` in Exercise 09 has to fall
back on brute force.

Enjoy the grid's symmetry while it lasts. The moment a state carries a heading,
backwards stops being forwards reversed: an aeroplane that arrived at a junction
heading east did not get there by "the opposite of heading west", it got there by
one of a handful of legs whose geometry permits that turn. The capstone's
Exercise 06 is exactly this problem.

In this repo, `predecessors(x)` returns transitions whose `.x` field holds the
place you came *from*, and whose `.cost` is the cost of the move at its
originating end, as always. So the backward relaxation reads:

```cpp
for (const Transition& t : problem.predecessors(x))
  candidate = G(x) + t.cost;   // a candidate value for t.x
```

### What you get out of it

Not the cost of getting somewhere. The cost of **finishing** from somewhere — how
many minutes of taxi remain, measured from each place, to wherever the clearance
ends.

That is a strictly more useful object than a route, and it is worth saying why
now rather than in guide 6. A route is an answer to "what should the aeroplane do,
given that it is on stand 2". A cost-to-finish for every place is an answer to
"what should the aeroplane do", full stop — including from places nobody planned
for. It held short when it was not asked to. It rolled past the exit. It was
told to give way and is now sitting on a taxiway thirty metres from where the
plan said. Backward search has already answered all of those.

The capstone's Exercise 06 is this, run over a state space of directed edges
rather than nodes, and its Exercise 12 replans out of it without searching
anything at all.

## Searching from both ends at once

Grow two searches, one from the aeroplane and one from the holding point, and
stop when they touch.

The payoff is geometric. If the route is `d` moves and each place has `b`
options, one wavefront reaches roughly `b^d` places, but two wavefronts of depth
`d/2` reach roughly `2·b^(d/2)`. For `b = 4` and `d = 20` that is the difference
between 10^12 and 10^6.

On `openApron` it is less dramatic but visible, and the test insists on it:

```cpp
CHECK(both.expanded <= breadthFirstSearch(problem).expanded);
```

### One place the textbook version is worth improving on

The standard pseudocode takes a *single* place out of each queue per round. That
is the simplest thing to write — and it can return a route one move longer than
necessary, because the two searches may meet partway through a level rather than
at its boundary.

Expanding one whole wavefront per round — always the smaller of the two — costs
nothing extra and restores the fewest-moves guarantee. That is what Exercise 05
asks for, and the test insists:

```cpp
CHECK_EQ(both.length(), breadthFirstSearch(problem).length());
```

The general difficulty is real, though. Joining two searches is trivial when
every move costs the same and the two halves meet on a shared square. It stops
being trivial the moment the state carries a pose, because two searches meeting
"at the same place" may disagree about heading by forty degrees, and closing that
gap is a planning problem of its own. That is precisely the capstone's merge
ladder, and it is also what RRT-Connect does in Chapter 5.

## The unified view

All of guides 2 through 4 collapse into four steps, and this list is worth
memorising, because what later chapters extend is *the list*, not any particular
algorithm:

1. **Start.** Build a search graph with no edges and a few starting places.
   Forward: where the aeroplane is. Backward: where it is going. Both: one of
   each. More than two is allowed.
2. **Choose one to expand.** Usually by taking it out of a priority queue.
   *This step is where every method in guide 3 differs, and nothing else does.*
3. **Apply a move.** Forward, read off where it leads. Backward, find what could
   have led here.
4. **Add the edge.** If the method's tests pass. Sometimes the place is added
   without an edge, which starts another tree.

Then check whether the two ends have met, and repeat.

Why this matters: when you meet sampling-based motion planners they will look like
completely different animals. They are not. They are this template, with step 2
replaced by "sample a random configuration and find the nearest vertex" and step 3
replaced by "steer the aircraft towards it until something stops you". The
capstone's hybrid A\* is the same template again, with step 3 replaced by "apply
a steering angle for one second".

---

## In the book

LaValle Sections 2.2.3 and 2.2.4, pages 39–43. Backward search is Figure 2.6 —
the forward template with `f` replaced by `f^{-1}` and `x_I`/`X_G` swapped — and
the quoted question about determining the preceding state is from that section.
Bidirectional search is Figure 2.7, including the single-state-per-round
behaviour discussed above. The four-step unified view is Section 2.2.4, which
Section 5.4 extends to continuous state spaces.

Book Exercise 6 asks you to (a) develop backward Dijkstra and argue it is
optimal, (b) relate it to backward value iteration, and (c) derive backward A\*.
Parts (a) and (c) are Exercise 05 here; part (b) is [guide 7](07-dijkstra-revisited.md).
Book Exercise 20 is the trade-off between exploring the state space and the cost
of connecting the two trees.

The cost-to-finish that backward search computes is `G(x)`, the cost-to-go, and
it is the same quantity value iteration computes in guide 5 — noticing that now
makes guide 7 much easier.

---

Next: [the answer for everywhere](05-optimal-fixed-length.md), which is the
conceptual centre of the unit.
