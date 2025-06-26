import { expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";
import { Quantum } from "../../../shared.js";
import { stringify } from "../../stringify.js";

test("very long first property", () => {
  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const value = { [longString]: 42 };
  const jsonResult = JSON.stringify(value);

  expect(fullStreamingResult(value, "")).toBe(jsonResult);

  const out: string[] = [];
  stringify(value, undefined, "", (s) => out.push(s));
  expect(out[0].startsWith('{"\\u0000\\u0001')).toBe(true);
  expect(out[0].endsWith('"')).toBe(false);
  expect(out[2].endsWith('":')).toBe(true);
  expect(out[3]).toBe("42");
  expect(out[4]).toBe("}");
});
