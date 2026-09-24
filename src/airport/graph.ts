// The guidance-line graph, and the directed-edge state space every on-graph
// search in the capstone runs over.
//
// Part of the *given* library.  The container is given; splitting the raw graph
// at zone boundaries (Step 2) is Exercise 02, and filtering it (Step 5) is
// Exercise 05.

import {
  add,
  angleOf,
  distance,
  dot,
  EPS,
  type Pose,
  scale,
  type Segment,
  sub,
  type Vec2,
} from './geometry.js';
import type { ZoneClass } from './zones.js';

export type VertexId = number;
export type EdgeId = number;

export const NO_VERTEX: VertexId = -1;
export const NO_EDGE: EdgeId = -1;

/**
 * What crossing this vertex costs you.
 *
 *   none  an ordinary junction or a mid-line split
 *   soft  passable, but it generates a communication event and possibly a stop
 *         (apron/taxiway, the movement/non-movement boundary, stand entry)
 *   hard  impassable unless the clearance names this crossing
 */
export type GateKind = 'none' | 'soft' | 'hard';

export const GATE_KINDS: readonly GateKind[] = ['none', 'soft', 'hard'];

export interface Vertex {
  id: VertexId;
  p: Vec2;
  name: string;
  gate: GateKind;
  /** For a hard gate: the runway identifiers on the far side, e.g. ["18", "36"]. */
  protects: string[];
  /**
   * The hold-short line this gate sits on, or -1.  A hard gate without one is a
   * runway edge rather than a painted holding position.
   */
  holdShortId: number;
  /** What the gate separates, filled in by Exercise 02. */
  innerZone: ZoneClass;
  outerZone: ZoneClass;
}

export interface Edge {
  id: EdgeId;
  from: VertexId;
  to: VertexId;
  /** "A", "B", "RWY 09/27", "STAND 2", "APRON", "DEICE" */
  taxiway: string;
  zone: ZoneClass;
  hotspot: boolean;
  closed: boolean;
  /** When true, only from -> to may be travelled. */
  oneWay: boolean;
  /** metres */
  maxWingspan: number;
  maxWeightTonnes: number;
}

/**
 * A state of the on-graph search: an edge *and* the direction it is being
 * travelled, so that heading is part of the state and a turn at a junction can
 * be checked against the minimum turn radius.  Compare Part 1, where the state
 * was just a point.
 */
export interface DirectedEdge {
  readonly edge: EdgeId;
  readonly forward: boolean;
}

export const NO_DIRECTED_EDGE: DirectedEdge = { edge: NO_EDGE, forward: true };

export function directed(edge: EdgeId, forward = true): DirectedEdge {
  return { edge, forward };
}

export function isValidEdge(d: DirectedEdge): boolean {
  return d.edge !== NO_EDGE;
}

/** A dense index, so cost-to-go can live in a flat array. */
export function directedIndex(d: DirectedEdge): number {
  return d.edge * 2 + (d.forward ? 0 : 1);
}

export function reversed(d: DirectedEdge): DirectedEdge {
  return { edge: d.edge, forward: !d.forward };
}

export function sameDirectedEdge(a: DirectedEdge, b: DirectedEdge): boolean {
  return a.edge === b.edge && a.forward === b.forward;
}

export class TaxiGraph {
  private readonly vertexList: Vertex[] = [];
  private readonly edgeList: Edge[] = [];
  private incidentLists: EdgeId[][] = [];

  addVertex(p: Vec2, name: string): VertexId {
    const v: Vertex = {
      id: this.vertexList.length,
      p,
      name,
      gate: 'none',
      protects: [],
      holdShortId: -1,
      innerZone: 'unknown',
      outerZone: 'unknown',
    };
    this.vertexList.push(v);
    return v.id;
  }

  addEdge(from: VertexId, to: VertexId, taxiway: string): EdgeId {
    const e: Edge = {
      id: this.edgeList.length,
      from,
      to,
      taxiway,
      zone: 'unknown',
      hotspot: false,
      closed: false,
      oneWay: false,
      maxWingspan: 80.0,
      maxWeightTonnes: 600.0,
    };
    this.edgeList.push(e);
    return e.id;
  }

  get numVertices(): number {
    return this.vertexList.length;
  }

  get numEdges(): number {
    return this.edgeList.length;
  }

  get numDirectedEdges(): number {
    return 2 * this.numEdges;
  }

  get vertices(): readonly Vertex[] {
    return this.vertexList;
  }

  get edges(): readonly Edge[] {
    return this.edgeList;
  }

  /**
   * Bounds checked on purpose.  A half-written exercise hands these a NO_VERTEX
   * sooner or later, and an exception naming the bad index beats `undefined`
   * spreading quietly through the arithmetic until a route comes out as NaN.
   */
  vertex(v: VertexId): Vertex {
    const found = this.vertexList[v];
    if (!found) throw new RangeError(`no vertex ${v} on this graph`);
    return found;
  }

  edge(e: EdgeId): Edge {
    const found = this.edgeList[e];
    if (!found) throw new RangeError(`no edge ${e} on this graph`);
    return found;
  }

  findVertex(name: string): VertexId {
    for (const v of this.vertexList) if (v.name === name) return v.id;
    return NO_VERTEX;
  }

  /** The vertex within `tol` of p, or NO_VERTEX. */
  vertexAt(p: Vec2, tol = 1e-6): VertexId {
    for (const v of this.vertexList) if (distance(v.p, p) <= tol) return v.id;
    return NO_VERTEX;
  }

  geometry(e: EdgeId): Segment {
    const found = this.edge(e);
    return { a: this.vertex(found.from).p, b: this.vertex(found.to).p };
  }

  length(e: EdgeId): number {
    const g = this.geometry(e);
    return distance(g.a, g.b);
  }

  tail(d: DirectedEdge): VertexId {
    const e = this.edge(d.edge);
    return d.forward ? e.from : e.to;
  }

  head(d: DirectedEdge): VertexId {
    const e = this.edge(d.edge);
    return d.forward ? e.to : e.from;
  }

  tailPoint(d: DirectedEdge): Vec2 {
    return this.vertex(this.tail(d)).p;
  }

  headPoint(d: DirectedEdge): Vec2 {
    return this.vertex(this.head(d)).p;
  }

  heading(d: DirectedEdge): number {
    return angleOf(sub(this.headPoint(d), this.tailPoint(d)));
  }

  /** The pose at arclength s from the tail. */
  poseAlong(d: DirectedEdge, s: number): Pose {
    const a = this.tailPoint(d);
    const b = this.headPoint(d);
    const len = distance(a, b);
    const t = len < EPS ? 0 : Math.min(Math.max(s, 0), len) / len;
    return { p: add(a, scale(sub(b, a), t)), heading: angleOf(sub(b, a)) };
  }

  /** Arclength of the closest point on the edge to q, clamped to the edge. */
  projectOnto(d: DirectedEdge, q: Vec2): number {
    const a = this.tailPoint(d);
    const b = this.headPoint(d);
    const ab = sub(b, a);
    const dd = dot(ab, ab);
    if (dd < EPS) return 0;
    const t = Math.min(Math.max(dot(sub(q, a), ab) / dd, 0), 1);
    return t * Math.sqrt(dd);
  }

  incident(v: VertexId): readonly EdgeId[] {
    return this.incidentLists[v] ?? [];
  }

  /** Every directed edge that leaves v, honouring the one-way flag. */
  leaving(v: VertexId): DirectedEdge[] {
    const out: DirectedEdge[] = [];
    for (const e of this.incident(v)) {
      const found = this.edge(e);
      if (found.from === v) out.push({ edge: e, forward: true });
      if (found.to === v && !found.oneWay) out.push({ edge: e, forward: false });
    }
    return out;
  }

  /** Every directed edge that arrives at v, honouring the one-way flag. */
  arriving(v: VertexId): DirectedEdge[] {
    const out: DirectedEdge[] = [];
    for (const e of this.incident(v)) {
      const found = this.edge(e);
      if (found.to === v) out.push({ edge: e, forward: true });
      if (found.from === v && !found.oneWay) out.push({ edge: e, forward: false });
    }
    return out;
  }

  /** Rebuilds the incidence lists.  Call after a batch of addEdge() calls. */
  build(): void {
    this.incidentLists = this.vertexList.map(() => [] as EdgeId[]);
    for (const e of this.edgeList) {
      const from = this.incidentLists[e.from];
      if (!from) throw new RangeError(`edge ${e.id} starts at vertex ${e.from}, which does not exist`);
      from.push(e.id);
      if (e.to !== e.from) {
        const to = this.incidentLists[e.to];
        if (!to) throw new RangeError(`edge ${e.id} ends at vertex ${e.to}, which does not exist`);
        to.push(e.id);
      }
    }
  }
}
