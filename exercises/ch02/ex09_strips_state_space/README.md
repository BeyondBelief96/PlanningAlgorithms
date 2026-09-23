# Exercise 09 — A description you can search

**Guide:** [Describing a job instead of drawing it](../../../docs/ch02/08-logic-formulation.md)

The taxi is eight minutes; the turnaround is forty. This is the first exercise
about the forty.

Nothing about loading a hold has coordinates. There is a list of facts and a list
of jobs, each with what it needs and what it changes. The state space is never
drawn — it is *implied*, and this exercise is the adapter that lets every search
method you have already written run on it unchanged.

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

A state of the turnaround is one yes-or-no answer for every fact, which is a bit
string. Read it as an integer and you have a `State`.

For `cargoHoldProblem()` — two containers to load, and a door that must end shut:

```
  bit 0   Closed(Door, Hold)
  bit 1   Loaded(ULD1, Hold)
  bit 2   Loaded(ULD2, Hold)

  on arrival = 0b001    8 states    acceptable = {0b111}
```

Helpers already provided: `initialMask(problem)` and `maskToString(problem, mask)`.

## The traps

**A job changes only what it names.** The truth of every fact the effects do not
mention is unaffected. So `apply` starts from the current mask and *edits* it —
set the bits the positive effects name, clear the bits the negative ones name,
leave everything else alone. Loading ULD1 must not unload ULD2.

Building a new mask out of the effects alone is the most common bug here, and it
is the same assumption that comes back in Exercise 11 as the frame axioms, where
you have to write it out at length because nothing else says it.

**The goal names a set of states.** Any fact the goal does not mention may go
either way, so `isGoal` tests only the facts the goal actually names. For the hold
all three are named, so exactly one state qualifies. For ground power the crew's
position is unmentioned, so two do — it does not matter whether they are still
standing at the panel.

**`predecessors` is the one that does not scale.** Working backwards through
effects is fiddly. With eight states you can simply ask every state whether some
job takes it to `x`. Do that — and leave a comment saying it is the first thing
that has to go, because at thirty facts that loop runs a billion times per query.

## Run it

```powershell
ctest --test-dir build/vs -C Debug -R ch02.ex09 --output-on-failure
```

The test file carries its own small breadth-first search, so it works even if
Exercise 01 is still a stub.

## What the tests check

- Eight states, arrival at `0b001`, one acceptable state at `0b111`.
- **With the door shut there is exactly one thing to do**, and it is `OpenDoor`.
  Note what that means: the first job *undoes part of the goal*. The aeroplane
  arrives shut and must end shut, and the only way there is to open it. Any
  method that only accepts jobs moving towards the goal never gets past step one,
  and that is why this example is worth its three facts.
- With the door open, three jobs apply.
- `Load(ULD1)` from "open, ULD2 already aboard" gives "open, both aboard" —
  ULD2 stays put. That is the unmentioned-facts rule.
- The only way to reach the finished state is by shutting the door.
- Searching the description recovers the four-job turnaround: open, load, load,
  shut. Nobody wrote that sequence down anywhere. It falls out of searching a
  state space that was never drawn.
- Ground power needs exactly `(WalkToPanel, ConnectGpu)` — somebody has to walk
  over before they can connect anything.

## Once it is green

```powershell
./build/vs/Debug/turnaround_demo.exe
./build/vs/Debug/turnaround_demo.exe power
```

Every search method from Exercises 01 to 08 now runs on a turnaround description,
which is the payoff for having written them against an interface rather than
against a map.

Then sit with the number. Three facts gave eight states. Ten facts about a real
turnaround — chocks, steps, door, power, water, catering, fuel, pushback,
towbar, beacon — give 1,024, from a description barely longer. Thirty give a
billion. That gap is what Exercises 10 and 11 are trying to get around.

---

**In the book:** LaValle Section 2.4.2 — this is book Exercise 7, reformulating
the forward search of Section 2.2.1 to run on a STRIPS description. The bit
string is the book's binary string representation; the quoted assumption is "it
is assumed that the truth values of all unmentioned complementary pairs are not
affected". `cargoHoldProblem()` is Example 2.6, the flashlight, relabelled fact
for fact, and the four-job plan is equation (2.24). `groundPowerProblem()` is
book Exercise 14, the light switch.
