# Exercise 07 — Forward value iteration, fixed length

**Book:** Section 2.3.1.2, Figure 2.12 · **Guide:** [docs/ch02/05-optimal-fixed-length.md](../../../docs/ch02/05-optimal-fixed-length.md)

## Implement

```cpp
CostTable forwardValueIteration(const Problem& problem, int K);
```

Equation (2.16):

```
C*_{k+1}(x_{k+1}) = min over (x_k, u) with f(x_k, u) = x_{k+1}
                        of [ C*_k(x_k) + l(x_k, u) ]
```

from `C*_1(x) = 0` at `x_I` and `inf` elsewhere. Return `K + 1` rows: row 0 is
`C*_1`, row `k` is `C*_{k+1}`, matching Figure 2.12.

## The two things this exercise exists to teach

Both are asymmetries with Exercise 06, and both matter later.

**The cost-to-come knows nothing about the goal.** Nothing in (2.16) mentions
`X_G`. The goal only enters when you add `l_F` at the end. The test makes this
explicit: it moves the goal to a different state and checks every row is
unchanged. Backward value iteration is the reverse — it cannot even start without
`X_G`, since `G*_F = l_F`.

**Forward needs `f^{-1}`, not `f`.** To fill in a value at `x` you must know who
can *reach* `x`. `problem.predecessors(x)` hands it to you here, but in a real
problem the backward transition may be far harder to compute than the forward one
— and that is exactly why the book presents the backward version first even
though moving forward from `x_I` feels more natural.

## The trap

Same `inf` handling as Exercise 06: skip a predecessor whose value is infinite
rather than adding to it.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex07 --output-on-failure
```

## What the tests check

Figure 2.12, cell by cell, for `figure2_8()` with `x_I = a` and `K = 4`:

```
         a    b    c    d    e
 C*_1     0  inf  inf  inf  inf
 C*_2     2    2  inf  inf  inf
 C*_3     4    4    3    6  inf
 C*_4     4    6    5    4    7
 C*_5     6    6    5    6    5
```

Plus the goal-independence check, and book Exercise 1 at `K = 4` on
`figure2_21()`: forward gives `C*_5(e) = 10`, backward gives `G*_1(a) = 10`.

**A warning that catches people.** These are *fixed-length* tables. At `K = 5` on
`figure2_21()` the answer is no longer 10 — a 5-action plan has to pad, and padding
is not free without a termination action. Try it and see what the padding costs.
Exercise 08 is what removes the restriction.
