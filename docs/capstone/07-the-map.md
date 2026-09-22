# 7. Kilo Field

The capstone airport. Axis-aligned rectangles, metres, x east and y north. It is
a toy, but it has one of everything the twelve steps need: two runways, a
protected area around each, two routes between the apron and the runway, a
hotspot, a de-icing pad, a closed area, a service road, shoulders, a terminal to
clip a wingtip on, and four holding positions.

`src/airport/airport_map.cpp` is the authority; this page is the map you read
while debugging.

```
./build/vs/Debug/taxi_demo.exe map
```

```
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
###########################################################################################################   RWY 09/27
###########################################################################################################
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
                                            ,,,,,,,,,,,,,,,,,,,,,,,,|::##::|,,,|||,,,,,,,,,,,,,,,,,,,||||
                                            !!!=====================|::##::|============================   TWY B
                                            !!,,,,,,,,,,,,,,,,==,,,,|::##::|,,,,,,,,,,,,,,,,,,,,,,,,,,,,
                                            !!                ==    :::##::                                RWY 18/36
                           ddddddd          ==                ==    :::##::                                F | D
     xx----------------    ddddddd  XXXXXXX ==                ==    :::##::
     xx----------------,,,,,,,=,,,,,,,,,,,,,==,,,,,,,,,,,,,,,,==    :::##::
     xx------------------------------------------------------==    :::##::                                TWY A
     xx----------------,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,    :::##::
     xx----------------                                             :::##::
       SS   SSS  SSS                                                :::##::                                stands
     XXXXXXXXXXXXXXXXXX                                                                                    terminal
```

## Areas

| Zone | Name | x | y | Identifiers |
|---|---|---|---|---|
| Runway | RWY 09/27 | 0 – 2400 | 475 – 525 | 09, 27 |
| Protected | RWY 09/27 protected S | 0 – 2400 | 425 – 475 | 09, 27 |
| Protected | RWY 09/27 protected N | 0 – 2400 | 525 – 575 | 09, 27 |
| Runway | RWY 18/36 | 1575 – 1625 | 60 – 420 | 18, 36 |
| Protected | RWY 18/36 protected W | 1525 – 1575 | 60 – 420 | 18, 36 |
| Protected | RWY 18/36 protected E | 1625 – 1675 | 60 – 420 | 18, 36 |
| Taxiway | TWY A | 500 – 1415 | 185 – 215 | |
| Taxiway | TWY F | 985 – 1015 | 185 – 415 | |
| Taxiway | TWY D | 1385 – 1415 | 185 – 415 | |
| Taxiway | TWY B | 985 – 2315 | 385 – 415 | |
| Taxiway | TWY C | 1785 – 1815 | 385 – 500 | |
| Taxiway | TWY E | 2285 – 2315 | 385 – 500 | |
| Taxiway | TWY G (de-ice link) | 665 – 695 | 185 – 235 | |
| Apron | APRON NORTH | 100 – 500 | 130 – 280 | |
| Stand | STAND 1 / 2 / 3 | 140–200 / 260–320 / 380–440 | 40 – 130 | |
| De-icing | DEICE PAD | 600 – 760 | 235 – 315 | |
| Forbidden | TERMINAL | 100 – 500 | 0 – 40 | |
| Forbidden | SERVICE ROAD | 790 – 960 | 250 – 270 | |
| Shoulder | eight strips beside A, B, D and F | | | |
| Overlay | HOTSPOT 1 (F/B junction) | 950 – 1050 | 350 – 450 | |
| Overlay | APRON WEST CLOSED | 100 – 155 | 130 – 280 | |

Note the deliberate overlaps. Taxiway B's polygon runs straight through runway
18/36 and both of its protected strips; the taxiway shoulders run under taxiways
C and E. That is what `zonePriority()` is for, and the tests in Exercise 01 walk
across exactly those boundaries.

## Holding positions

| Name | Segment | Protects |
|---|---|---|
| HS 36 W | (1525, 375) – (1525, 425) | 18, 36 |
| HS 36 E | (1675, 375) – (1675, 425) | 18, 36 |
| HS 27 C | (1775, 425) – (1825, 425) | 09, 27 |
| HS 27 E | (2275, 425) – (2325, 425) | 09, 27 |

They span slightly wider than the taxiway, as painted lines do.

## The raw graph: 24 vertices, 25 edges

| Vertex | Position | Vertex | Position |
|---|---|---|---|
| S1 / S2 / S3 | (170, 95) (290, 95) (410, 95) | F1 | (1000, 400) |
| P0 | (110, 200) | D1 | (1400, 400) |
| P1 / P2 / P3 | (170, 200) (290, 200) (410, 200) | X36 | (1600, 400) |
| GA | (500, 200) | C1 | (1800, 400) |
| G0 | (680, 200) | CR | (1800, 500) |
| DI | (680, 280) | E1 | (2300, 400) |
| A1 | (1000, 200) | ER | (2300, 500) |
| A2 | (1400, 200) | RW09 / RWM / RW27 | (60, 500) (1000, 500) (2340, 500) |
| | | R36 / R18 | (1600, 100) (1600, 410) |

Edges, by label:

```
STAND 1/2/3   S1-P1, S2-P2, S3-P3
APRON         P0-P1, P1-P2, P2-P3, P3-GA
A             GA-G0, G0-A1, A1-A2
DEICE         G0-DI
F             A1-F1                        one-way northbound
D             A2-D1
B             F1-D1, D1-X36, X36-C1, C1-E1
C             C1-CR
E             E1-ER
RWY 09/27     RW09-RWM, RWM-CR, CR-ER, ER-RW27
RWY 18/36     R36-X36, X36-R18
```

Every taxiway, apron and stand edge has `maxWingspan = 52` (code D). The runway
edges have 80.

## The gated graph: 36 vertices, 37 edges

Twelve edges cross a zone boundary somewhere in the middle, which adds twelve
vertices and twelve edges. Thirteen vertices end up as gates:

```
soft  GA              (500, 200)    apron | taxiway
soft  STAND 1 gate    (170, 130)    apron | stand
soft  STAND 2 gate    (290, 130)    apron | stand
soft  STAND 3 gate    (410, 130)    apron | stand
soft  DEICE gate      (680, 235)    taxiway | de-icing
hard  HS 36 W         (1525, 400)   taxiway | runway protected     protects 18 36  [painted]
hard  EDGE RWY 18/36  (1575, 400)   runway protected | runway      protects 18 36
hard  EDGE RWY 18/36  (1625, 400)   runway protected | runway      protects 18 36
hard  HS 36 E         (1675, 400)   taxiway | runway protected     protects 18 36  [painted]
hard  HS 27 C         (1800, 425)   taxiway | runway protected     protects 09 27  [painted]
hard  EDGE RWY 09/27  (1800, 475)   runway protected | runway      protects 09 27
hard  HS 27 E         (2300, 425)   taxiway | runway protected     protects 09 27  [painted]
hard  EDGE RWY 09/27  (2300, 475)   runway protected | runway      protects 09 27
```

## Things the map is built to make happen

**Two equal routes.** Connectors F and D both join taxiway A to taxiway B, and on
a rectilinear grid the two routes to the runway are *exactly* the same length.
The hotspot is the only thing that separates them, which makes the hotspot
penalty easy to see working.

**A one-way taxiway.** F is northbound only, so the inbound scenario cannot use
it and the edge filter has something directional to do.

**A closed edge.** The west end of the apron is closed by the overlay, which
strikes out exactly one edge — the dead-end stub to P0.

**A de-icing pad off the main route.** Reachable, but only when the clearance
says `VIA ... DEICE ...`.

**A terminal to clip a wingtip on.** Stand 2 is 60 m wide and an A320 is 35.8 m
across; the terminal ends 55 m from the stand line. Taxi along the front of it
and Exercise 10 has something to report.

**A runway with no exits to the west.** Everything is east of x = 1800, so a
landing on runway 27 that rolls out past the exits has nowhere legal to go, and
the planner has to say so instead of turning round.
