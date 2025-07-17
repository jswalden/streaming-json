import { stringify } from "../../index.js";

export function stringifyToString(...args: Parameters<typeof stringify>): string {
  return [...stringify(...args)].join("");
}

/**
 * Given property-getter mock calls array, return an array of the properties
 * accessed.
 */
export function props<T, P, R>(calls: readonly (readonly [T, P, R])[]): P[] {
  return calls.map(([_target, prop, _receiver]) => prop);
}
