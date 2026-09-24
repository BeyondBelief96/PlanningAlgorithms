// Exercise 09 builds its own little world: a rectangle of apron with a wall
// across most of it.  Nothing here depends on Kilo Field or on the rest of the
// pipeline, because the point of the exercise is the search, not the map.
import { describe, expect, it } from 'vitest';
import {
  deg,
  distance,
  makeRectangle,
  maxAbsCurvature,
  type Path,
  pathAt,
  pathEndPose,
  pathLength,
  type Pose,
  wrapAngle,
  type ZoneClass,
  ZoneLayer,
  zonePolygon,
} from '../../src/airport/index.js';
import {
  defaultHybridAStarParams,
  type HybridAStarParams,
  type MergeCandidate,
} from '../../src/capstone/types.js';
import { impl, implName } from './impl.js';

/** An apron 400 by 200, with a wall from the south edge up to `wallTop`. */
function yard(wallTop: number): ZoneLayer {
  const layer = new ZoneLayer();
  layer.add(zonePolygon({ zone: 'apron', name: 'APRON', outline: makeRectangle(0, 0, 400, 200) }));
  if (wallTop > 0)
    layer.add(
      zonePolygon({
        zone: 'forbidden',
        name: 'WALL',
        outline: makeRectangle(180, 0, 220, wallTop),
      }),
    );
  layer.build();
  return layer;
}

function at(x: number, y: number, heading: number): MergeCandidate {
  return {
    edge: { edge: -1, forward: true },
    s: 0,
    target: { p: { x, y }, heading },
    routeIndex: 0,
    costToGo: 0,
    leadIn: 0,
  };
}

function params(): HybridAStarParams {
  return {
    ...defaultHybridAStarParams(),
    radius: 25.0,
    primitiveLength: 8.0,
    positionResolution: 4.0,
    maxExpansions: 40000,
  };
}

const APRON: ZoneClass[] = ['apron'];
const from = (x: number, y: number, heading: number): Pose => ({ p: { x, y }, heading });

function stayedInside(layer: ZoneLayer, path: Path, zone: ZoneClass): boolean {
  const length = pathLength(path);
  for (let s = 0; s <= length + 1e-9; s += 1.0)
    if (impl.zoneAt(layer, pathAt(path, s).p).zone !== zone) return false;
  return true;
}

describe(`ex09 hybrid A* (${implName})`, () => {
  it('solves an open yard with the analytic expansion alone', () => {
    const layer = yard(0);
    const merge = impl.planHybridAStar(layer, from(50, 50, 0), at(350, 50, 0), APRON, params());
    expect(merge.found).toBe(true);
    expect(merge.method).toBe('hybridAStar');
    expect(pathLength(merge.path)).toBeCloseTo(300, 6);
  });

  it('goes round the wall', () => {
    const layer = yard(150);
    // The wall sits exactly between the two, so the straight answer is closed.
    expect(impl.zoneAt(layer, { x: 200, y: 50 }).zone).toBe('forbidden');

    const merge = impl.planHybridAStar(layer, from(50, 50, 0), at(350, 50, 0), APRON, params());
    expect(merge.found).toBe(true);
    expect(
      pathLength(merge.path),
      'a path round the wall has to be longer than through it',
    ).toBeGreaterThan(300);
    expect(stayedInside(layer, merge.path, 'apron')).toBe(true);
  });

  it('lands exactly on the merge pose', () => {
    const layer = yard(150);
    const goal = at(350, 50, deg(20));
    const merge = impl.planHybridAStar(layer, from(50, 50, 0), goal, APRON, params());

    expect(merge.found).toBe(true);
    const end = pathEndPose(merge.path);
    expect(
      distance(end.p, goal.target.p),
      'hybrid A* reaches a *region*; the analytic expansion is what makes it exact',
    ).toBeLessThan(1e-3);
    expect(Math.abs(wrapAngle(end.heading - goal.target.heading))).toBeLessThan(1e-3);
  });

  it('cannot leave the zone it was given', () => {
    // Same yard, but the goal is on the far side of the wall and the wall now
    // reaches the north edge.  There is no way round, and no amount of
    // searching should produce one.
    const layer = yard(200);
    const merge = impl.planHybridAStar(layer, from(50, 50, 0), at(350, 50, 0), APRON, params());
    expect(merge.found).toBe(false);
    expect(merge.detail, 'say that the search gave up, and after how much work').not.toBe('');
  });

  it('refuses a start outside the allowed zones at once', () => {
    const layer = yard(150);
    const merge = impl.planHybridAStar(layer, from(200, 50, 0), at(350, 50, 0), APRON, params());
    expect(merge.found).toBe(false);
  });

  it('respects the turn radius in every primitive', () => {
    const layer = yard(150);
    const p = params();
    const merge = impl.planHybridAStar(layer, from(50, 50, 0), at(350, 50, 0), APRON, p);
    expect(merge.found).toBe(true);
    expect(
      maxAbsCurvature(merge.path),
      'a motion primitive the aircraft cannot fly is not a motion primitive',
    ).toBeLessThanOrEqual(1 / p.radius + 1e-6);
  });

  it('honours the expansion budget', () => {
    // One expansion is not enough to get anywhere, and the search must come
    // back rather than run away.
    const layer = yard(150);
    const p = { ...params(), maxExpansions: 1 };
    const merge = impl.planHybridAStar(layer, from(50, 190, Math.PI), at(350, 50, 0), APRON, p);
    expect(merge.found).toBe(false);
  });
});
