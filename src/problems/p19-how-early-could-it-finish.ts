// Problem 19 -- How early could it possibly finish?
// Brief: docs/taxi/p19-how-early-could-it-finish.md

import {
  arrivalState,
  conflictKey,
  emptyRoundGraph,
  holds,
  oppositeFact,
  type RampDescription,
  type RoundGraph,
  sameFact,
} from '../chart/index.js';

export function buildRoundGraph(desc: RampDescription, maxRounds = 16): RoundGraph {
  // TODO(you): a cheaper question than Problem 18's.  Do not look for a plan --
  // work out a FLOOR.  "Not before the third round, whatever you do" is usually
  // the number the ramp actually wants, and it is polynomial to compute where
  // the state space is exponential.
  //
  // Round 1 is the aeroplane as it arrives: every fact, with the value it has.
  //
  // Then, repeatedly:
  //
  //   what could run   every job whose needs are all present this round, PLUS
  //                    one do-nothing per fact.  The do-nothings are what carry
  //                    an undisturbed fact into the next round, and they are
  //                    the round-graph version of "stop".
  //
  //   job conflicts    two entries conflict when they leave the world in
  //                    contradictory states, when one undoes something the
  //                    other needs, or when what they each need was already in
  //                    conflict a round ago.
  //
  //   next round       everything anything leaves behind.
  //
  //   fact conflicts   a fact and its own negation, always.  Otherwise: when
  //                    EVERY way of producing the one conflicts with EVERY way
  //                    of producing the other.  One job producing both settles
  //                    it at once, in the negative.
  //
  // Stop when a round comes out the same as the one before it -- the graph has
  // levelled off, and nothing new will ever appear.  Record where.
  //
  // The structure over-approximates on purpose: a fact appears in round i if
  // SOME i-round plan could make it true, ignoring how the jobs that would have
  // to run together interact.  The conflict pairs claw back some of that
  // optimism cheaply, and cheap is the entire point.
  void desc;
  void maxRounds;
  void arrivalState;
  void holds;
  void conflictKey;
  void oppositeFact;
  void sameFact;
  return emptyRoundGraph();
}

export function couldBeDoneBy(
  desc: RampDescription,
  graph: RoundGraph,
  round: number,
): boolean {
  // TODO(you): every condition in desc.mustEndWith is present in this round,
  // and no two of them are in conflict.
  //
  // This is NECESSARY, not sufficient.  "Not ruled out yet" is exactly the
  // cheap test worth doing before you go and search.
  void desc;
  void graph;
  void round;
  return false;
}

export function earliestRound(desc: RampDescription, graph: RoundGraph): number {
  // TODO(you): the smallest round for which couldBeDoneBy() holds, or -1.
  void desc;
  void graph;
  return -1;
}
