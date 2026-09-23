// The aeroplane, reduced to what a route planner needs.
//
// Part of the *given* library.
//
// Three numbers and a name.  The capstone's aircraft model has twenty, because
// it reasons about a shape sweeping along a curve; here the aeroplane is a
// thing with a wingspan that has to fit down a taxiway, a weight the pavement
// has to carry, and a cost for going round a corner.

export interface Aircraft {
  readonly type: string;
  readonly wingspanM: number;
  readonly weightT: number;
  /**
   * Seconds lost to a turn of more than 30 degrees: slow down, come round,
   * speed up.  Problem 04 is about where this has to live in the search.
   */
  readonly turnPenaltyS: number;
}

/** Code C, 35.8 m.  The workhorse, and it clears taxiway D by 20 cm. */
export function a320(): Aircraft {
  return { type: 'A320', wingspanM: 35.8, weightT: 79, turnPenaltyS: 20 };
}

/** Code C and small: 28.4 m, 30 t.  Fits where the A320 is tight. */
export function dash8(): Aircraft {
  return { type: 'DHC8', wingspanM: 28.4, weightT: 30.5, turnPenaltyS: 12 };
}

/** Code E, 64.8 m, 351 t.  Too wide for most of Kilo Field. */
export function b777(): Aircraft {
  return { type: 'B777', wingspanM: 64.8, weightT: 351.5, turnPenaltyS: 35 };
}
