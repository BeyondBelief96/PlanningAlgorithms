# 2. The search template — Section 2.2.1

> Read alongside book pages 33–35, especially Figure 2.4.
> Exercise: [01, forward search](../../exercises/ch02/ex01_forward_search/README.md)

## Three kinds of state

At any moment during a search, every state in `X` is in exactly one of three
categories:

- **Unvisited** — not yet encountered. Initially everything but `x_I`.
- **Dead** — visited, and all of its successors have been visited too. Nothing
  more to learn here.
- **Alive** — encountered, but possibly with unvisited successors. These are the
  frontier, and they live in the priority queue `Q`.

Section 2.3.3 will introduce a variant where dead states can come back to life.
For now, dead is dead.

## Figure 2.4

```
FORWARD_SEARCH
 1  Q.Insert(x_I) and mark x_I as visited
 2  while Q not empty do
 3      x <- Q.GetFirst()
 4      if x in X_G
 5          return SUCCESS
 6      forall u in U(x)
 7          x' <- f(x, u)
 8          if x' not visited
 9              mark x' as visited
10              Q.Insert(x')
11          else
12              resolve duplicate x'
13  return FAILURE
```

Thirteen lines, and they generate the entire family:

> The only significant difference between various search algorithms is the
> particular function used to sort `Q`.

That sentence is the point of the section. Breadth-first is `Q` as a FIFO queue.
Depth-first is `Q` as a stack. Dijkstra sorts by `C(x)`. A* sorts by
`C(x) + Ĝ(x)`. Best-first sorts by `Ĝ(x)` alone. Five algorithms, one program.

## What the figure leaves out

The book is candid that Figure 2.4 is a sketch. Four things you have to decide
before it becomes code.

### It does not produce a plan

`FORWARD_SEARCH` returns SUCCESS, not a sequence of actions. The fix is to record,
for each state, the state it was first reached from and the action that did it —
then walk the pointers back from the goal.

This repo gives you that bookkeeping so you can spend your time elsewhere:

```cpp
std::vector<State> parent(n, kNoState);
std::vector<Action> parentAction(n, kNoAction);
// ... fill them in as you insert states ...
Plan plan = reconstructForward(problem, goalState, parent, parentAction);
```

The alternative the book mentions — storing the optimal cost-to-come at each state
and descending it — only works when the costs form a *navigation function*, which
Dijkstra and A* produce but breadth-first search does not. Section 8.2.2 comes
back to this, and it is how feedback plans are represented.

### Testing "has this been visited?" can dominate the running time

For a grid, a lookup table indexed by cell is O(1) and the question is trivial.
For the Rubik's cube there is no table — you need a hash of a 20-byte state, and
the hashing cost is a real part of the algorithm's complexity. The book notes the
alternative (allow repeated states, keep no table at all) and immediately warns
that the blow-up usually dwarfs the savings.

Chapter 2 problems are small enough that `std::vector<bool>` indexed by state is
the right answer, and that is what the exercises do.

### Where do you mark a state visited?

Two choices: when you *insert* it into `Q`, or when you *pop* it. For breadth-first
and depth-first, marking on insertion is strictly better — it prevents the same
state entering `Q` several times. For Dijkstra, marking on insertion is wrong,
because the whole point of line 12 is that a state already in `Q` may need its cost
lowered. That is the first real difference between the algorithms, and it is worth
noticing before you get to Exercise 02.

### Where do you test the goal?

Figure 2.4 tests at line 4, immediately after popping. It is tempting to test
earlier, when generating `x'` at line 7 — you would return sooner. For breadth-first
that is harmless. For Dijkstra it is a bug: `C(x)` is only known to be optimal at
the moment `x` is popped, so returning at generation time can return a suboptimal
plan. Test on pop, always.

## Complexity

Both breadth-first and depth-first run in `O(|V| + |E|)`, where `|V| = |X|` and
`|E|` is the number of edges. If the same action set is available everywhere then
`|E| = |U||X|`.

The book adds a parenthesis that deserves to be shouted: *the graph is usually not
the input*. `O(|V| + |E|)` is linear in the size of something you were never given
and could not afford to write down. For the Rubik's cube it is linear in
4.3 × 10^19. A "linear-time" algorithm on an implicitly represented graph is not
necessarily a usable one.

## Breadth-first versus depth-first

| | Breadth-first | Depth-first |
|---|---|---|
| `Q` | FIFO | LIFO |
| plan returned | fewest actions | whatever it stumbles on |
| systematic, finite `X` | yes | yes |
| systematic, infinite `X` | yes | **no** |
| `Q` size | can be enormous | at most the depth |
| line 12 | nothing to do | nothing to do |

Depth-first's failure on an infinite `X` is worth dwelling on. It can commit to one
direction and never come back, so it may run forever without ever approaching the
goal — Figure 2.3(a) in the book. Iterative deepening (Exercise 04) is precisely
the fix.

Breadth-first has a subtler property: it remains systematic *even if you do not
track repeated states*. It will waste time on cycles, but it will not miss
anything, because the wavefront still expands uniformly.

## What to expect from Exercise 01

On the `tiny` map you should find a 9-action plan with breadth-first. Depth-first
will find something longer — on this map, 11 — and which 11 depends entirely on the
order `successors()` happens to list the actions in. That arbitrariness is the
point the book makes: "the particular choice of longer plans is arbitrary."

---

Next: [particular search methods](03-search-methods.md) — Dijkstra, A*, best-first,
iterative deepening.
