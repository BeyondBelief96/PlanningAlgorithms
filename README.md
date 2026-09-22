# Planning Algorithms in C++

A hands-on companion to Steven M. LaValle, *Planning Algorithms* (Cambridge, 2006).
Each chapter gets a written guide, a set of exercises you implement yourself, and a
reference solution you can read once you are done.

**Chapter 2, Discrete Planning, is complete.** It covers search (Section 2.2),
dynamic programming (Section 2.3), and logic-based planning (Sections 2.4–2.5).

Start here: **[docs/ch02/README.md](docs/ch02/README.md)**

**The capstone is complete too.** Twelve exercises building an autonomous taxi
planner for an airport surface: zone layers, gated graphs, ATC clearances,
Dubins merges, swept-footprint validation and an independent geofence monitor.
It is where the chapter's ideas stop being exercises.

Then here: **[docs/capstone/README.md](docs/capstone/README.md)**

## How the repo is laid out

```
include/planning/     the vocabulary: Problem, Plan, Transition, the example worlds
include/planning/airport/   and the capstone's: zones, graph, aircraft, clearance
src/                  the given library -- problem models, printing, book fixtures
docs/ch02/            the study guide, one file per section of the chapter
docs/capstone/        the capstone guide, one file per group of steps
exercises/ch02/       eleven stubs with TODOs.  This is where you write code.
exercises/capstone/   twelve more, one per step of the surface-movement design
solutions/            the reference implementation of each exercise
tests/                one test file per exercise, compiled against BOTH of the above
tools/                three demo programs
```

`include/` and `src/` are scaffolding: they give you a state space to plan in so
that you spend your time on the algorithms, not on parsing ASCII maps. You never
need to edit them.

The unusual part is that **the same test file is compiled twice** — once against
your `exercises/` code and once against `solutions/`. So the reference is not a
separate program you squint at; it is held to exactly the tests you are held to.

## Building

Requires CMake 3.21+ and a C++20 compiler. No third-party dependencies — the test
framework is a 150-line header in `tests/`.

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

# one chapter, or one exercise at a time, which is how you will actually work
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
./build/vs/Debug/grid_demo.exe                 # every search method, every map
./build/vs/Debug/grid_demo.exe tiny --render   # ...and draw the paths
./build/vs/Debug/logic_demo.exe                # Sections 2.4 and 2.5, end to end

./build/vs/Debug/taxi_demo.exe                 # the capstone, all eight scenarios
./build/vs/Debug/taxi_demo.exe map             # the airport, drawn
./build/vs/Debug/taxi_demo.exe gates           # what the gated graph looks like
./build/vs/Debug/taxi_demo.exe stand-departure -v
```

Each has a `_reference` twin (`grid_demo_reference.exe`, `taxi_demo_reference.exe`)
built against the solutions, so you can run the demos before you have written
anything.

## Working style

1. Read the guide for the section in `docs/`.
2. Read `exercises/<unit>/exNN_*/README.md` — the brief, the traps, the checks.
3. Write the code in the stub next to it.
4. `ctest -R <unit>.exNN --output-on-failure` until green.
5. Only then read `solutions/<unit>/exNN_*/` and compare.

The Chapter 2 tests are not arbitrary. Wherever the book prints a number, the
test checks that number: Figure 2.9, Figure 2.12, Figure 2.14, Figure 2.15,
Figure 2.20, equation (2.24), and book Exercise 1 are all in there as literal
expected values. If your value iteration matches Figure 2.14 column for column,
it is right.

The capstone has no book to check against, so its tests check the two things a
surface-movement planner is actually judged on: that the route is legal, and that
the refusals are correct. Three of its eight scenarios have no answer, and a
planner that finds one for them has failed.

## A note on the state transition graph

The one habit worth building from Chapter 2 onward: the graph is never the input.
`Problem` hands you `successors(x)` and `predecessors(x)` and nothing else, because
in every later chapter the state space is far too large to write down — and in
Part II it is not even countable. Every algorithm here is written against that
interface for the same reason the book writes them that way.

The capstone keeps the habit and adds one. Its search state is a *directed* edge
carrying how much of a spoken clearance has been consumed, because heading has to
be part of the state for a turn to be checkable and because "via A, D, B, E" is a
constraint you search under, not a filter you apply afterwards.
