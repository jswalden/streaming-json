import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("null", () => {
  test("standalone", () => {
    expect(fullStreamingResult(null, "")).toBe("null");
  });

  test("result of toJSON", () => {
    expect(fullStreamingResult({ toJSON: () => null }, "")).toBe("null");
  });

  test("in array", () => {
    expect(fullStreamingResult([3, null], "")).toBe("[3,null]");
  });

  test("in object", () => {
    expect(fullStreamingResult({ x: null }, "")).toBe('{"x":null}');
  });
});
