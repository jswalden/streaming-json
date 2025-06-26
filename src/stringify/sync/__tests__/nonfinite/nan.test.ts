import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("NaN", () => {
  test("standalone", () => {
    expect(fullStreamingResult(Number.NaN, "")).toBe("null");
  });

  test("as property value", () => {
    expect(fullStreamingResult({ x: Number.NaN }, "")).toBe('{"x":null}');
  });

  test("as array element", () => {
    expect(fullStreamingResult([Number.NaN], "")).toBe("[null]");
  });
});
