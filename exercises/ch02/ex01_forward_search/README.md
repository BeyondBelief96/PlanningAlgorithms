# Exercise 01 — The general forward search template

**Book:** Section 2.2.1, Figure 2.4 · **Guide:** [docs/ch02/02-search-template.md](../../../docs/ch02/02-search-template.md)

## Implement

```cpp
Plan breadthFirstSearch(const Problem& problem);   // Q is FIFO
Plan depthFirstSearch(const Problem& problem);     // Q is LIFO
```

Write the template of Figure 2.4 **once**, and let the queue discipline be the
only thing that differs. If you end up with two similar-looking functions, you
have missed the point of the section — and Exercises 02 to 05 will each cost you
three times as much as they should.

## The traps

**Reconstructing the plan.** Figure 2.4 returns SUCCESS, not a plan. Record a
parent pointer and the action that produced each state, then hand them to the
helper the library gives you:

```cpp
std::vector<State> parent(problem.numStates(), kNoState);
std::vector<Action> parentAction(problem.numStates(), kNoAction);
// ... fill in as you insert ...
Plan plan = reconstructForward(problem, goalState, parent, parentAction);
```

It sums the `l(x, u)` terms for you, so `Plan::cost` comes out right.

**Where to mark visited.** Marking on insertion is right for both of these
algorithms and prevents a state entering `Q` twice. It will be *wrong* in
Exercise 02 — leave yourself a comment about why.

**Test the goal on pop, not on generation.** It makes no difference here, but it
will in Exercise 02, and the habit is worth forming now.

**Instrumentation.** Fill in `Plan::expanded` (states popped) and
`Plan::generated` (states pushed). Book Exercises 18–21 are entirely about
comparing those two numbers across algorithms, and `grid_demo` prints them.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex01 --output-on-failure
```

## What the tests check

- Breadth-first on `figure2_21()` returns a 3-action plan costing 13 — the
  *shortest*, not the *cheapest*. The 4-action route costs only 10. That gap is
  the reason Section 2.3 exists.
- Breadth-first on `maps::tiny()` returns 9 actions, although the Manhattan
  distance is 7.
- Depth-first returns a valid plan, and nothing is claimed about its length.
- Both report failure when the goal is unreachable.
- `expanded` and `generated` are populated.

## Once it is green

```powershell
./build/vs/Debug/grid_demo.exe tiny --render
```

Look at the two rendered paths. Breadth-first's is a tidy L; depth-first's wanders
down the left wall first because that is the order `successors()` happens to list
the actions in. The book's remark — "the particular choice of longer plans is
arbitrary" — is on the screen.
