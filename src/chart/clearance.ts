// What a human being told the aeroplane it may do.
//
// Part of the *given* library.
//
// This is the type with no counterpart in a textbook planning problem, and it
// is the most important one in the repo.  A classical planner is told what the
// *obstacles* are.  A surface planner is told what it is *permitted* to do, in
// a sentence of English, by a controller who is talking to eleven other
// aircraft and expects to be obeyed literally.
//
//   "KLM1234, taxi to holding point Echo One via Alpha Delta Bravo Echo,
//    cross runway one eight three six, hold short of runway two seven."
//
// Three things follow from that sentence being the input:
//
//   - VIA is a *constraint you search under*, not a filter you apply
//     afterwards.  The quickest route that happens to use A, D and B is not
//     the same thing as the quickest route that uses A, then D, then B, in
//     that order.  Problem 05.
//   - Permission is not the same as possibility.  There is nearly always a
//     paved route across a runway.  Crossing it without being told to is an
//     incident report.  Problem 06.
//   - The planner has to be able to REFUSE.  When the sentence does not reach
//     the destination the answer is not a best-effort route; it is
//     "unable, say again".

export interface Clearance {
  /**
   * What was said, for the failure message.  Not parsed -- parsing spoken
   * clearances is a string problem rather than a planning one, and it is a
   * follow-up in Problem 05 rather than a problem of its own.
   */
  readonly text: string;

  /**
   * The point the aeroplane has been cleared to.  A departure clearance names
   * a holding point; an arrival clearance names a stand.
   */
  readonly destination: string;

  /**
   * Taxiways to be used, in the order given.  Empty means "by any route",
   * which controllers do say at quiet aerodromes.
   */
  readonly via: readonly string[];

  /**
   * Runways this clearance permits crossing, e.g. ["18/36"].  A runway not
   * listed here must be held short of.
   */
  readonly mayCross: readonly string[];

  /** Set when the clearance is to line up or take off rather than to hold. */
  readonly enterRunway?: string;
}

export function permitsCrossing(clr: Clearance, runway: string): boolean {
  return clr.mayCross.includes(runway);
}

// A few clearances the problems and tests share, so that everybody is talking
// about the same taxi.

/**
 * Stand 2 to the holding point short of 27 at Echo, the routine way.
 *
 * Bravo runs straight across runway 18/36 at Kilo Field, so every eastbound
 * departure needs that crossing.  It is not an edge case here; it is the main
 * route.
 */
export function standDeparture(): Clearance {
  return {
    text:
      'KLM1234, taxi to holding point Echo One via Alpha Delta Bravo Echo, ' +
      'cross runway one eight three six, hold short of runway two seven',
    destination: 'HS 27 E',
    via: ['A', 'D', 'B', 'E'],
    mayCross: ['18/36'],
  };
}

/**
 * Word for word the same taxi, with the crossing left out.  A perfectly
 * ordinary thing to say when 18/36 is active, and it means: go as far as the
 * holding point short of it and stop there.
 */
export function noCrossingClearance(): Clearance {
  return {
    ...standDeparture(),
    text:
      'KLM1234, taxi to holding point Echo One via Alpha Delta Bravo Echo, ' +
      'hold short of runway one eight three six',
    mayCross: [],
  };
}

/** Out to the de-icing pad, and report when complete. */
export function viaDeicing(): Clearance {
  return {
    text: 'KLM1234, taxi to the de-icing pad via Alpha, report when complete',
    destination: 'DEICE PAD',
    via: ['A', 'DEICE'],
    mayCross: [],
  };
}

/** An arrival: vacated 27 at Charlie, cross 18/36, in to stand 1. */
export function arrivalToStand1(): Clearance {
  return {
    text:
      'KLM1234, vacate via Charlie, cross runway one eight three six, ' +
      'taxi to stand one via Bravo Delta Alpha',
    destination: 'STAND 1',
    via: ['C', 'B', 'D', 'A', 'APRON', 'STAND 1'],
    mayCross: ['18/36'],
  };
}

/**
 * A clearance that does not reach where it says it does.  Charlie does not
 * connect to Echo; the sentence is well formed and the destination exists, but
 * it cannot be reached the way it was phrased.  Problem 05 has to refuse it,
 * and has to refuse it *differently* from "there is no route at all".
 */
export function unreachableVia(): Clearance {
  return {
    text: 'KLM1234, taxi to holding point Echo One via Alpha Delta Charlie',
    destination: 'HS 27 E',
    via: ['A', 'D', 'C'],
    mayCross: ['18/36'],
  };
}
