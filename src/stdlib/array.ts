import { CreateDataProperty } from "./object.js";

/**
 * Determine whether a value is an `Array`.
 *
 * Note that a proxy whose target is an `Array` will satisfy this test.
 *
 * @see https://tc39.es/ecma262/#sec-isarray
 */
export const IsArray = Array.isArray;

/** Append a value to an array. */
export function Push<T>(arr: T[], t: NoInfer<T>): void {
  CreateDataProperty(arr, arr.length, t);
}

/**
 * Pop the last element from an array and return it.
 *
 * This function may not be called on an empty array.
 */
export const Pop = <T>(arr: T[]): T => {
  const t = arr[arr.length - 1];
  arr.length--;
  return t;
};

/**
 * Determine whether an array contains an element, according to `SameValueZero`
 * semantics.  (That is, `SameValue` semantics for non-numbers, and both-`NaN`
 * or both-zeroes or equal for numbers.)
 */
export function ArrayContains<T>(arr: T[], t: T): boolean {
  return arr.includes(t);
}
