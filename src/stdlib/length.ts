import { Truncate } from "./math.js";
import { ToNumber } from "./number.js";

/**
 * Convert a value to a numeric length.
 *
 * @param argument
 *   The value to convert.
 * @returns
 *   A number that meets the typical ECMAScript length characteristics, i.e.
 *   being a nonnegative integer that's not so large it exceeds the Number
 *   type remaining integrally precise.
 * @see https://tc39.es/ecma262/#sec-tolength
 */
function ToLength(argument: unknown): number {
  const number = ToNumber(argument);
  if (!number)
    return 0;
  const len = Truncate(number);
  if (len <= 0)
    return 0;
  if (len < 2 ** 53 - 1)
    return len;
  return 2 ** 53 - 1;
}

/**
 * Get the numeric length of an array-like object (i.e. one presumed to have a
 * "length" property containing a number).
 *
 * @see https://tc39.es/ecma262/#sec-lengthofarraylike
 */
export function LengthOfArrayLike(obj: object): number {
  const len = (obj as { length: unknown }).length;
  return ToLength(len);
}
