// Kilo Field, and the busy hub: the two aerodromes Part 1 is set at.
//
// Part of the *given* library.
//
// Coordinates are metres, x east and y north, and they are the capstone's --
// see docs/capstone/07-the-map.md to see the same aerodrome with its polygons,
// shoulders and protected areas filled in.

import { Chart } from './chart.js';

/**
 * Kilo Field.
 *
 * ```
 *                                                      RWY 09/27
 *   RW09 ------------- RWM ---------- CR --------- ER --- RW27
 *                                     |             |
 *                                  HS 27 C       HS 27 E
 *                                     |             |
 *   F1 ---------- D1 -- HS36W - X36 - HS36E ---- C1 ---- E1      TWY B
 *    |             |            |
 *    | TWY F       | TWY D      | RWY 18/36 (north to R36)
 *    |  one-way    |  36 m max
 *   A1 ----------- A2                                            TWY A
 *    |
 *   G0 -- DEICE PAD
 *    |
 *   GA                                                           apron entry
 *    |
 *   P3 -- P2 -- P1 -- P0                                         APRON
 *    |     |     |          (P0 stub closed)
 *   S3    S2    S1                                               stands
 * ```
 *
 * Four things on this chart are there to make the problems problems:
 *
 * - **Taxiway F is one-way northbound.** So the quick way out is not the quick
 *   way in, and an arrival has to be routed differently from a departure.
 * - **Taxiway D takes 36 m.** An A320 is 35.8 m and clears it by twenty
 *   centimetres; anything larger goes round by F or not at all.
 * - **Taxiway B runs straight across runway 18/36.** Every eastbound departure
 *   crosses a live runway, so crossing permission is not an edge case here, it
 *   is the main route.
 * - **Stand 3 is a code E stand.** It is the only one a wide-body fits on, and
 *   the apron beyond it is not, which is where the refusal actually happens.
 */
export function kiloField(): Chart {
  return kiloFieldChart;
}

function buildKiloField(): Chart {
  const c = new Chart();

  // Stands and apron.
  c.addNode('STAND 1', 'stand', 170, 95);
  c.addNode('STAND 2', 'stand', 290, 95);
  c.addNode('STAND 3', 'stand', 410, 95);
  c.addNode('P0', 'junction', 110, 200);
  c.addNode('P1', 'junction', 170, 200);
  c.addNode('P2', 'junction', 290, 200);
  c.addNode('P3', 'junction', 410, 200);
  c.addNode('GA', 'apronEntry', 500, 200);

  // Taxiway A, the near parallel, and the de-icing spur.
  c.addNode('G0', 'junction', 680, 200);
  c.addNode('DEICE PAD', 'deicePad', 680, 280);
  c.addNode('A1', 'junction', 1000, 200);
  c.addNode('A2', 'junction', 1400, 200);

  // Taxiway B, the far parallel, and the two connectors up to it.
  c.addNode('F1', 'junction', 1000, 400);
  c.addNode('D1', 'junction', 1400, 400);

  // Runway 18/36 crosses B.
  c.addNode('HS 36 W', 'holdingPoint', 1525, 400, '18/36');
  c.addNode('X36', 'runwayEntry', 1600, 400, '18/36');
  c.addNode('HS 36 E', 'holdingPoint', 1675, 400, '18/36');
  c.addNode('R36', 'junction', 1600, 100, '18/36');

  // Taxiways C and E run south from B to runway 09/27.
  c.addNode('C1', 'junction', 1800, 400);
  c.addNode('HS 27 C', 'holdingPoint', 1800, 425, '09/27');
  c.addNode('CR', 'runwayEntry', 1800, 500, '09/27');
  c.addNode('E1', 'junction', 2300, 400);
  c.addNode('HS 27 E', 'holdingPoint', 2300, 425, '09/27');
  c.addNode('ER', 'runwayEntry', 2300, 500, '09/27');

  // Runway 09/27 itself.
  c.addNode('RW09', 'junction', 60, 500, '09/27');
  c.addNode('RWM', 'junction', 1000, 500, '09/27');
  c.addNode('RW27', 'junction', 2340, 500, '09/27');

  c.addLink('STAND 1', 'P1', 'STAND 1', 'stand');
  c.addLink('STAND 2', 'P2', 'STAND 2', 'stand');
  c.addLink('STAND 3', 'P3', 'STAND 3', 'stand');

  c.addLink('P0', 'P1', 'APRON', 'apron');
  c.addLink('P1', 'P2', 'APRON', 'apron');
  c.addLink('P2', 'P3', 'APRON', 'apron');
  c.addLink('P3', 'GA', 'APRON', 'apron');

  c.addLink('GA', 'G0', 'A', 'taxiway');
  c.addLink('G0', 'A1', 'A', 'taxiway');
  c.addLink('A1', 'A2', 'A', 'taxiway');

  c.addLink('G0', 'DEICE PAD', 'DEICE', 'deice');

  c.addLink('A1', 'F1', 'F', 'taxiway');
  c.addLink('A2', 'D1', 'D', 'taxiway');

  c.addLink('F1', 'D1', 'B', 'taxiway');
  c.addLink('D1', 'HS 36 W', 'B', 'taxiway');
  c.addLink('HS 36 W', 'X36', 'B', 'taxiway');
  c.addLink('X36', 'HS 36 E', 'B', 'taxiway');
  c.addLink('HS 36 E', 'C1', 'B', 'taxiway');
  c.addLink('C1', 'E1', 'B', 'taxiway');

  c.addLink('R36', 'X36', 'RWY 18/36', 'runway');

  c.addLink('C1', 'HS 27 C', 'C', 'taxiway');
  c.addLink('HS 27 C', 'CR', 'C', 'taxiway');
  c.addLink('E1', 'HS 27 E', 'E', 'taxiway');
  c.addLink('HS 27 E', 'ER', 'E', 'taxiway');

  c.addLink('RW09', 'RWM', 'RWY 09/27', 'runway');
  c.addLink('RWM', 'CR', 'RWY 09/27', 'runway');
  c.addLink('CR', 'ER', 'RWY 09/27', 'runway');
  c.addLink('ER', 'RW27', 'RWY 09/27', 'runway');

  for (const e of c.links) {
    // Kilo Field is a code D aerodrome: 52 m of wingspan on the movement area,
    // and the runways will take anything.
    e.maxWingspanM = e.surface === 'runway' ? 80 : 52;
    e.maxWeightT = e.surface === 'runway' ? 600 : 400;

    // F is northbound only.  F1 is the `to` end, so one-way means northbound.
    if (e.taxiway === 'F') {
      e.oneWay = true;
      e.hotspot = true;
    }

    // D was built narrow and never widened: code C only.  An A320 at 35.8 m
    // clears it by twenty centimetres.
    if (e.taxiway === 'D') e.maxWingspanM = 36;

    // The apron stub west of stand 1 is closed for resurfacing.
    if (e.taxiway === 'APRON' && c.node(e.from).name === 'P0') e.closed = true;

    // The F/B junction is the aerodrome's hotspot.
    if (e.taxiway === 'B' && c.node(e.from).name === 'F1') e.hotspot = true;

    // Stands 1 and 2 are code C; stand 3 was rebuilt for wide-bodies.  So the
    // only stand a 777 fits on is 3 -- and the apron it would have to taxi out
    // along is still code D, which is where the refusal actually lands.
    if (e.surface === 'stand') {
      e.maxWeightT = e.taxiway === 'STAND 3' ? 400 : 100;
      e.maxWingspanM = e.taxiway === 'STAND 3' ? 65 : 52;
    }
  }

  c.build();
  return c;
}

/**
 * A much larger aerodrome, so that "how much of it did you have to look at?" is
 * a question with a visible answer: 150 points and 261 legs.
 *
 * Deliberately a regular lattice, because a lattice is the worst case for an
 * uninformed search -- between any two points there are hundreds of routes of
 * exactly equal cost and nothing whatever to tell them apart.
 *
 * Rows run east-west and are named ALPHA through JULIET; columns run
 * north-south and are numbered.  Stands hang off the south edge.
 */
export function busyHub(): Chart {
  return busyHubChart;
}

function buildBusyHub(): Chart {
  const COLS = 15;
  const ROWS = 9;
  const ROW_NAMES = [
    'ALPHA',
    'BRAVO',
    'CHARLIE',
    'DELTA',
    'ECHO',
    'FOXTROT',
    'GOLF',
    'HOTEL',
    'JULIET',
  ];

  const c = new Chart();
  const point = (r: number, col: number) => `${String.fromCharCode(65 + r)}${col + 1}`;

  for (let r = 0; r < ROWS; ++r)
    for (let col = 0; col < COLS; ++col) c.addNode(point(r, col), 'junction', 200 * col, 200 * r);

  for (let col = 0; col < COLS; ++col) c.addNode(`STAND ${col + 1}`, 'stand', 200 * col, -90);

  for (let r = 0; r < ROWS; ++r)
    for (let col = 0; col + 1 < COLS; ++col)
      c.addLink(point(r, col), point(r, col + 1), ROW_NAMES[r]!, 'taxiway');

  for (let col = 0; col < COLS; ++col)
    for (let r = 0; r + 1 < ROWS; ++r)
      c.addLink(point(r, col), point(r + 1, col), `${col + 1}`, 'taxiway');

  for (let col = 0; col < COLS; ++col)
    c.addLink(`STAND ${col + 1}`, point(0, col), `STAND ${col + 1}`, 'stand');

  for (const e of c.links) {
    e.maxWingspanM = 65;
    e.maxWeightT = e.surface === 'stand' ? 100 : 400;
  }

  c.build();
  return c;
}

const kiloFieldChart = buildKiloField();
const busyHubChart = buildBusyHub();
