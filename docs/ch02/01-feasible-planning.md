# 1. A route at all

Before anyone asks for the *quick* route, there is a smaller question: is there a
route? An aeroplane on stand 2 has been cleared to the holding point short of
runway 27. Can it get there, and by what sequence of moves?

That is all "feasible" means here. No cost, no preference, no comparison between
two answers. Guide 5 adds those.

## The model

Five pieces, and they are the whole thing:

1. **Places.** A nonempty set of places the aeroplane could be — squares of
   pavement, nodes on a taxiway graph, poses, states of a turnaround.
2. **Options.** For each place, a finite set of things it can do from there.
3. **Consequences.** A rule saying where each option lands you.
4. **Where it is now.**
5. **Where it would be acceptable to stop.** A *set*, not a single place —
   "holding short of 27 at either E or C" is an ordinary clearance.

In this repo that is the abstract class `planning::Problem`:

```cpp
class Problem {
 public:
  virtual int numStates() const = 0;                               // how many places
  virtual State initialState() const = 0;                          // where it is now
  virtual bool isGoal(State x) const = 0;                          // will x do?
  virtual std::vector<State> goalStates() const = 0;               // every place that would
  virtual std::vector<Transition> successors(State x) const = 0;   // options from x
  virtual std::vector<Transition> predecessors(State x) const = 0; // how you get to x
};
```

`numStates()` is a concession to this unit being small — the tables in guide 5
have to sweep every place, and the search methods want an array indexed by place.
It is the one method that does not survive contact with a real surface planner,
and the capstone drops it.

## Choosing what a "place" is

This is the design decision that decides whether a planner is possible, and it
has two failure modes pulling in opposite directions.

**Too much in the state.** If the state carries things the route does not depend
on, every one of them multiplies the number of places. Carry a boolean that does
not matter and you have doubled the airport. The book's version of this warning is
worth quoting: a planning problem about moving a robot in France "should not
encode information about whether certain light bulbs are on in China."

**Too little in the state.** Leave out something the route *does* depend on, and
the consequence rule stops being a rule: the same option from the same place now
leads to different outcomes, depending on the thing you did not write down.

The clean example of the second failure is in the capstone, and it is worth
knowing about before you meet it. A taxi state that is only "which node am I at"
cannot express a turn. Two aeroplanes at the same junction, one arriving from the
north and one from the west, have completely different options — one of them
cannot make the turn at all. So the capstone's state is a *directed edge*, not a
node, and the moment you see why, Exercise 09 there stops being mysterious.

The same thing happens on the turnaround side. Guide 8's description of loading a
hold has three facts in it, and that is enough to say "open the door, load, shut
the door". It is *not* enough to say "this container cannot come out because the
other one is in front of it", because nothing in the model can express blocked.
The model has to grow before the job can be written down.

## The three surfaces

The search guides all run on the same three pieces of airport, each built to make
a different method look foolish. They are ASCII, four characters:

```
'.'  pavement the aircraft may use
'#'  not movement area: grass, a building, closed or occupied pavement
'S'  where the aircraft is now
'G'  where it is trying to get to
```

**`maps::standArea()`** — 7×5. A stand, a pier building, a holding point on the
far side.

```
.......
.S..#..
....#..
....#.G
.......
```

The straight-line distance is 7 squares. The shortest route is 9, because the
pier is in the way. That gap of 2 is exactly what makes straight-line distance a
useful *underestimate* in guide 3 — it is never more than the truth, because
buildings only ever make the taxi longer.

**`maps::deadEndPier()`** — 21×10. A row of stands walled in on three sides, the
opening facing away from the holding point. Built to punish a planner that only
ever steers towards the goal.

**`maps::openApron()`** — 20×12. Wide open, one closed stand. Hundreds of routes
of exactly equal cost, which is where a good estimate earns its keep and where an
uninformed search fans out over everything.

An aeroplane here is a point, it turns on the spot, and a square is either wholly
usable or wholly not. All three are lies. The capstone spends twelve exercises
undoing them — a footprint instead of a point, Dubins curves instead of turns on
the spot, polygons with priorities instead of paved-or-not. What the lies buy is
a problem small enough to print, and every algorithm in this unit survives their
removal unchanged.

## The other kind of problem

Keep one more example in mind, because it is the one that makes the whole
approach make sense. A Rubik's cube has about 4.3 × 10^19 configurations. You
cannot write that down, cannot store a visited set, cannot run a breadth-first
search over it. But you can compute what a move does in a microsecond, and there
is exactly one configuration you want.

An airport surface with real poses is the same shape of problem. Position,
heading, and how much of a spoken clearance has been used is not a set anyone
enumerates; it is a set you *generate*, one state at a time, only where the
search actually goes.

## The route graph is not the input

Every model above induces a graph: a vertex per place, an edge wherever some
option leads from one to another. Planning is then "find a path", which graph
theory solved a long time ago.

The catch, and the reason this unit is eleven exercises rather than one:

> The graph is never the input.

The input is the four questions on `Problem` — what can I do here, where does it
lead, where am I, will this place do. From those the graph can be *generated*, one
vertex at a time, but the description is typically exponentially smaller than the
graph it describes. Guide 8 makes this precise: a turnaround description with a
handful of facts names a state space with billions of states in it.

So everything in guides 2 through 4 is really about one question: **how much of
the airport can you avoid looking at?**

## Systematic, and why refusing matters

One definition belongs here rather than later:

> A search method is **systematic** if, when there are finitely many places, it
> visits every reachable one and correctly reports failure otherwise.

This is not pedantry. The capstone's whole thesis is that a surface planner must
sometimes refuse — no forward exit from this runway, nothing ahead without a
crossing clearance, this aircraft does not fit on this taxiway — and a refusal is
only worth anything if it means "there is no route", not "I stopped looking".

Depth-first search is systematic when the set of places is finite and not when it
is infinite: it can charge off in one direction forever. Best-first search is not
systematic at all. Knowing which of your methods can honestly say "no" is the
difference between a planner and a guess.

---

## In the book

This is LaValle Section 2.1, pages 27–33, Formulation 2.1. The five pieces above
are `X`, `U(x)`, `f`, `x_I` and `X_G`; a plan is a finite action sequence carrying
`x_I` into `X_G`.

The three surfaces are Example 2.1, the 2D grid labyrinth, with the same
geometry and the same costs — `standArea` is the book's small map, `deadEndPier`
is the concave bug trap, `openApron` the open room. The Rubik's cube is
Example 2.2. The "light bulbs in China" warning is the book's own, and the
blocked-container problem is book Exercise 10, which asks you to add a `Remove`
operator to Example 2.6 and discovers that the three-atom model cannot express
it.

The state-transition-graph discussion and the "the graph is not the input"
theme run from page 30 onwards; Section 2.4 connects it to Kolmogorov complexity,
the description being a compressed form of the graph. The definition of
systematic is from Section 2.2.

---

Next: [one search, many names](02-search-template.md).
