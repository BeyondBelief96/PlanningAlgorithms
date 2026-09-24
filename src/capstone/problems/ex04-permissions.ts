// Exercise 04 -- the clearance and the permission set (Step 4).
// Brief: docs/capstone/ex04-permissions.md

import {
  type Clearance,
  emptyPermissions,
  type PermissionSet,
  type TaxiGraph,
  type ZoneLayer,
} from '../../airport/index.js';
import { zoneAt } from './ex01-zone-layer.js';

export function buildPermissions(
  gated: TaxiGraph,
  layer: ZoneLayer,
  clearance: Clearance,
): PermissionSet {
  // TODO(you): the clearance is the only thing in the whole system that can
  // open a runway gate.  Turn the sentence into the permission set:
  //
  //   routeLabels          the via list, in order, untouched
  //   enterableRunways     the crossings -- plus the destination, but ONLY
  //                        when clearedToEnterDestination.  "Hold short of 27"
  //                        and "line up 27" are the same runway and opposite
  //                        permissions.
  //   authorizedGates      every hard gate whose `protects` names an enterable
  //                        runway.  Every other hard gate is shut.
  //   mandatoryStops       the unauthorized hard gates that have a painted
  //                        holding position.  A runway *edge* is a hard gate
  //                        too, but it is not somewhere you stop.
  //   goal                 for a runway destination: the hard gate protecting
  //                        it that is also on the last cleared taxiway -- the
  //                        holding position when holding short, the runway edge
  //                        when cleared to enter.  For a stand: the far end of
  //                        that stand's lead-in line.
  //   detail               say what happened, either way.  When there is no
  //                        goal this string is the whole refusal.
  void gated;
  void layer;
  void clearance;
  void zoneAt;
  return emptyPermissions();
}
