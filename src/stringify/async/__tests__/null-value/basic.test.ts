import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("null", async () => {
  test("standalone", async () => {
    await expect(fullStreamingResult(null, "")).resolves.toBe("null");
  });

  test("result of toJSON", async () => {
    await expect(fullStreamingResult({ toJSON: () => null }, "")).resolves.toBe("null");
  });

  test("in array", async () => {
    await expect(fullStreamingResult([3, null], "")).resolves.toBe("[3,null]");
  });

  test("in object", async () => {
    await expect(fullStreamingResult({ x: null }, "")).resolves.toBe('{"x":null}');
  });
});
