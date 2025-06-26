import { expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

// At one time an implementation goof meant that a non-own/enumerable property
// named "undefined", whose value is stringifiable, was mistakenly included in
// the overall result.  Check that this goof no longer exists.
test("non-enumerable obj['undefined'] shouldn't be included when obj includes a stringifiable property", () => {
  const obj = { x: 42 };
  Object.defineProperty(obj, "undefined", { value: "DO NOT WANT", enumerable: false });

  expect(fullStreamingResult(obj, "")).toBe(JSON.stringify(obj, null, ""));
  expect(fullStreamingResult(obj, "")).toBe(JSON.stringify({ x: 42 }, null, ""));
});
