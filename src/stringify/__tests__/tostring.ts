import { stringify } from "../../index.js";

export function stringifyToString(...args: Parameters<typeof stringify>): string {
  return [...stringify(...args)].join("");
}
