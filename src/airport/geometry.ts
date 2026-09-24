// 2D primitives for the surface-movement capstone.
//
// Part of the *given* library.  Nothing here is a planning algorithm; it is the
// vocabulary the capstone is written in, the same way src/chart/chart.ts is for
// Part 1.
//
//   Vec2      a point or a vector, metres, x east and y north
//   Pose      (p, heading), heading in radians, 0 = east, counter-clockwise
//   Polygon   a simple polygon, implicitly closed, stored counter-clockwise
//   Path      a sampled curve carrying arclength, heading and curvature
//
// Everything is metres and radians.

export const PI = Math.PI;
export const EPS = 1e-9;
export const INF = Number.POSITIVE_INFINITY;

/** Degrees to radians, because every angle a human writes down is in degrees. */
export function deg(degrees: number): number {
  return (degrees * PI) / 180;
}

// --- points and vectors -----------------------------------------------------

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function negate(a: Vec2): Vec2 {
  return { x: -a.x, y: -a.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/** The z component of the 3D cross product: positive when b is left of a. */
export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function norm(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalized(a: Vec2): Vec2 {
  const n = norm(a);
  return n < EPS ? { x: 0, y: 0 } : { x: a.x / n, y: a.y / n };
}

/** Rotated a quarter turn left (+90 degrees). */
export function perpLeft(a: Vec2): Vec2 {
  return { x: -a.y, y: a.x };
}

/** Rotated a quarter turn right (-90 degrees). */
export function perpRight(a: Vec2): Vec2 {
  return { x: a.y, y: -a.x };
}

export function rotate(a: Vec2, theta: number): Vec2 {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export function unitFromAngle(theta: number): Vec2 {
  return { x: Math.cos(theta), y: Math.sin(theta) };
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

// --- angles -----------------------------------------------------------------

/** Wraps into (-pi, pi]. */
export function wrapAngle(theta: number): number {
  let t = (theta + PI) % (2 * PI);
  if (t <= 0) t += 2 * PI;
  return t - PI;
}

/** Wraps into [0, 2pi). */
export function wrapAngle2Pi(theta: number): number {
  let t = theta % (2 * PI);
  if (t < 0) t += 2 * PI;
  return t;
}

/** The signed turn that takes `from` to `to`, in (-pi, pi]. */
export function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

// --- poses ------------------------------------------------------------------

export interface Pose {
  readonly p: Vec2;
  readonly heading: number;
}

export function pose(x: number, y: number, heading: number): Pose {
  return { p: { x, y }, heading };
}

export function forwardOf(q: Pose): Vec2 {
  return unitFromAngle(q.heading);
}

export function leftOf(q: Pose): Vec2 {
  return perpLeft(forwardOf(q));
}

/**
 * Signed lateral offset of `q` from the line through `frame`, positive to the
 * left of the heading.  This is the cross-track error.
 */
export function crossTrack(frame: Pose, q: Vec2): number {
  return dot(sub(q, frame.p), leftOf(frame));
}

/** Signed distance of `q` along the heading of `frame`. */
export function alongTrack(frame: Pose, q: Vec2): number {
  return dot(sub(q, frame.p), forwardOf(frame));
}

// --- segments and boxes -----------------------------------------------------

export interface Segment {
  readonly a: Vec2;
  readonly b: Vec2;
}

export function segmentDelta(s: Segment): Vec2 {
  return sub(s.b, s.a);
}

export function segmentLength(s: Segment): number {
  return norm(segmentDelta(s));
}

export function segmentAt(s: Segment, t: number): Vec2 {
  return add(s.a, scale(segmentDelta(s), t));
}

/**
 * An axis-aligned bounding box.  A fresh one is *empty* -- lo is +inf and hi is
 * -inf -- so that extending it with the first point gives exactly that point.
 */
export class Aabb {
  lo: Vec2 = { x: INF, y: INF };
  hi: Vec2 = { x: -INF, y: -INF };

  static of(...points: readonly Vec2[]): Aabb {
    const box = new Aabb();
    for (const p of points) box.extend(p);
    return box;
  }

  get isEmpty(): boolean {
    return this.lo.x > this.hi.x || this.lo.y > this.hi.y;
  }

  extend(p: Vec2): void {
    this.lo = { x: Math.min(this.lo.x, p.x), y: Math.min(this.lo.y, p.y) };
    this.hi = { x: Math.max(this.hi.x, p.x), y: Math.max(this.hi.y, p.y) };
  }

  extendBox(other: Aabb): void {
    if (other.isEmpty) return;
    this.extend(other.lo);
    this.extend(other.hi);
  }

  grown(m: number): Aabb {
    const box = new Aabb();
    if (this.isEmpty) return box;
    box.lo = { x: this.lo.x - m, y: this.lo.y - m };
    box.hi = { x: this.hi.x + m, y: this.hi.y + m };
    return box;
  }

  overlaps(other: Aabb): boolean {
    if (this.isEmpty || other.isEmpty) return false;
    return (
      this.lo.x <= other.hi.x &&
      other.lo.x <= this.hi.x &&
      this.lo.y <= other.hi.y &&
      other.lo.y <= this.hi.y
    );
  }

  contains(p: Vec2): boolean {
    return (
      !this.isEmpty && this.lo.x <= p.x && p.x <= this.hi.x && this.lo.y <= p.y && p.y <= this.hi.y
    );
  }
}

export function distancePointSegment(p: Vec2, s: Segment): number {
  const d = segmentDelta(s);
  const dd = dot(d, d);
  if (dd < EPS) return distance(p, s.a);
  const t = Math.min(1, Math.max(0, dot(sub(p, s.a), d) / dd));
  return distance(p, segmentAt(s, t));
}

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  const v = cross(sub(b, a), sub(c, a));
  if (v > 1e-12) return 1;
  if (v < -1e-12) return -1;
  return 0;
}

function onSegment(a: Vec2, b: Vec2, p: Vec2): boolean {
  return (
    Math.min(a.x, b.x) - 1e-12 <= p.x &&
    p.x <= Math.max(a.x, b.x) + 1e-12 &&
    Math.min(a.y, b.y) - 1e-12 <= p.y &&
    p.y <= Math.max(a.y, b.y) + 1e-12
  );
}

/** Proper or improper crossing of two closed segments. */
export function segmentsIntersect(s: Segment, t: Segment): boolean {
  const o1 = orientation(s.a, s.b, t.a);
  const o2 = orientation(s.a, s.b, t.b);
  const o3 = orientation(t.a, t.b, s.a);
  const o4 = orientation(t.a, t.b, s.b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(s.a, s.b, t.a)) return true;
  if (o2 === 0 && onSegment(s.a, s.b, t.b)) return true;
  if (o3 === 0 && onSegment(t.a, t.b, s.a)) return true;
  if (o4 === 0 && onSegment(t.a, t.b, s.b)) return true;
  return false;
}

// --- polygons ---------------------------------------------------------------

export type Polygon = readonly Vec2[];

export function makeRectangle(x0: number, y0: number, x1: number, y1: number): Polygon {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export function signedArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; ++i) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += cross(p, q);
  }
  return 0.5 * a;
}

/** Returns the polygon wound counter-clockwise. */
export function makeCounterClockwise(poly: Polygon): Polygon {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}

export function boundsOf(poly: Polygon): Aabb {
  const box = new Aabb();
  for (const p of poly) box.extend(p);
  return box;
}

export function centroidOf(poly: Polygon): Vec2 {
  const a = signedArea(poly);
  if (Math.abs(a) < EPS) {
    if (poly.length === 0) return { x: 0, y: 0 };
    let sum: Vec2 = { x: 0, y: 0 };
    for (const p of poly) sum = add(sum, p);
    return scale(sum, 1 / poly.length);
  }
  let c: Vec2 = { x: 0, y: 0 };
  for (let i = 0; i < poly.length; ++i) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    c = add(c, scale(add(p, q), cross(p, q)));
  }
  return scale(c, 1 / (6 * a));
}

/** Ray casting; points exactly on the boundary may answer either way. */
export function polygonContains(poly: Polygon, p: Vec2): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y) {
      const xCross = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < xCross) inside = !inside;
    }
  }
  return inside;
}

/** Distance from p to the boundary, whether p is inside or outside. */
export function distanceToBoundary(poly: Polygon, p: Vec2): number {
  let best = INF;
  for (let i = 0; i < poly.length; ++i) {
    const e: Segment = { a: poly[i]!, b: poly[(i + 1) % poly.length]! };
    best = Math.min(best, distancePointSegment(p, e));
  }
  return best;
}

/** Zero when p is inside, otherwise the distance to the nearest edge. */
export function distanceOutsidePolygon(poly: Polygon, p: Vec2): number {
  if (polygonContains(poly, p)) return 0;
  return distanceToBoundary(poly, p);
}

export function segmentIntersectsPolygon(poly: Polygon, s: Segment): boolean {
  if (polygonContains(poly, s.a) || polygonContains(poly, s.b)) return true;
  for (let i = 0; i < poly.length; ++i) {
    const e: Segment = { a: poly[i]!, b: poly[(i + 1) % poly.length]! };
    if (segmentsIntersect(e, s)) return true;
  }
  return false;
}

export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  for (const p of a) if (polygonContains(b, p)) return true;
  for (const p of b) if (polygonContains(a, p)) return true;
  for (let i = 0; i < a.length; ++i) {
    const ea: Segment = { a: a[i]!, b: a[(i + 1) % a.length]! };
    for (let j = 0; j < b.length; ++j) {
      const eb: Segment = { a: b[j]!, b: b[(j + 1) % b.length]! };
      if (segmentsIntersect(ea, eb)) return true;
    }
  }
  return false;
}

/** Solves  n0 . q = c0,  n1 . q = c1.  Returns undefined when parallel. */
function intersectLines(n0: Vec2, c0: number, n1: Vec2, c1: number): Vec2 | undefined {
  const det = cross(n0, n1);
  if (Math.abs(det) < 1e-12) return undefined;
  return { x: (c0 * n1.y - c1 * n0.y) / det, y: (n0.x * c1 - n1.x * c0) / det };
}

/**
 * Miter offset of a *convex* polygon: delta > 0 grows it, delta < 0 shrinks it.
 * Every polygon in the capstone map is convex, which is why this is enough.
 * Returns an empty polygon when the shrink collapses it -- which is how "this
 * aircraft does not fit here" is spelled.
 */
export function offsetConvex(poly: Polygon, delta: number): Polygon {
  if (poly.length < 3) return [];
  if (Math.abs(delta) < EPS) return poly;
  const ccw = makeCounterClockwise(poly);
  const n = ccw.length;

  // Outward normal and offset constant for every edge.  With counter-clockwise
  // winding the outward side of an edge is the one perpRight points to.
  const normal: Vec2[] = [];
  const constant: number[] = [];
  for (let i = 0; i < n; ++i) {
    const d = sub(ccw[(i + 1) % n]!, ccw[i]!);
    normal.push(normalized(perpRight(d)));
    constant.push(dot(ccw[i]!, normal[i]!) + delta);
  }

  const out: Vec2[] = [];
  for (let i = 0; i < n; ++i) {
    const prev = (i + n - 1) % n;
    const q = intersectLines(normal[prev]!, constant[prev]!, normal[i]!, constant[i]!);
    if (q) out.push(q);
  }
  if (out.length < 3) return [];
  if (signedArea(out) <= 1e-6) return [];
  // A shrink that folds the polygon inside out leaves vertices that violate
  // their own half-planes.  Reject the whole result rather than return garbage.
  for (const q of out)
    for (let i = 0; i < n; ++i) if (dot(q, normal[i]!) > constant[i]! + 1e-6) return [];
  return out;
}

/** The convex hull of a point set, counter-clockwise. */
export function convexHull(points: readonly Vec2[]): Polygon {
  if (points.length < 3) return [...points];
  const sorted = [...points].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
  const unique: Vec2[] = [];
  for (const p of sorted)
    if (unique.length === 0 || unique[unique.length - 1]!.x !== p.x || unique[unique.length - 1]!.y !== p.y)
      unique.push(p);
  if (unique.length < 3) return unique;

  const build = (list: readonly Vec2[]): Vec2[] => {
    const chain: Vec2[] = [];
    for (const p of list) {
      while (chain.length >= 2 && orientation(chain[chain.length - 2]!, chain[chain.length - 1]!, p) <= 0)
        chain.pop();
      chain.push(p);
    }
    chain.pop();
    return chain;
  };
  return [...build(unique), ...build([...unique].reverse())];
}

// --- paths ------------------------------------------------------------------

export interface PathSample {
  readonly p: Vec2;
  readonly heading: number;
  /** Signed: positive turns left. */
  readonly curvature: number;
  /** Arclength from the start of the path. */
  readonly s: number;
}

export interface Path {
  readonly samples: readonly PathSample[];
}

export const EMPTY_PATH: Path = { samples: [] };

/** Metres between path samples. */
export const DEFAULT_STEP = 1.0;

export function pathIsEmpty(path: Path): boolean {
  return path.samples.length === 0;
}

export function pathLength(path: Path): number {
  const last = path.samples[path.samples.length - 1];
  return last ? last.s : 0;
}

export function pathStartPose(path: Path): Pose {
  const first = path.samples[0];
  return first ? { p: first.p, heading: first.heading } : { p: { x: 0, y: 0 }, heading: 0 };
}

export function pathEndPose(path: Path): Pose {
  const last = path.samples[path.samples.length - 1];
  return last ? { p: last.p, heading: last.heading } : { p: { x: 0, y: 0 }, heading: 0 };
}

/** Linear interpolation, clamped to the ends. */
export function pathAt(path: Path, s: number): PathSample {
  const samples = path.samples;
  const first = samples[0];
  if (!first) return { p: { x: 0, y: 0 }, heading: 0, curvature: 0, s: 0 };
  const last = samples[samples.length - 1]!;
  if (s <= first.s) return first;
  if (s >= last.s) return last;

  let hi = 1;
  while (hi + 1 < samples.length && samples[hi]!.s < s) ++hi;
  const a = samples[hi - 1]!;
  const b = samples[hi]!;
  const span = b.s - a.s;
  const t = span < EPS ? 0 : (s - a.s) / span;
  return {
    p: add(a.p, scale(sub(b.p, a.p), t)),
    heading: a.heading + wrapAngle(b.heading - a.heading) * t,
    curvature: a.curvature + (b.curvature - a.curvature) * t,
    s,
  };
}

export function maxAbsCurvature(path: Path): number {
  let best = 0;
  for (const sample of path.samples) best = Math.max(best, Math.abs(sample.curvature));
  return best;
}

/** Total |dheading| accumulated along the path, in radians. */
export function totalTurning(path: Path): number {
  let total = 0;
  for (let i = 1; i < path.samples.length; ++i)
    total += Math.abs(wrapAngle(path.samples[i]!.heading - path.samples[i - 1]!.heading));
  return total;
}

export function straightPath(from: Pose, length: number, step = DEFAULT_STEP): Path {
  if (length < 0) return EMPTY_PATH;
  const n = Math.max(1, Math.ceil(length / Math.max(step, 1e-3)));
  const u = forwardOf(from);
  const samples: PathSample[] = [];
  for (let i = 0; i <= n; ++i) {
    const s = (length * i) / n;
    samples.push({ p: add(from.p, scale(u, s)), heading: from.heading, curvature: 0, s });
  }
  return { samples };
}

/** signedRadius > 0 turns left, < 0 turns right.  sweep must carry the same sign. */
export function arcPath(
  from: Pose,
  signedRadius: number,
  sweep: number,
  step = DEFAULT_STEP,
): Path {
  if (Math.abs(signedRadius) < EPS) return EMPTY_PATH;
  if (Math.abs(sweep) < 1e-12)
    return { samples: [{ p: from.p, heading: from.heading, curvature: 1 / signedRadius, s: 0 }] };
  if (sweep > 0 !== signedRadius > 0) return EMPTY_PATH; // sign mismatch: not an arc

  const r = signedRadius;
  const centre = add(from.p, scale({ x: -Math.sin(from.heading), y: Math.cos(from.heading) }, r));
  const arcLength = Math.abs(r * sweep);
  const n = Math.max(1, Math.ceil(arcLength / Math.max(step, 1e-3)));
  const samples: PathSample[] = [];
  for (let i = 0; i <= n; ++i) {
    const t = (sweep * i) / n;
    const h = from.heading + t;
    samples.push({
      p: add(centre, scale({ x: Math.sin(h), y: -Math.cos(h) }, r)),
      heading: h,
      curvature: 1 / r,
      s: Math.abs(r * t),
    });
  }
  return { samples };
}

export function concatenatePaths(parts: readonly Path[]): Path {
  const out: PathSample[] = [];
  let base = 0;
  for (const part of parts) {
    if (part.samples.length === 0) continue;
    let first = 0;
    const tail = out[out.length - 1];
    if (tail && distance(tail.p, part.samples[0]!.p) < 1e-6) first = 1;
    for (let i = first; i < part.samples.length; ++i) {
      const s = part.samples[i]!;
      out.push({ p: s.p, heading: s.heading, curvature: s.curvature, s: s.s + base });
    }
    base = out.length === 0 ? 0 : out[out.length - 1]!.s;
  }
  return { samples: out };
}

// --- Dubins curves (book Section 15.3.1) ------------------------------------
//
// Given, so that the capstone stays about the zone logic.  Implementing this
// from scratch is the natural extension exercise; see docs/capstone/04-merging.md.

export type DubinsWord = 'LSL' | 'RSR' | 'LSR' | 'RSL' | 'RLR' | 'LRL' | 'none';

/**
 * One of the three pieces of a Dubins word.  An arc carries a signed radius
 * (positive turns left) and a sweep with the same sign; a straight carries only
 * its length.
 */
export interface DubinsSegment {
  readonly isArc: boolean;
  readonly signedRadius: number;
  readonly sweep: number;
  readonly length: number;
}

export interface DubinsPath {
  readonly found: boolean;
  readonly word: DubinsWord;
  readonly length: number;
  readonly radius: number;
  readonly segments: readonly [DubinsSegment, DubinsSegment, DubinsSegment];
}

function arcSegment(signedRadius: number, sweep: number): DubinsSegment {
  return { isArc: true, signedRadius, sweep, length: Math.abs(signedRadius * sweep) };
}

function lineSegment(length: number): DubinsSegment {
  return { isArc: false, signedRadius: 0, sweep: 0, length };
}

const NO_SEGMENT: DubinsSegment = { isArc: false, signedRadius: 0, sweep: 0, length: 0 };

const NO_DUBINS: DubinsPath = {
  found: false,
  word: 'none',
  length: 0,
  radius: 0,
  segments: [NO_SEGMENT, NO_SEGMENT, NO_SEGMENT],
};

/**
 * Advances a pose along one segment.  Exposed because the merge ladder in
 * Exercise 08 wants the same primitive for its own arcs.
 */
export function advance(from: Pose, segment: DubinsSegment): Pose {
  if (!segment.isArc)
    return { p: add(from.p, scale(forwardOf(from), segment.length)), heading: from.heading };
  const r = segment.signedRadius;
  const centre = add(from.p, scale({ x: -Math.sin(from.heading), y: Math.cos(from.heading) }, r));
  const h = from.heading + segment.sweep;
  return { p: add(centre, scale({ x: Math.sin(h), y: -Math.cos(h) }, r)), heading: h };
}

function leftCentre(q: Pose, r: number): Vec2 {
  return add(q.p, scale(perpLeft(forwardOf(q)), r));
}

function rightCentre(q: Pose, r: number): Vec2 {
  return add(q.p, scale(perpRight(forwardOf(q)), r));
}

function leftSweep(from: number, to: number): number {
  return wrapAngle2Pi(to - from);
}

function rightSweep(from: number, to: number): number {
  return -wrapAngle2Pi(from - to);
}

/**
 * Builds a candidate, integrates it, and keeps it only if it really lands on
 * the target.  Cheap insurance against a sign slip in any one branch.
 */
function consider(
  from: Pose,
  to: Pose,
  word: DubinsWord,
  s0: DubinsSegment,
  s1: DubinsSegment,
  s2: DubinsSegment,
  radius: number,
  best: DubinsPath,
): DubinsPath {
  if (s0.length < -EPS || s1.length < -EPS || s2.length < -EPS) return best;
  const q = advance(advance(advance(from, s0), s1), s2);
  if (distance(q.p, to.p) > 1e-6) return best;
  if (Math.abs(wrapAngle(q.heading - to.heading)) > 1e-6) return best;
  const total = s0.length + s1.length + s2.length;
  if (best.found && total >= best.length) return best;
  return { found: true, word, length: total, radius, segments: [s0, s1, s2] };
}

export function dubinsShortestPath(from: Pose, to: Pose, radius: number): DubinsPath {
  let best = NO_DUBINS;
  if (radius <= EPS) return best;
  const r = radius;
  const h0 = from.heading;
  const h1 = to.heading;

  const cl0 = leftCentre(from, r);
  const cl1 = leftCentre(to, r);
  const cr0 = rightCentre(from, r);
  const cr1 = rightCentre(to, r);

  {
    // LSL: the external tangent between two left circles is parallel to the
    // line joining their centres.
    const v = sub(cl1, cl0);
    const d = norm(v);
    const sigma = d < 1e-9 ? h0 : angleOf(v);
    best = consider(
      from, to, 'LSL',
      arcSegment(r, leftSweep(h0, sigma)), lineSegment(d), arcSegment(r, leftSweep(sigma, h1)),
      r, best,
    );
  }
  {
    // RSR
    const v = sub(cr1, cr0);
    const d = norm(v);
    const sigma = d < 1e-9 ? h0 : angleOf(v);
    best = consider(
      from, to, 'RSR',
      arcSegment(-r, rightSweep(h0, sigma)), lineSegment(d), arcSegment(-r, rightSweep(sigma, h1)),
      r, best,
    );
  }
  {
    // LSR: the internal tangent needs the centres at least 2r apart.
    const v = sub(cr1, cl0);
    const d = norm(v);
    if (d >= 2 * r) {
      const sigma = angleOf(v) + Math.asin(Math.min(1, (2 * r) / d));
      const straight = Math.sqrt(Math.max(0, d * d - 4 * r * r));
      best = consider(
        from, to, 'LSR',
        arcSegment(r, leftSweep(h0, sigma)), lineSegment(straight), arcSegment(-r, rightSweep(sigma, h1)),
        r, best,
      );
    }
  }
  {
    // RSL
    const v = sub(cl1, cr0);
    const d = norm(v);
    if (d >= 2 * r) {
      const sigma = angleOf(v) - Math.asin(Math.min(1, (2 * r) / d));
      const straight = Math.sqrt(Math.max(0, d * d - 4 * r * r));
      best = consider(
        from, to, 'RSL',
        arcSegment(-r, rightSweep(h0, sigma)), lineSegment(straight), arcSegment(r, leftSweep(sigma, h1)),
        r, best,
      );
    }
  }
  {
    // LRL and RLR: three arcs, reachable only when the endpoints are close.
    const vl = sub(cl1, cl0);
    const dl = norm(vl);
    if (dl > 1e-9 && dl <= 4 * r) {
      const base = angleOf(vl);
      const delta = Math.acos(Math.min(1, Math.max(-1, dl / (4 * r))));
      for (const sign of [1, -1]) {
        const cm = add(cl0, scale(unitFromAngle(base + sign * delta), 2 * r));
        const t1 = scale(add(cl0, cm), 0.5);
        const t2 = scale(add(cm, cl1), 0.5);
        const ha = angleOf(perpLeft(sub(t1, cl0)));
        const hb = angleOf(perpRight(sub(t2, cm)));
        best = consider(
          from, to, 'LRL',
          arcSegment(r, leftSweep(h0, ha)), arcSegment(-r, rightSweep(ha, hb)), arcSegment(r, leftSweep(hb, h1)),
          r, best,
        );
      }
    }
    const vr = sub(cr1, cr0);
    const dr = norm(vr);
    if (dr > 1e-9 && dr <= 4 * r) {
      const base = angleOf(vr);
      const delta = Math.acos(Math.min(1, Math.max(-1, dr / (4 * r))));
      for (const sign of [1, -1]) {
        const cm = add(cr0, scale(unitFromAngle(base + sign * delta), 2 * r));
        const t1 = scale(add(cr0, cm), 0.5);
        const t2 = scale(add(cm, cr1), 0.5);
        const ha = angleOf(perpRight(sub(t1, cr0)));
        const hb = angleOf(perpLeft(sub(t2, cm)));
        best = consider(
          from, to, 'RLR',
          arcSegment(-r, rightSweep(h0, ha)), arcSegment(r, leftSweep(ha, hb)), arcSegment(-r, rightSweep(hb, h1)),
          r, best,
        );
      }
    }
  }
  return best;
}

export function renderDubins(from: Pose, dubins: DubinsPath, step = DEFAULT_STEP): Path {
  if (!dubins.found) return EMPTY_PATH;
  let q = from;
  const parts: Path[] = [];
  for (const s of dubins.segments) {
    if (s.length < 1e-9) continue;
    parts.push(s.isArc ? arcPath(q, s.signedRadius, s.sweep, step) : straightPath(q, s.length, step));
    q = advance(q, s);
  }
  return concatenatePaths(parts);
}
