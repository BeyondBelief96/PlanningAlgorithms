# 8. The logic-based formulation — Section 2.4

> Read alongside book pages 57–63, Figures 2.17 and 2.18.
> Exercise: [09, STRIPS to state space](../../exercises/ch02/ex09_strips_state_space/README.md)

Everything so far took `X`, `U(x)` and `f` as given. Sections 2.4 and 2.5 ask a
different question: where does that description come from, and can its *form* be
exploited?

Neither section is needed for the rest of the book. They are worth doing anyway.

## Formulation 2.4

STRIPS — the **ST**anford **R**esearch **I**nstitute **P**roblem **S**olver, 1971,
and one of the first planning systems. The original used first-order logic and ran
into trouble; the version here is restricted to propositional logic.

1. A finite set `I` of **instances** — the things in the world.
2. A finite set `P` of **predicates**, binary-valued partial functions of one or
   more instances. Applying a predicate to specific instances gives a **positive
   literal**; negating it gives a **negative literal**.
3. A finite set `O` of **operators**, each with **preconditions** (literals that
   must hold) and **effects** (literals that result).
4. An initial set `S` of positive literals. Any positive literal not in `S` is
   assumed false.
5. A goal set `G` of positive *and* negative literals.

A positive literal together with its negation is a **complementary pair**. Choosing
one member of every complementary pair is exactly what it means to specify a state.

### "Partial functions" is not a throwaway

The book is careful to say predicates are only *partial* functions of the
instances, and Example 2.6 shows why. With instances `{Battery1, Battery2, Cap,
Flashlight}` and a predicate `In`, the full cross product includes
`In(Battery1, Battery1)` and `In(Flashlight, Battery2)`. Including them costs you a
factor of two in `|X|` per nonsense literal, for nothing. So the model names only
the pairs that can be meaningful, and this repo stores exactly those in
`StripsProblem::atoms`.

## Example 2.6 — the flashlight

`planning::flashlightProblem()`.

```
I = { Battery1, Battery2, Cap, Flashlight }
P = { On, In }

atoms:  On(Cap, Flashlight)
        In(Battery1, Flashlight)
        In(Battery2, Flashlight)

  Name                Preconditions                           Effects
  PlaceCap            { !On(Cap, F) }                         { On(Cap, F) }
  RemoveCap           { On(Cap, F) }                          { !On(Cap, F) }
  Insert(i)           { !On(Cap, F), !In(i, F) }              { In(i, F) }

S = { On(Cap, Flashlight) }
G = { On(Cap, F), In(Battery1, F), In(Battery2, F) }
```

The shortest plan, equation (2.24):

```
(RemoveCap, Insert(Battery1), Insert(Battery2), PlaceCap)
```

`Insert(i)` in the book is written with a variable, which stands for several ground
operators at once. The planning graph and the SAT encoding of Section 2.5 both
require fully ground operators, so this repo expands it up front into
`Insert(Battery1)` and `Insert(Battery2)`.

Run `logic_demo` to see the model printed and solved.

## Section 2.4.2 — converting to a state space

Impose an order on the complementary pairs and read off one bit per pair. A state
is a bit string; the flashlight's three atoms give

```
  bit 0   On(Cap, Flashlight)
  bit 1   In(Battery1, Flashlight)
  bit 2   In(Battery2, Flashlight)

  x_I  =  0b001   (cap on, no batteries)
  X_G  = {0b111}
```

so `|X| = 2^3 = 8`, and every search method from Section 2.2 now runs on it
unchanged. That is Exercise 09.

Three details matter when you implement it:

**Effects only touch what they name.** "It is assumed that the truth values of all
unmentioned complementary pairs are not affected." So `apply` starts from the
current mask and edits it — it does not build a new one from the effects alone.
Getting this wrong is the single most common bug here, and the same assumption
reappears as the *frame axioms* in Section 2.5.3.

**`G` names a set of states, not a state.** Any complementary pair `G` does not
mention may go either way. For the flashlight all three are mentioned, so the goal
set happens to be a single state; for the light-switch problem it is not.

**`S` needs only positive literals, but `G` needs both.** Book Exercise 13 asks
why, and it is a good question to sit with before reading on. The answer: `S`
specifies one complete state, so the closed-world assumption — anything not
asserted is false — pins down every pair. `G` specifies a *set*, so it has to be
able to say "this one must be false" as distinct from "I don't care."

## Why this is hard

The graph search problem is polynomial. But the graph is not the input:

> An input that is expressed using Formulation 2.4 may describe an enormous state
> transition graph using very few instances, predicates, and operators. In a sense,
> the model is highly compressed when using some logic-based formulations. This
> brings it closer to the Kolmogorov complexity of the state transition graph.

Under most formulations, logic-based planning is NP-hard, and the precise class
(NP, PSPACE, EXPTIME) depends on the fine print: whether the operators are fixed in
advance or part of the input, whether negative literals are allowed in effects,
whether they are allowed in preconditions.

This is also the moment the "implicit representation" theme of Chapter 2 stops
being an inconvenience and becomes the subject. A dozen atoms is 4,096 states; a
hundred atoms is more states than there are atoms in the observable universe.
Exercise 09's `predecessors()` enumerates the entire state space by brute force
because `|X| = 8`. Write a comment there noting that it is the first thing that has
to go, because it is.

## Book exercises 7–13, left open

**7.** Reformulate the general forward search algorithm of Section 2.2.1 in terms
of the STRIPS representation. The real question is which parts get built
explicitly and which stay implicit — and once you have done Exercise 09 you have
the answer in code, so write it out in prose.

**8.** Use a *set* of positive literals as the state representation instead of a
bit string. Which operations get cheaper, which get more expensive? (Hint: think
about what `applicable` costs in each.)

**9.** Allow disjunctive goal sets — alternative sets of literals, any of which
satisfies the goal. How does that change the binary string representation? This
one has a satisfying answer; `isGoal` stops being a conjunction test.

**10.** Add a `Remove` operator to the flashlight, where a battery must not be
*blocked* by another battery. The model of Example 2.6 cannot express "blocked",
so you have to extend it first. This is the cleanest illustration in the chapter
of the Section 2.1 warning about a state space that is too small.

**11.** Model the sliding-tile puzzle of Figure 1.1(b) in STRIPS, using variables
in the operator definitions. Then count `|X|` and notice how few lines of model it
took to name it.

**12.** Enumerate the complete set of plans implicitly encoded by Example 2.7.

**13.** Discussed above — and the follow-up ("could `S` have contained only
negative literals?") is worth answering carefully.

---

Next: [planning graphs](09-planning-graphs.md).
