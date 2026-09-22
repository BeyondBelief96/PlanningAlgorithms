# 0. The invariant

> Read this before anything else.  Everything in the capstone is a consequence
> of the two paragraphs below.

## The rule

**Off-graph motion stays inside the zone you start in. Every zone transition
happens on the graph, at a designated crossing point.**

The planner never gets to invent a path that crosses from apron to taxiway, or
from taxiway to runway. Crossings happen only where the map defines them —
hold-short lines, apron entry points — and runway crossings only when a clearance
permits them.

## Why not just make the runway an obstacle?

Because that is not what a runway is.

The obvious design is the one every motion-planning course teaches: mark the
runway as forbidden, hand the planner a collision checker, and let it find a path
that avoids it. That fails on both sides at once.

**It is too strict.** You have to cross runways. Half the taxiways at a real
airport do. Marking the runway forbidden means the planner cannot produce the
route the controller just cleared you for.

**It is too loose.** Un-marking it — because the clearance says "cross runway
36" — makes the runway ordinary pavement for the rest of the plan. A free-space
planner will then happily shave a corner across it somewhere else entirely,
because that is shorter and nothing says otherwise. One clearance for one
crossing has silently become permission to be on the runway.

The failure is structural, not a tuning problem. A cost-based planner expresses
"do not do this" as a large number, and a large number is a thing that can be
outweighed. What is needed is a constraint the search cannot trade away.

## What the rule buys

Splitting the world into *zones* and making every transition a *gate* on the
graph moves the whole question out of the cost function and into the topology.
After Step 2 there is exactly one way for a route to change zone: through a
vertex marked as a gate. So:

- **Clearance logic has a single home.** One set of vertices, one predicate.
  There is nowhere else a crossing could happen, so there is nowhere else to
  check.
- **The free-space planner cannot escape.** Step 7 only generates merge targets
  in the start zone; Step 8's hybrid A\* is clipped to the start zone's polygons;
  Step 9 rejects any swept footprint that changed zone off-graph. Three
  independent mechanisms, all saying the same thing.
- **The failure mode is a refusal, not a violation.** When the clearance does not
  reach the goal, the search has no finite cost-to-go and the planner says so.
  It has no way of returning a "slightly illegal but shorter" route, because
  such a route is not in the space it searches.

## What it costs

Three things, and they are worth knowing before you start.

**The map has to be right.** Everything downstream keys off polygons and
hold-short lines that a human drew. Step 1's margins exist because that human was
working to a survey tolerance and your navigation solution has its own error, and
Step 9 exists because the two together are not a proof.

**Free-space planning becomes a local manoeuvre.** Off-graph motion only ever
gets you from where you are onto the nearest legal guidance line. That is a much
smaller problem than "plan a path across the airport" — which is the point — but
it means the free-space planner can *fail* while a route obviously exists, and
the pipeline has to try the next candidate rather than give up.

**The planner cannot rescue you from a bad position.** Start inside a runway
protected area with no crossing clearance and forward-only motion, and there is
nothing ahead that is legal and nothing behind you can reach. The honest answer
is "I cannot move", and the `inside-protected` scenario exists to make you look
at it. A planner that invents a way out of that is not being helpful.

## The two layers

One more idea runs through the whole capstone, and it is worth naming early.

- **The planner is the performance layer.** It knows the graph, the clearance,
  the cost function, the merge ladder. It is large, and it will have bugs.
- **The monitor is the safety layer** (Step 11). It knows the zone layer, the
  permission set, and where the aircraft is pointed. Nothing else. It projects
  the footprint forward a few seconds and commands a stop if that projection
  touches something it should not.

They are separate on purpose, and in a certified system they would be written by
different people from different requirements. The monitor is allowed to be
conservative and occasionally annoying. It is not allowed to be complicated,
because the argument for trusting it is that you can read all of it.

Exercise 12 is about a hundred lines. That is the design, not a shortcut.

---

Next: [the zone layer and the gated graph](01-zone-layer.md).
