import { expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

// At one time an implementation goof meant that a non-own/enumerable property
// named "undefined", whose value is stringifiable, was mistakenly included in
// the overall result.  Check that this goof no longer exists.
test("non-enumerable obj['undefined'] shouldn't be included when obj includes a stringifiable property", async () => {
  const obj = { x: 42 };
  Object.defineProperty(obj, "undefined", { value: "DO NOT WANT", enumerable: false });

  await expect(fullStreamingResult(obj, "")).resolves.toBe(JSON.stringify(obj, null, ""));
  await expect(fullStreamingResult(obj, "")).resolves.toBe(JSON.stringify({ x: 42 }, null, ""));
});
