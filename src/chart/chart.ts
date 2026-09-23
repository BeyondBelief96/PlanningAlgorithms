// An aerodrome chart, as a planner sees it.
//
// Part of the *given* library.  You never edit this file; you write against it.
//
// A taxiway chart is a set of named points joined by legs.  That is genuinely
// most of what a surface planner has to work with: the geometry matters
// eventually (the capstone spends twelve exercises on it), but routing happens
// on the lines, because lines are what clearances are phrased in terms of.
//
// Everything here is metres and seconds.

export type NodeId = number;
export type LinkId = number;

export const NO_NODE: NodeId = -1;
export const NO_LINK: LinkId = -1;

/**
 * What kind of pavement a leg runs over.  It decides the taxi speed, and it
 * decides how much trouble you are in if you end up somewhere unexpected.
 */
export type Surface = 'stand' | 'apron' | 'taxiway' | 'deice' | 'runway';

/**
 * How fast an aircraft taxis on each, in metres per second.  Real numbers,
 * rounded to something you can do in your head: 4 kt on stand, 10 kt on the
 * apron, 20 kt on a taxiway, 30 kt on a runway.
 *
 * Note that a runway is the fastest thing on the aerodrome.  Problem 02 is
 * where you find out what that does to a planner that is only counting time.
 */
export function taxiSpeed(surface: Surface): number {
  switch (surface) {
    case 'stand':
      return 2;
    case 'deice':
      return 2;
    case 'apron':
      return 5;
    case 'taxiway':
      return 10;
    case 'runway':
      return 15;
  }
}

/**
 * What a point on the chart is.
 *
 *   junction      an ordinary intersection or a bend
 *   stand         an aircraft parking position
 *   apronEntry    where the apron meets the taxiway system
 *   holdingPoint  a painted holding position short of a runway
 *   runwayEntry   the runway edge itself -- past the holding position
 *   deicePad      a de-icing position
 */
export type NodeKind =
  | 'junction'
  | 'stand'
  | 'apronEntry'
  | 'holdingPoint'
  | 'runwayEntry'
  | 'deicePad';

export interface ChartNode {
  readonly id: NodeId;
  /** "STAND 2", "HS 27 E", "A1" */
  readonly name: string;
  readonly kind: NodeKind;
  /** metres, east */
  readonly x: number;
  /** metres, north */
  readonly y: number;
  /**
   * For a holding point or runway entry: which runway is on the other side,
   * e.g. "09/27".  Empty otherwise.
   */
  readonly protects: string;
}

export interface Link {
  readonly id: LinkId;
  readonly from: NodeId;
  readonly to: NodeId;
  /** What you would say on the radio: "A", "B", "APRON", "STAND 2". */
  readonly taxiway: string;
  readonly surface: Surface;
  readonly lengthM: number;

  // Why a leg might not be available to a particular aeroplane today.
  maxWingspanM: number;
  maxWeightT: number;
  /** When true, only from -> to may be travelled. */
  oneWay: boolean;
  /** Works, snow, a broken-down tug. */
  closed: boolean;
  /** A junction with a history of wrong turns. */
  hotspot: boolean;
}

export class Chart {
  private readonly nodeList: ChartNode[] = [];
  private readonly linkList: Link[] = [];
  private incident: LinkId[][] = [];
  private byName = new Map<string, NodeId>();

  addNode(name: string, kind: NodeKind, x: number, y: number, protects = ''): NodeId {
    const id = this.nodeList.length;
    this.nodeList.push({ id, name, kind, x, y, protects });
    this.byName.set(name, id);
    return id;
  }

  /** Length is computed from the node positions.  NO_LINK if a name is unknown. */
  addLink(from: string, to: string, taxiway: string, surface: Surface): LinkId {
    const a = this.find(from);
    const b = this.find(to);
    if (a === NO_NODE || b === NO_NODE) return NO_LINK;

    const id = this.linkList.length;
    this.linkList.push({
      id,
      from: a,
      to: b,
      taxiway,
      surface,
      lengthM: this.straightLineM(a, b),
      maxWingspanM: 80,
      maxWeightT: 600,
      oneWay: false,
      closed: false,
      hotspot: false,
    });
    return id;
  }

  /** Call once, after all the links are added. */
  build(): void {
    this.incident = this.nodeList.map(() => []);
    for (const e of this.linkList) {
      this.incident[e.from]!.push(e.id);
      this.incident[e.to]!.push(e.id);
    }
  }

  /** A deep enough copy that closing a leg on the copy leaves the original alone. */
  clone(): Chart {
    const copy = new Chart();
    for (const n of this.nodeList) copy.addNode(n.name, n.kind, n.x, n.y, n.protects);
    for (const e of this.linkList) {
      const id = copy.addLink(
        this.nodeList[e.from]!.name,
        this.nodeList[e.to]!.name,
        e.taxiway,
        e.surface,
      );
      const made = copy.linkList[id]!;
      made.maxWingspanM = e.maxWingspanM;
      made.maxWeightT = e.maxWeightT;
      made.oneWay = e.oneWay;
      made.closed = e.closed;
      made.hotspot = e.hotspot;
    }
    copy.build();
    return copy;
  }

  get numNodes(): number {
    return this.nodeList.length;
  }

  get numLinks(): number {
    return this.linkList.length;
  }

  get nodes(): readonly ChartNode[] {
    return this.nodeList;
  }

  get links(): readonly Link[] {
    return this.linkList;
  }

  /**
   * Throws on purpose.  A half-written solution hands these a NO_NODE sooner or
   * later, and an exception naming the bad index beats `undefined` quietly
   * spreading through the arithmetic until a route comes out as NaN.
   */
  node(v: NodeId): ChartNode {
    const n = this.nodeList[v];
    if (!n) throw new RangeError(`no point ${v} on this chart`);
    return n;
  }

  link(e: LinkId): Link {
    const l = this.linkList[e];
    if (!l) throw new RangeError(`no leg ${e} on this chart`);
    return l;
  }

  /** NO_NODE when the name is not on the chart.  Case and spacing must match. */
  find(name: string): NodeId {
    return this.byName.get(name) ?? NO_NODE;
  }

  /**
   * Every leg touching v, in the order they were added.  Stable, so two correct
   * solutions produce the same route when several are equally good.
   */
  linksAt(v: NodeId): readonly LinkId[] {
    return this.incident[v] ?? [];
  }

  /** The other end of e.  NO_NODE if v is not an end of e. */
  other(e: LinkId, v: NodeId): NodeId {
    const l = this.linkList[e];
    if (!l) return NO_NODE;
    if (l.from === v) return l.to;
    if (l.to === v) return l.from;
    return NO_NODE;
  }

  /**
   * True when e can be travelled starting from v -- v is an end of it, and it
   * is not one-way in the other direction.  Says nothing about whether any
   * particular aeroplane is allowed on it; that is Problem 03.
   */
  travellable(e: LinkId, from: NodeId): boolean {
    const l = this.linkList[e];
    if (!l) return false;
    if (l.from !== from && l.to !== from) return false;
    if (l.oneWay && l.from !== from) return false;
    return true;
  }

  /** Straight-line distance, which is what Problem 07's estimate is built on. */
  straightLineM(a: NodeId, b: NodeId): number {
    const p = this.node(a);
    const q = this.node(b);
    return Math.hypot(p.x - q.x, p.y - q.y);
  }

  /** Heading in radians (0 = east, pi/2 = north) of e travelled from v. */
  headingFrom(e: LinkId, v: NodeId): number {
    const w = this.other(e, v);
    if (w === NO_NODE) return 0;
    return Math.atan2(this.node(w).y - this.node(v).y, this.node(w).x - this.node(v).x);
  }

  /**
   * The angle in radians between arriving at `at` along `incoming` and leaving
   * along `outgoing`.  0 is dead straight ahead, pi is a 180.
   */
  turnAngle(incoming: LinkId, outgoing: LinkId, at: NodeId): number {
    // The heading you arrived on is the reverse of the heading from `at` back
    // down the leg you came in along.
    const arrive = this.headingFrom(incoming, at) + Math.PI;
    const leave = this.headingFrom(outgoing, at);
    let d = leave - arrive;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  }
}
