// Reference solution -- Problem 06: hold short.
//
// Everything so far has been about what is *possible*.  This is about what is
// *permitted*, and the two are not the same thing.
//
// Problem 02's quickest route taxis 500 m down runway 09/27, because a runway
// is the fastest pavement on the aerodrome.  It is a perfectly good answer to
// the question it was asked.  It is also the single worst thing a surface
// planner can produce, and this is where that stops being possible.
//
// Two rules and a habit.
//
//   - A route may pass through a runway only when the clearance names that
//     runway.  Not "when the runway looks clear" -- there is no sensor here
//     and there should not be.  Permission comes from a human being.
//   - A departure stops at the holding point.  stopAt is not decoration; it is
//     what the route is for.
//   - When the answer is no, say which runway and say how far the aeroplane
//     COULD get, so the crew can read it back and ask for what they need.

import {
  type Aircraft,
  type Chart,
  type Clearance,
  type LinkId,
  NO_NODE,
  type NodeId,
  permitsCrossing,
  refuse,
  type TaxiRoute,
} from '../chart/index.js';
import { routeUnderClearance } from './p05-via-the-named-taxiways.js';

export function runwaysCrossed(chart: Chart, route: TaxiRoute): string[] {
  const out: string[] = [];
  if (!route.ok) return out;

  const note = (runway: string) => {
    if (runway && !out.includes(runway)) out.push(runway);
  };

  // Where the aeroplane already is does not count.  An aircraft that has just
  // landed is on the runway; it is not crossing it.
  for (let i = 1; i < route.nodes.length; ++i) {
    const n = chart.node(route.nodes[i]!);
    if (n.kind === 'runwayEntry') note(n.protects);
  }
  // A leg along a runway surface is a use of that runway too, even if it never
  // passes through a marked entry point.
  for (const e of route.links as LinkId[]) {
    const l = chart.link(e);
    if (l.surface === 'runway') note(chart.node(l.from).protects);
  }
  return out;
}

export function planDeparture(
  chart: Chart,
  ac: Aircraft,
  from: NodeId,
  clr: Clearance,
): TaxiRoute {
  const route = routeUnderClearance(chart, ac, from, clr);
  if (!route.ok) return route;

  for (const runway of runwaysCrossed(chart, route)) {
    if (permitsCrossing(clr, runway)) continue;
    if (clr.enterRunway === runway) continue;

    // How far could it legally get?  The last holding point before the runway.
    let holdAt = '';
    for (const v of route.nodes) {
      const n = chart.node(v);
      if (n.kind === 'runwayEntry' && n.protects === runway) break;
      if (n.kind === 'holdingPoint' && n.protects === runway) holdAt = n.name;
    }

    let why = `UNABLE: that routing crosses runway ${runway} and the clearance does not permit it`;
    if (holdAt) why += `; able to ${holdAt}, request crossing`;
    return refuse(why);
  }

  // Where does it stop?  A departure clearance ends at a holding point and the
  // aeroplane waits there until somebody says otherwise.  A clearance to line
  // up or take off does not stop.
  const last = chart.node(route.nodes[route.nodes.length - 1] ?? NO_NODE);
  if (last.kind === 'holdingPoint' && !clr.enterRunway) route.stopAt = last.id;

  return route;
}
