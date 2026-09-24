// The zone layer of Step 1: polygons, their policies, and a broadphase index
// over them.
//
// Part of the *given* library.  The container and the index are given; the
// semantic queries on top of them -- which zone is this point in, what does the
// footprint straddle, what does the layer look like in configuration space --
// are Exercise 01.

import {
  Aabb,
  boundsOf,
  makeCounterClockwise,
  type Polygon,
  type Segment,
  type Vec2,
} from './geometry.js';

/**
 * The zone classes of Step 1.  The ARINC 816 feature that produces each one is
 * named in the comment; the capstone map fakes those features with rectangles.
 */
export type ZoneClass =
  | 'unknown' //          off the map, or unpaved
  | 'runway' //           AM_RunwayElement, AM_RunwayIntersection, blast pads, stopways
  | 'runwayProtected' //  between the runway edge and the hold-short lines
  | 'taxiway' //          AM_TaxiwayElement
  | 'apron' //            AM_ApronElement
  | 'stand' //            AM_ParkingStandArea
  | 'deicing' //          AM_DeicingArea
  | 'shoulder' //         AM_TaxiwayShoulder, AM_RunwayShoulder -- not load bearing
  | 'forbidden'; //       service roads, closed areas, structures, unpaved, water

/** Every zone class, for the tests and the exhaustive switches. */
export const ZONE_CLASSES: readonly ZoneClass[] = [
  'unknown',
  'runway',
  'runwayProtected',
  'taxiway',
  'apron',
  'stand',
  'deicing',
  'shoulder',
  'forbidden',
];

/** What you would write in a message to a human being. */
export function zoneName(zone: ZoneClass): string {
  switch (zone) {
    case 'unknown':
      return 'unknown';
    case 'runway':
      return 'runway';
    case 'runwayProtected':
      return 'runway protected';
    case 'taxiway':
      return 'taxiway';
    case 'apron':
      return 'apron';
    case 'stand':
      return 'stand';
    case 'deicing':
      return 'de-icing';
    case 'shoulder':
      return 'shoulder';
    case 'forbidden':
      return 'forbidden';
  }
}

/** The permission policy of Step 1, one row of the table per zone class. */
export interface ZonePolicy {
  /** May the free-space planner operate here at all. */
  readonly offGraphAllowed: boolean;
  /** May a gear tyre touch it. */
  readonly loadBearing: boolean;
  /** Entering needs an ATC clearance (hard gate). */
  readonly requiresClearance: boolean;
  /** Even an overhanging wing may not be here. */
  readonly wingtipForbidden: boolean;
  /** Only if the mission asks for it (de-icing). */
  readonly missionOnly: boolean;
  /** m/s */
  readonly speedLimit: number;
}

function policy(
  offGraphAllowed: boolean,
  loadBearing: boolean,
  requiresClearance: boolean,
  wingtipForbidden: boolean,
  missionOnly: boolean,
  speedLimit: number,
): ZonePolicy {
  return { offGraphAllowed, loadBearing, requiresClearance, wingtipForbidden, missionOnly, speedLimit };
}

export function policyFor(zone: ZoneClass): ZonePolicy {
  switch (zone) {
    case 'runway':
      return policy(false, true, true, false, false, 15.0);
    case 'runwayProtected':
      // Treated as runway: entry only on-graph, only with a clearance.
      return policy(false, true, true, false, false, 10.0);
    case 'taxiway':
      // On-graph travel; off-graph only to capture the centreline.
      return policy(false, true, false, false, false, 10.0);
    case 'apron':
      return policy(true, true, false, false, false, 5.0);
    case 'stand':
      return policy(true, true, false, false, false, 2.5);
    case 'deicing':
      return policy(true, true, false, false, true, 2.5);
    case 'shoulder':
      // Not load bearing: gear forbidden, wing overhang fine.
      return policy(false, false, false, false, false, 5.0);
    case 'forbidden':
      return policy(false, false, false, true, false, 0.0);
    case 'unknown':
      return policy(false, false, false, false, false, 0.0);
  }
}

/**
 * Higher wins when two polygons cover the same point.  The ordering is "most
 * restrictive first": a service road painted over an apron is still a service
 * road, and a taxiway that crosses a runway is, where it crosses, a runway.
 */
export function zonePriority(zone: ZoneClass): number {
  switch (zone) {
    case 'forbidden':
      return 100;
    case 'runway':
      return 90;
    case 'runwayProtected':
      return 80;
    case 'deicing':
      return 70;
    case 'stand':
      return 60;
    case 'taxiway':
      return 50;
    case 'apron':
      return 40;
    case 'shoulder':
      return 30;
    case 'unknown':
      return 0;
  }
}

/** One area feature of the map. */
export interface ZonePolygon {
  id: number;
  zone: ZoneClass;
  name: string;
  outline: Polygon;
  /**
   * Runway identifiers this polygon belongs to, e.g. ["09", "27"].  Empty for
   * everything that is not a runway or a runway protected area.
   */
  idents: string[];
  /** Overlay polygons never decide the zone class; they only contribute flags. */
  overlay: boolean;
  /** AM_Hotspot: allowed, but penalised and slowed. */
  hotspot: boolean;
  /** NOTAM or construction. */
  closed: boolean;
}

/** A blank polygon record, so a caller only spells out what it cares about. */
export function zonePolygon(fields: Partial<ZonePolygon> = {}): ZonePolygon {
  return {
    id: -1,
    zone: 'unknown',
    name: '',
    outline: [],
    idents: [],
    overlay: false,
    hotspot: false,
    closed: false,
    ...fields,
  };
}

/**
 * AM_TaxiwayHoldingPosition, kept as explicit geometry because it is the single
 * most important boundary on the airport.
 */
export interface HoldShortLine {
  id: number;
  name: string;
  segment: Segment;
  /** Runway identifiers, e.g. ["36"]. */
  protects: string[];
}

/**
 * The zone layer.  Storage plus a uniform-grid broadphase, so "which polygons
 * could possibly cover this box" is cheap.
 */
export class ZoneLayer {
  name = '';

  private readonly polygonList: ZonePolygon[] = [];
  private readonly holdShortList: HoldShortLine[] = [];
  private polygonBounds: Aabb[] = [];
  private holdShortBounds: Aabb[] = [];
  private grid: number[][] = [];
  private holdShortGrid: number[][] = [];
  private box = new Aabb();
  private readonly cell = 50.0;
  private cellsX = 0;
  private cellsY = 0;

  add(polygon: ZonePolygon): number {
    const copy: ZonePolygon = {
      ...polygon,
      id: this.polygonList.length,
      outline: makeCounterClockwise(polygon.outline),
      idents: [...polygon.idents],
    };
    this.polygonList.push(copy);
    return copy.id;
  }

  addHoldShort(line: HoldShortLine): number {
    const copy: HoldShortLine = {
      ...line,
      id: this.holdShortList.length,
      protects: [...line.protects],
    };
    this.holdShortList.push(copy);
    return copy.id;
  }

  /** Must be called once after the last add().  Builds the broadphase. */
  build(): void {
    this.box = new Aabb();
    this.polygonBounds = [];
    this.holdShortBounds = [];

    for (const poly of this.polygonList) {
      const b = boundsOf(poly.outline);
      this.polygonBounds.push(b);
      this.box.extendBox(b);
    }
    for (const line of this.holdShortList) {
      const b = Aabb.of(line.segment.a, line.segment.b);
      this.holdShortBounds.push(b);
      this.box.extendBox(b);
    }

    if (this.box.isEmpty) {
      this.cellsX = 0;
      this.cellsY = 0;
      this.grid = [];
      this.holdShortGrid = [];
      return;
    }

    this.cellsX = Math.max(1, Math.ceil((this.box.hi.x - this.box.lo.x) / this.cell) + 1);
    this.cellsY = Math.max(1, Math.ceil((this.box.hi.y - this.box.lo.y) / this.cell) + 1);
    const cells = this.cellsX * this.cellsY;
    this.grid = Array.from({ length: cells }, () => [] as number[]);
    this.holdShortGrid = Array.from({ length: cells }, () => [] as number[]);

    const stamp = (b: Aabb, id: number, into: number[][]): void => {
      const clamp = (v: number, hi: number): number => Math.min(Math.max(v, 0), hi);
      const x0 = clamp(Math.floor((b.lo.x - this.box.lo.x) / this.cell), this.cellsX - 1);
      const x1 = clamp(Math.floor((b.hi.x - this.box.lo.x) / this.cell), this.cellsX - 1);
      const y0 = clamp(Math.floor((b.lo.y - this.box.lo.y) / this.cell), this.cellsY - 1);
      const y1 = clamp(Math.floor((b.hi.y - this.box.lo.y) / this.cell), this.cellsY - 1);
      for (let cy = y0; cy <= y1; ++cy)
        for (let cx = x0; cx <= x1; ++cx) into[cy * this.cellsX + cx]!.push(id);
    };

    this.polygonBounds.forEach((b, i) => stamp(b, i, this.grid));
    this.holdShortBounds.forEach((b, i) => stamp(b, i, this.holdShortGrid));
  }

  get polygons(): readonly ZonePolygon[] {
    return this.polygonList;
  }

  get holdShortLines(): readonly HoldShortLine[] {
    return this.holdShortList;
  }

  /**
   * Bounds checked, for the same reason TaxiGraph.vertex() is.  The object it
   * returns is the live one, so "what if the hotspot were over there instead"
   * work can edit it -- call build() again after changing any geometry.
   */
  polygon(id: number): ZonePolygon {
    const poly = this.polygonList[id];
    if (!poly) throw new RangeError(`no zone polygon ${id} in this layer`);
    return poly;
  }

  holdShortLine(id: number): HoldShortLine {
    const line = this.holdShortList[id];
    if (!line) throw new RangeError(`no holding position ${id} in this layer`);
    return line;
  }

  findPolygon(name: string): number {
    for (const poly of this.polygonList) if (poly.name === name) return poly.id;
    return -1;
  }

  get bounds(): Aabb {
    return this.box;
  }

  /**
   * Broadphase: polygon ids whose bounding box overlaps the query, in
   * increasing id order.  Never a false negative, sometimes a false positive.
   */
  candidates(query: Aabb): number[] {
    return this.gather(this.grid, this.polygonBounds, query);
  }

  candidatesAt(p: Vec2): number[] {
    return this.candidates(Aabb.of(p));
  }

  holdShortCandidates(query: Aabb): number[] {
    return this.gather(this.holdShortGrid, this.holdShortBounds, query);
  }

  private gather(grid: number[][], boxes: readonly Aabb[], query: Aabb): number[] {
    if (grid.length === 0 || this.box.isEmpty || !this.box.grown(this.cell).overlaps(query))
      return [];
    const clamp = (v: number, hi: number): number => Math.min(Math.max(v, 0), hi);
    const x0 = clamp(Math.floor((query.lo.x - this.box.lo.x) / this.cell), this.cellsX - 1);
    const x1 = clamp(Math.floor((query.hi.x - this.box.lo.x) / this.cell), this.cellsX - 1);
    const y0 = clamp(Math.floor((query.lo.y - this.box.lo.y) / this.cell), this.cellsY - 1);
    const y1 = clamp(Math.floor((query.hi.y - this.box.lo.y) / this.cell), this.cellsY - 1);

    const seen = new Set<number>();
    for (let cy = y0; cy <= y1; ++cy)
      for (let cx = x0; cx <= x1; ++cx)
        for (const id of grid[cy * this.cellsX + cx]!) {
          if (!boxes[id]!.overlaps(query)) continue;
          seen.add(id);
        }
    return [...seen].sort((a, b) => a - b);
  }
}
