# 8. Describing a job instead of drawing it

> Exercise: [09, a description you can search](../../exercises/ch02/ex09_strips_state_space/README.md)

Everything so far took the places, the options and the consequences as given.
The last three guides ask a different question: where does that description come
from, and can its *shape* be exploited?

## The taxi is only half of a turnaround

An aeroplane blocks a stand for forty minutes and taxis for eight. The eight
minutes are what guides 1 to 7 are about. The forty are a different kind of
problem entirely.

Nothing in those forty minutes has coordinates. Steps come off, the hold is
unloaded and reloaded, the door is shut, ground power goes on and comes back off,
the towbar is fitted, the chocks come out. Each job needs certain things to be
true before it can start and makes certain things true when it finishes. There is
no map. There is a list of facts and a list of jobs.

You could draw the state space. With ten yes-or-no facts about a turnaround that
is 1,024 states, and you would be drawing it by hand for an aircraft type that is
about to be replaced. With thirty facts it is a billion, and you cannot.

So you describe the facts and the jobs, and let the state space be implied.

## The model

1. **Instances.** The things involved: `ULD1`, `ULD2`, `Door`, `Hold`.
2. **Predicates.** The kinds of fact: `Closed`, `Loaded`. Applying one to specific
   instances gives a fact; negating it gives its opposite.
3. **Operators.** The jobs. Each has *preconditions* — what must be true to start
   — and *effects* — what is true afterwards.
4. **What is true when the aeroplane parks.** Anything not listed is false.
5. **What has to be true before it can leave.** This one may name negatives as
   well as positives.

A fact together with its negation is a **complementary pair**. Choosing one member
of every pair is exactly what it means to specify a state of the turnaround.

### "Partial" is not a throwaway

Predicates are only *partial* functions of the instances, and the hold example
shows why. With instances `{ULD1, ULD2, Door, Hold}` and a predicate `Loaded`, the
full cross product includes `Loaded(ULD1, ULD2)` and `Loaded(Door, Hold)`. Neither
is a fact about anything. Including them costs a factor of two in the number of
states *each*, for nothing, so the model names only the combinations that can be
meaningful — and `StripsProblem::atoms` stores exactly those.

This is the first place where the state space blow-up is something you control by
being careful rather than something that happens to you.

## Loading the hold

`planning::cargoHoldProblem()`.

```
instances:  ULD1, ULD2, Door, Hold
predicates: Closed, Loaded

facts:      Closed(Door, Hold)
            Loaded(ULD1, Hold)
            Loaded(ULD2, Hold)

  Job            Needs                                  Makes true
  CloseDoor      { !Closed(Door, Hold) }                 { Closed(Door, Hold) }
  OpenDoor       { Closed(Door, Hold) }                  { !Closed(Door, Hold) }
  Load(i)        { !Closed(Door, Hold), !Loaded(i, H) }  { Loaded(i, Hold) }

on arrival: { Closed(Door, Hold) }
before it can go: { Closed(Door, Hold), Loaded(ULD1, Hold), Loaded(ULD2, Hold) }
```

The shortest plan is four jobs:

```
(OpenDoor, Load(ULD1), Load(ULD2), CloseDoor)
```

Small, and not trivial in the way that matters: **the first job undoes part of the
goal.** The aeroplane arrives with the hold shut, and it must end shut, and the
only way to get there is to open it. Any method that will only accept jobs which
move towards the goal never gets past the first step. That is the whole reason
this example is worth its three facts.

`Load(i)` is written with a variable, standing for several ground jobs at once.
Both methods in guide 9 and guide 10 need every job fully spelled out, so this
repo expands it up front into `Load(ULD1)` and `Load(ULD2)`.

The second model, `groundPowerProblem()`, is the same size and a slightly
different shape: somebody has to walk to the panel before they can connect the
ground power unit, and the goal names a negative — the aeroplane must be *off* its
own battery. Two jobs, and it is small enough to trace on paper.

```powershell
./build/vs/Debug/turnaround_demo.exe
./build/vs/Debug/turnaround_demo.exe power
```

## Turning it into something searchable

Put the complementary pairs in a fixed order and read off one bit each. A state
is a bit string; the hold's three facts give:

```
  bit 0   Closed(Door, Hold)
  bit 1   Loaded(ULD1, Hold)
  bit 2   Loaded(ULD2, Hold)

  on arrival  =  0b001   (shut, empty)
  acceptable  = {0b111}  (loaded and shut)
```

so there are 8 states, and **every search method you wrote in Exercises 01
through 08 now runs on a turnaround description unchanged.** That is Exercise 09,
and it is the payoff for having written those methods against an interface rather
than against a map.

Three details matter when you implement it.

**A job changes only what it names.** The truth of every fact the effects do not
mention is unaffected. So `apply` starts from the current bit pattern and *edits*
it — it does not build a new one out of the effects alone. Loading ULD1 must not
unload ULD2. Getting this wrong is the single most common bug here, and the same
assumption comes back in guide 10 wearing a different hat, where you have to
state it explicitly and at length.

**The goal names a set of states, not a state.** Any pair the goal does not
mention may go either way. For the hold all three are named, so exactly one state
qualifies; for ground power the crew's position is unmentioned, so two do — it
does not matter whether they are still standing at the panel.

**What is true on arrival needs only positives; what must be true to leave needs
both.** Worth sitting with before reading on. The answer: the arrival state is one
complete state, so "anything not asserted is false" pins down every pair. The
goal specifies a *set*, so it has to be able to distinguish "this must be false"
from "I do not care".

## Why this is hard

Searching a graph is polynomial. But the graph is not the input:

> An input expressed this way may describe an enormous state transition graph
> using very few instances, predicates and operators. In a sense the model is
> highly compressed.

Under most formulations this kind of planning is NP-hard, and the precise class
depends on the fine print: whether the jobs are fixed in advance or part of the
input, whether negatives are allowed in effects, whether they are allowed in
preconditions.

This is the moment the implicit-representation theme stops being an inconvenience
and becomes the subject. A dozen facts is 4,096 states. A hundred facts is more
states than there are atoms in the observable universe, from a description that
fits on a page.

Exercise 09's `predecessors()` enumerates the whole state space by brute force
because there are eight states. Write a comment there noting that it is the first
thing that has to go — because it is. At thirty facts that loop runs a billion
times per query.

## Open extensions

**Search over the description directly.** Reformulate the forward search template
so that it never materialises the bit patterns at all. The real question is which
parts get built explicitly and which stay implicit — and once you have done
Exercise 09 you have the answer in code, so write it out in prose.

**Use a set of true facts instead of a bit string.** Which operations get cheaper
and which get more expensive? (Hint: think about what `applicable` costs in each.)
This is not academic; the capstone's permission set is exactly this choice, made
the other way.

**Allow alternative goals.** "Either both holds loaded, or the forward hold
loaded and the aft one placarded." How does that change the representation?
`isGoal` stops being a conjunction test, and this one has a satisfying answer.

**Add a job that cannot be expressed.** Add `Unload(i)` to the hold, where a
container cannot come out if another is in front of it. The three-fact model
cannot say "blocked", so the model has to grow before the job can be written.
This is the cleanest illustration in the whole unit of guide 1's warning about a
state space that is too small — and on a real ramp it is the reason loading order
is planned rather than improvised.

---

## In the book

LaValle Section 2.4, pages 57–63, Formulation 2.4. STRIPS is the Stanford
Research Institute Problem Solver, 1971, and one of the first planning systems;
the original used first-order logic and ran into trouble, and the version here is
restricted to propositional logic. The five numbered pieces are `I`, `P`, `O`,
`S` and `G`.

The hold-loading model is Example 2.6, the flashlight, relabelled fact for fact:
`On(Cap, Flashlight)` → `Closed(Door, Hold)`, `In(Battery_i, Flashlight)` →
`Loaded(ULD_i, Hold)`, `RemoveCap` → `OpenDoor`, `PlaceCap` → `CloseDoor`,
`Insert(i)` → `Load(i)`. The four-job plan is equation (2.24). Ground power is
book Exercise 14, the light switch, with `At(Robot, Switch)` → `At(Crew, Panel)`,
`On(Light)` → `Connected(Gpu, Aircraft)` and `Dark(Room)` → `OnBattery(Aircraft)`.

The bit-string conversion is Section 2.4.2, and the quoted assumption that
unmentioned complementary pairs are unaffected is the book's. The compression
remark is quoted from Section 2.4.3, which connects it to Kolmogorov complexity;
the complexity classes are discussed there too.

The four open extensions are book Exercises 7, 8, 9 and 10. Book Exercise 13 is
the positives/negatives question; Exercise 11 asks for a sliding-tile puzzle
model, and Exercise 12 for the complete set of plans implicit in Example 2.7.

---

Next: [how early could it finish?](09-planning-graphs.md)
