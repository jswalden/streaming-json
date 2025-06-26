import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("NaN", async () => {
  test("standalone", async () => {
    await expect(fullStreamingResult(Number.NaN, "")).resolves.toBe("null");
  });

  test("as property value", async () => {
    await expect(fullStreamingResult({ x: Number.NaN }, "")).resolves.toBe('{"x":null}');
  });

  test("as array element", async () => {
    await expect(fullStreamingResult([Number.NaN], "")).resolves.toBe("[null]");
  });
});
