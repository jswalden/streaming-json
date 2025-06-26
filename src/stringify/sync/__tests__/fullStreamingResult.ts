import { stringify } from "../../../index.js";

export function fullStreamingResult(
  value: unknown,
  space: string | number,
): string {
  let result = "";
  // No replacer included -- if you want replacer tests, call `stringify`
  // directly.
  stringify(value, undefined, space, (s) => result += s);
  return result;
}
