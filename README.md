# Planning Algorithms — an airport surface, twenty-three exercises

Everything here plans the movement of an aeroplane on the ground.

It starts with a grid of pavement and a five-node taxiway sketch, where the
algorithms show up in their simplest possible form and you can check every number
by hand. It ends with an autonomous taxi planner for a real-ish airport surface,
which has to route an aircraft from a stand to a holding point, hold it short of
a runway it has no clearance to cross, and refuse when the clearance it was given
does not reach the goal.

The same ideas run all the way through. The second half is the first half with the
lies removed.

**Part 1 — the algorithms, on a hand-sized airport.** Eleven exercises: search,
dynamic programming, and describing a ground task instead of drawing its state
space.

Start here: **[docs/ch02/README.md](docs/ch02/README.md)**

**Part 2 — the capstone.** Twelve more, building the taxi planner: zone layers,
gated graphs, ATC clearances, Dubins merges, swept-footprint validation and an
independent geofence monitor. It is where the first half stops being exercises.

Then here: **[docs/capstone/README.md](docs/capstone/README.md)**

## How the repo is laid out

```
include/planning/           the vocabulary: Problem, Plan, Transition, the fixtures
include/planning/airport/   and the capstone's: zones, graph, aircraft, clearance
src/                        the given library -- problem models, printing, surfaces
docs/ch02/                  part 1's guides, one per idea
docs/capstone/              part 2's guides, one per group of steps
exercises/ch02/             eleven stubs with TODOs.  This is where you write code.
exercises/capstone/         twelve more, one per step of the surface-movement design
solutions/                  the reference implementation of each exercise
tests/                      one test file per exercise, compiled against BOTH
tools/                      three demo programs
```

`include/` and `src/` are scaffolding: they give you an airport to plan on so that
you spend your time on the algorithms rather than on parsing ASCII maps. You never
need to edit them.

The unusual part is that **the same test file is compiled twice** — once against
your `exercises/` code and once against `solutions/`. So the reference is not a
separate program you squint at; it is held to exactly the tests you are held to.

## Building

Requires CMake 3.21+ and a C++20 compiler. No third-party dependencies — the test
framework is a 200-line header in `tests/`.

```powershell
# Visual Studio 2026
cmake --preset vs
cmake --build build/vs --config Debug

# or Ninja with whatever compiler is on PATH
cmake --preset ninja
cmake --build build/ninja

# or Ninja + clang explicitly
cmake --preset clang
cmake --build build/clang
```

## Running the tests

Two labels. `yours` runs your implementations; `reference` runs the solutions and
should always be green.

```powershell
ctest --test-dir build/vs -C Debug -L yours --output-on-failure

# one part, or one exercise at a time, which is how you will actually work
ctest --test-dir build/vs -C Debug -R ch02 --output-on-failure
ctest --test-dir build/vs -C Debug -R capstone.ex06 --output-on-failure

# stuck?  check that the reference passes, then read it
ctest --test-dir build/vs -C Debug -R ch02.ex01.reference --output-on-failure
```

On a single-config generator such as Ninja, drop `-C Debug`.

Verified warning-free under MSVC 19.51 (`/W4 /permissive-`) and clang
(`-Wall -Wextra -Wpedantic`).

## The demos

Three programs, for the parts where the point is to *look* at the answer rather
than assert on it.

```powershell
./build/vs/Debug/surface_demo.exe                 # every method, every surface
./build/vs/Debug/surface_demo.exe stand --render  # ...and draw the route
./build/vs/Debug/turnaround_demo.exe              # loading a hold, four ways

./build/vs/Debug/taxi_demo.exe                    # the capstone, all eight scenarios
./build/vs/Debug/taxi_demo.exe map                # the airport, drawn
./build/vs/Debug/taxi_demo.exe gates              # what the gated graph looks like
./build/vs/Debug/taxi_demo.exe stand-departure -v
```

Each has a `_reference` twin (`surface_demo_reference.exe`, `taxi_demo_reference.exe`)
built against the solutions, so you can run the demos before you have written
anything.

## Working style

1. Read the guide in `docs/`.
2. Read `exercises/<part>/exNN_*/README.md` — the brief, the traps, the checks.
3. Write the code in the stub next to it.
4. `ctest -R <part>.exNN --output-on-failure` until green.
5. Only then read `solutions/<part>/exNN_*/` and compare.

Part 1's tests are not arbitrary. Wherever a guide prints a number, the test
checks that number — the cost tables cell by cell, the layer sizes, the clause
counts. If your table matches the guide column for column, it is right.

The capstone's tests check the two things a surface-movement planner is actually
judged on: that the route is legal, and that the refusals are correct. Three of
its eight scenarios have no answer, and a planner that finds one for them has
failed.

## Two habits worth building

**The graph is never the input.** `Problem` hands you "what can I do from here"
and "will this place do", and nothing else — no map, no chart, no list of
taxiways. That is not a stylistic choice. It is because the moment a state
carries a pose and a clearance index, the set of places an aeroplane could be is
far too large to write down, and every algorithm here is written against that
interface so that it survives the transition.

**The answer for everywhere beats the answer for here.** A route says what to do
given that the aeroplane is on stand 2. A cost-to-go over the whole airport says
what to do, full stop — including from places nobody planned for, which on a real
surface is most of them. Part 1's Exercise 08 builds one; the capstone's Exercise
12 replans out of one without searching anything at all.

The capstone adds a third. Its search state is a *directed edge* carrying how much
of a spoken clearance has been consumed, because heading has to be part of the
state for a turn to be checkable, and because "via A, D, B, E" is a constraint you
search under, not a filter you apply afterwards.

---

## In the book

This is a hands-on companion to Steven M. LaValle, *Planning Algorithms*
(Cambridge, 2006). Part 1 is Chapter 2, Discrete Planning, complete: search
(Section 2.2), dynamic programming (Section 2.3), and logic-based planning
(Sections 2.4–2.5). Every guide and every exercise brief ends with an "In the
book" note giving the sections, figures and equations it covers, and the exact
renaming used.

The renaming is isomorphic — the taxi graphs are Figures 2.8 and 2.21 edge for
edge and cost for cost, the surfaces are Example 2.1's grids square for square,
and the two ground tasks are Example 2.6 and book Exercise 14 fact for fact. So
**every number the book prints is still a number your code has to produce.**
Figures 2.9, 2.12, 2.14, 2.15 and 2.20, equation (2.24) and book Exercise 1 are
all in the tests as literal expected values.

The capstone is not in LaValle, but almost all of it is: Chapters 3–4 are its
Exercise 01, Chapter 6 is its Exercise 10, Chapters 13 and 15 are its Exercise
08, and Chapter 8 is the shape of its Exercise 06's answer. What is *not* in the
book is the clearance — LaValle's planners are told what the obstacles are; this
one is told what it is *permitted* to do, by a sentence of English from a human
being, and has to refuse when the sentence does not reach the goal.
