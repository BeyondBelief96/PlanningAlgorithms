// ASCII pictures of the airport, for the demo.
//
// Given, but it is *not* part of the airport library: it calls zoneAt(), so it
// has to be handed whichever implementation is under test.

import {
  type DirectedEdge,
  eventName,
  pathAt,
  pathIsEmpty,
  pathLength,
  PI,
  type Pose,
  type Route,
  segmentAt,
  type TaxiGraph,
  type Vec2,
  type ZoneLayer,
  zoneName,
} from '../airport/index.js';
import { type Capstone, type Localization, startModeName, type ZoneQuery } from './types.js';

export interface RenderOptions {
  width?: number;
  height?: number;
  route?: Route | undefined;
  aircraft?: Pose | undefined;
  legend?: boolean;
}

function glyphFor(q: ZoneQuery): string {
  if (q.closed) return 'x';
  switch (q.zone) {
    case 'runway':
      return '#';
    case 'runwayProtected':
      return ':';
    case 'taxiway':
      return q.hotspot ? '!' : '=';
    case 'apron':
      return '-';
    case 'stand':
      return 'S';
    case 'deicing':
      return 'd';
    case 'shoulder':
      return ',';
    case 'forbidden':
      return 'X';
    case 'unknown':
      return ' ';
  }
}

export function renderAscii(
  steps: Capstone,
  layer: ZoneLayer,
  options: RenderOptions = {},
): string {
  const bounds = layer.bounds;
  if (bounds.isEmpty) return '(empty map)\n';
  const w = Math.max(20, options.width ?? 108);
  const h = Math.max(6, options.height ?? 30);
  const sx = (bounds.hi.x - bounds.lo.x) / (w - 1);
  const sy = (bounds.hi.y - bounds.lo.y) / (h - 1);

  const grid: string[][] = [];
  for (let row = 0; row < h; ++row) {
    // Row 0 is the top of the picture, which is the *north* edge of the map.
    const y = bounds.hi.y - row * sy;
    const line: string[] = [];
    for (let col = 0; col < w; ++col) {
      const x = bounds.lo.x + col * sx;
      line.push(glyphFor(steps.zoneAt(layer, { x, y })));
    }
    grid.push(line);
  }

  const plot = (p: Vec2, c: string): void => {
    const col = Math.round((p.x - bounds.lo.x) / sx);
    const row = Math.round((bounds.hi.y - p.y) / sy);
    if (col < 0 || col >= w || row < 0 || row >= h) return;
    grid[row]![col] = c;
  };

  for (const line of layer.holdShortLines) {
    const steps40 = 40;
    for (let i = 0; i <= steps40; ++i) plot(segmentAt(line.segment, i / steps40), '|');
  }

  const route = options.route;
  if (route && !pathIsEmpty(route.path)) {
    const length = pathLength(route.path);
    for (let s = 0; s <= length; s += 1.0) plot(pathAt(route.path, s).p, 'o');
    for (const stop of route.stops) plot(pathAt(route.path, stop.s).p, '*');
  }
  if (options.aircraft) plot(options.aircraft.p, 'A');

  let out = grid.map((row) => row.join('').replace(/ +$/, '')).join('\n') + '\n';
  if (options.legend !== false)
    out +=
      '  # runway   : protected   = taxiway   ! hotspot   - apron   S stand\n' +
      '  d de-icing , shoulder    X forbidden x closed    | hold short\n' +
      '  o route     * stop       A aircraft\n';
  return out;
}

const pad = (s: string, n: number): string => (s.length >= n ? s : s + ' '.repeat(n - s.length));
const padLeft = (s: string, n: number): string => (s.length >= n ? s : ' '.repeat(n - s.length) + s);

/** One line per gate, for reading what Exercise 02 produced. */
export function describeGates(gated: TaxiGraph): string {
  let out = '';
  for (const v of gated.vertices) {
    if (v.gate === 'none') continue;
    out +=
      `  ${padLeft(v.gate, 4)}  ${pad(v.name, 16)}  ` +
      `(${v.p.x.toFixed(0)}, ${v.p.y.toFixed(0)})  ` +
      `${zoneName(v.innerZone)} | ${zoneName(v.outerZone)}`;
    if (v.protects.length > 0) out += `  protects ${v.protects.join(' ')}`;
    if (v.holdShortId >= 0) out += '  [painted]';
    out += '\n';
  }
  return out;
}

export function describeRoute(gated: TaxiGraph, route: Route): string {
  let out =
    `  path ${pathLength(route.path).toFixed(1)} m, ` +
    `off-graph ${route.mergeLength.toFixed(1)} m, ` +
    `${route.graphRoute.length} graph edges\n`;

  const labels: string[] = [];
  let previous = '';
  for (const d of route.graphRoute as DirectedEdge[]) {
    const label = gated.edge(d.edge).taxiway;
    if (label === previous) continue;
    previous = label;
    labels.push(label);
  }
  out += `  via ${labels.join(' -> ')}\n`;

  for (const e of route.events)
    out += `  ${padLeft(e.s.toFixed(1), 8)} m  ${pad(eventName(e.kind), 22)}${e.message}\n`;
  for (const s of route.stops) out += `  STOP at ${s.s.toFixed(1)} m: ${s.reason}\n`;

  let fastest = 0;
  for (const p of route.speed) fastest = Math.max(fastest, p.v);
  if (fastest > 0)
    out += `  speed up to ${fastest.toFixed(1)} m/s, ${route.stops.length} stop(s)\n`;
  return out;
}

export function describeLocalization(localization: Localization): string {
  return (
    `  mode ${startModeName(localization.mode)}, zone ${zoneName(localization.zone)}\n` +
    `  cross-track ${localization.crossTrack.toFixed(2)} m, ` +
    `heading error ${((localization.headingError * 180) / PI).toFixed(2)} deg` +
    `${localization.onGuidanceLine ? ' (inside the capture window)' : ''}\n` +
    `  ${localization.detail}\n`
  );
}
