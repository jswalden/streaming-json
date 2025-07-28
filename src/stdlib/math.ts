import { ThrowRangeError } from "./error.js";

/**
 * Remove the fractional component from a finite (non-infinite and non-`NaN`)
 * number by rounding it towards zero.  The sign on a truncation to +0 or -0 is
 * preserved.
 *
 * @see https://tc39.es/ecma262/#eqn-truncate
 */
export function Truncate(n: number): number {
  if (!Number.isFinite(n))
    ThrowRangeError("Truncate only handles finite numbers");
  return Math.trunc(n);
}

/**
 * Return the minimum supplied argument, or `NaN` if any supplied argument is
 * `NaN`.
 */
export const Min: (num: number, ...rest: readonly number[]) => number = Math.min;
