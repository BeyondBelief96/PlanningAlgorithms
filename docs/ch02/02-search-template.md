# 2. One search, many names

> Exercise: [01, forward search](../../exercises/ch02/ex01_forward_search/README.md)

There are not five search algorithms in this unit. There is one, with a choice of
sort order, and the whole of guide 3 is that choice being made five ways. Getting
this into your hands now is why Exercise 01 comes first.

## Three kinds of place

At any moment during a search, every place on the airport is in exactly one of
three categories:

- **Unvisited** — the search has not got there yet. Initially everything except
  where the aeroplane is.
- **Dead** — reached, and everything reachable from it has been reached too.
  Nothing more to learn here.
- **Alive** — reached, but possibly with unexplored options. This is the frontier,
  and it lives in the queue.

Guide 7 introduces a variant where dead places come back to life. For now, dead is
dead.

## The template

```
SEARCH
 1  put where the aeroplane is into Q, and mark it visited
 2  while Q is not empty
 3      x <- take one out of Q
 4      if x will do
 5          return SUCCESS
 6      for each option available at x
 7          x' <- where that option leads
 8          if x' has not been visited
 9              mark x' visited
10              put x' into Q
11          else
12              deal with having reached x' twice
13  return FAILURE
```

Thirteen lines, and they generate the entire family:

> The only significant difference between the search methods is the function used
> to decide what comes out of `Q` next.

Oldest first is breadth first. Newest first is depth first. Cheapest-so-far is
Dijkstra. Cheapest-so-far-plus-estimate is A\*. Estimate alone is best first. Five
planners, one program.

## What the template leaves out

It is a sketch. Four things have to be decided before it is code, and three of
them are where the bugs live.

### It does not give you a route

The template returns SUCCESS, not a sequence of moves. The fix is to record, for
each place, which place it was first reached from and which move did it, then walk
that chain back from the end.

This repo gives you the bookkeeping, because tracing parent pointers is not what
this unit is about and every exercise would otherwise repeat it:

```cpp
std::vector<State> parent(n, kNoState);
std::vector<Action> parentAction(n, kNoAction);
// ... fill them in as you insert places ...
Plan plan = reconstructForward(problem, goalState, parent, parentAction);
```

There is a second way, and it is worth knowing because it is what the capstone
uses: store the *cost* at each place and walk downhill. That only works when the
costs form a proper downhill field, which Dijkstra and A\* produce and breadth
first does not. Guide 6 builds one deliberately.

### "Have I been here?" can be the expensive part

On a grid of pavement, a lookup table indexed by square is O(1) and the question
is trivial. On the Rubik's cube there is no table — you need a hash of a 20-byte
state, and that hashing is a real part of the running time. The alternative,
allowing repeats and keeping no table at all, almost always costs more than it
saves.

The problems here are small enough that a `std::vector<bool>` indexed by place is
the right answer, and that is what the exercises do. The capstone is not, and its
state is a directed edge plus a route index, which is why it hashes.

### Where do you mark a place visited?

Two choices: when you put it *into* the queue, or when you take it *out*.

For breadth first and depth first, marking on insertion is strictly better — it
stops the same place entering the queue several times. For Dijkstra, marking on
insertion is **wrong**, because the entire purpose of line 12 is that a place
already in the queue might turn out to be reachable more cheaply and need its cost
lowered. That is the first real difference between the methods, and it is worth
noticing before Exercise 02 rather than during it.

### Where do you check whether you have arrived?

The template checks at line 4, immediately after taking a place out. It is
tempting to check earlier, at line 7 when the place is first generated — you would
return sooner.

For breadth first that is harmless. For Dijkstra it is a bug. The cost of reaching
a place is only known to be final at the moment it comes *out* of the queue;
return at generation time and you can hand back a route that is three minutes
longer than the one you were about to find. Check on removal, always.

## What it costs

Both breadth first and depth first run in time proportional to the number of
places plus the number of moves between them.

The book adds a parenthesis that deserves to be shouted: *the graph is usually not
the input*. "Linear" here means linear in the size of something you were never
given and could not afford to write down. For the Rubik's cube it is linear in
4.3 × 10^19. A linear-time algorithm over an implicitly represented set of places
is not necessarily a usable one.

## Oldest first versus newest first

| | Breadth first | Depth first |
|---|---|---|
| takes out | the oldest | the newest |
| route returned | fewest moves | whatever it stumbles into |
| systematic, finitely many places | yes | yes |
| systematic, infinitely many | yes | **no** |
| size of `Q` | can be enormous | at most the depth |
| line 12 | nothing to do | nothing to do |

Depth first's failure on an infinite space is worth dwelling on. It can commit to
one direction and never come back, running forever without ever getting nearer.
Iterative deepening (Exercise 04) is precisely the fix, and it is the method that
survives into a state space of poses where you cannot afford to hold the frontier
in memory.

Breadth first has a subtler property: it stays systematic *even if you do not
track where you have been*. It will waste effort going round in circles, but it
will not miss anything, because the wavefront still grows uniformly.

## What Exercise 01 should show you

On `standArea`, breadth first finds a 9-move route round the pier. Depth first
finds something longer — on this surface, 11 moves — and *which* 11 depends
entirely on the order the four compass directions happen to be listed in.

That arbitrariness is the whole demonstration. Both answers are legal routes.
Only one of them is a route you would give a crew, and nothing in depth first
knows the difference.

```powershell
./build/vs/Debug/surface_demo.exe stand --render
```

---

## In the book

LaValle Section 2.2.1, pages 33–35. The template is Figure 2.4,
`FORWARD_SEARCH`, and the quoted line about the sort function is from that
section. The three-way unvisited / dead / alive classification is the book's, as
is the discussion of marking on insertion versus removal, the cost of the visited
test, and the `O(|V| + |E|)` complexity with its "but the graph is not the input"
caveat.

The alternative plan-recovery method — storing the optimal cost-to-come and
descending it — is the book's, and it points forward to Section 8.2.2, where it
becomes how feedback plans are represented. Depth-first's failure on an infinite
state space is Figure 2.3(a). The remark that the particular choice among longer
plans is arbitrary is the book's own.

---

Next: [which one to look at next](03-search-methods.md).
