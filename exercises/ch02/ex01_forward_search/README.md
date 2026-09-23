# Exercise 01 — A route at all

**Guide:** [One search, many names](../../../docs/ch02/02-search-template.md)

## Implement

```cpp
Plan breadthFirstSearch(const Problem& problem);   // take out the oldest
Plan depthFirstSearch(const Problem& problem);     // take out the newest
```

Write the template **once**, and let the queue discipline be the only thing that
differs. If you end up with two similar-looking functions, you have missed the
point — and Exercises 02 to 05 will each cost you three times what they should.

## The traps

**The template does not give you a route.** It returns success, not a sequence of
moves. Record, for each place, which place it was first reached from and which
move did it, then hand them to the helper:

```cpp
std::vector<State> parent(problem.numStates(), kNoState);
std::vector<Action> parentAction(problem.numStates(), kNoAction);
// ... fill in as you insert ...
Plan plan = reconstructForward(problem, goalState, parent, parentAction);
```

It adds up the move costs for you, so `Plan::cost` comes out right.

**Where to mark a place visited.** Marking on insertion is right for both of these
and stops the same square entering the queue twice. It will be *wrong* in
Exercise 02 — leave yourself a comment about why.

**Check for arrival when you take a place out, not when you generate it.** It
makes no difference here. It will in Exercise 02, and the habit is worth forming
before it costs you an afternoon.

**Fill in the counters.** `Plan::expanded` is places actually examined,
`Plan::generated` is places ever queued. Exercises 02 to 05 are largely about
comparing those two numbers across methods, and `surface_demo` prints them.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex01 --output-on-failure
```

## What the tests check

- On `bypassTaxi()`, breadth first returns a **three-leg** route costing
  **thirteen minutes**. The four-leg route through taxiway B costs ten. Breadth
  first counts legs, not minutes, so it takes the slow one and reports success.
  That gap is the reason Exercise 02 exists.
- On `maps::standArea()` it returns **nine moves**, although the straight-line
  distance is seven — the pier is in the way.
- Depth first returns a legal route, and nothing is claimed about its length.
- **Both refuse** when there is no route: an aeroplane that has entered the runway
  has no edge back to the holding position, and the honest answer is "no route",
  not a route that does not exist.
- `expanded` and `generated` are populated.

## Once it is green

```powershell
./build/vs/Debug/surface_demo.exe stand --render
```

Look at the two drawn routes. Breadth first's is a tidy L round the pier. Depth
first's wanders down the west edge of the apron first, because that is the order
the four compass directions happen to be listed in:

```
  breadth first             9.000       9         32         32
.******
.S..#.*
....#.*
....#.G
.......

  depth first              11.000      11         12         20
.......
*S..#..
*...#..
*...#.G
*******
```

Both are legal. Only one of them is a route you would give a crew, and nothing
inside depth first knows the difference. That is the demonstration.

---

**In the book:** LaValle Section 2.2.1, Figure 2.4, `FORWARD_SEARCH`.
`bypassTaxi()` is Figure 2.21, `maps::standArea()` is the small grid of Example
2.1. The remark that "the particular choice of longer plans is arbitrary" is the
book's. The counters are what book Exercises 18–21 compare.
