# Exercise 09 — STRIPS to state space

**Book:** Section 2.4.2 · **Guide:** [docs/ch02/08-logic-formulation.md](../../../docs/ch02/08-logic-formulation.md)

This is book Exercise 7 in code: reformulate the forward search of Section 2.2.1
so it runs on a STRIPS description.

## Implement

Every method of `StripsStateSpace` in `include/planning/strips.hpp`:

```cpp
bool applicable(StripsState mask, const Operator& op) const;
StripsState apply(StripsState mask, const Operator& op) const;
int numStates() const override;
State initialState() const override;
bool isGoal(State x) const override;
std::vector<State> goalStates() const override;
std::vector<Transition> successors(State x) const override;
std::vector<Transition> predecessors(State x) const override;
std::string name(State x) const override;
```

## The representation

A state is one choice of positive-or-negative from every complementary pair, which
is a bit string over `problem.atoms`. Read it as an integer and you have a `State`.

For `flashlightProblem()`:

```
  bit 0   On(Cap, Flashlight)
  bit 1   In(Battery1, Flashlight)
  bit 2   In(Battery2, Flashlight)

  x_I = 0b001    |X| = 2^3 = 8    X_G = {0b111}
```

Helpers already provided: `initialMask(problem)` and `maskToString(problem, mask)`.

## The traps

**Effects only touch what they name.** "It is assumed that the truth values of all
unmentioned complementary pairs are not affected." So `apply` starts from the
current mask and *edits* it — set the bits named by positive effects, clear the
bits named by negative ones, leave everything else alone. Building a new mask out
of the effects alone is the most common bug here, and it is the same assumption
that reappears as the frame axioms in Exercise 11.

**`G` names a set of states.** Any complementary pair `G` does not mention may go
either way, so `isGoal` tests only the pairs `G` actually mentions.

**`predecessors` is the one that does not scale.** Regression through STRIPS
effects is fiddly. With `|X| = 8` you can simply ask every state whether one
operator takes it to `x`. Do that — and leave a comment saying it is the first
thing that has to go, because at thirty atoms this loop runs a billion times.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex09 --output-on-failure
```

The test file carries its own small breadth-first search, so it works even if
Exercise 01 is still a stub.

## What the tests check

- `|X| == 8`, `x_I == 0b001`, `X_G == {0b111}`.
- Only `RemoveCap` applies in the initial state; with the cap off, three operators
  apply.
- `Insert(Battery1)` from `0b100` gives `0b110` — battery 2 stays put. That is the
  "unmentioned pairs are unaffected" rule.
- The only predecessor of the goal is `0b110` via `PlaceCap`.
- Searching the space recovers equation (2.24): four actions, `RemoveCap` first
  and `PlaceCap` last.
- The light-switch problem needs exactly `(MoveToSwitch, FlipOn)`.

## Once it is green

```powershell
./build/vs/Debug/logic_demo.exe
./build/vs/Debug/logic_demo.exe switch
```

The whole of Section 2.2 now runs on a logical description, which is the point of
Section 2.4.2. Then sit with the number: three atoms gave eight states. Thirty
atoms would give a billion, from a description barely longer. That gap is what
Section 2.5 is trying to get around.
