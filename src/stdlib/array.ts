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

/** Determine whether an array contains an element that satisfies `pred`. */
export function ArrayFind<T>(arr: T[], pred: (value: T) => boolean): boolean {
  return arr.findIndex(pred) >= 0;
}
