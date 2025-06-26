import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("infinity", () => {
  test("+∞", () => {
    expect(fullStreamingResult(Number.POSITIVE_INFINITY, "")).toBe("null");
  });
  test("-∞", () => {
    expect(fullStreamingResult(Number.NEGATIVE_INFINITY, "")).toBe("null");
  });

  test("+∞ as property value", () => {
    expect(fullStreamingResult({ x: Number.POSITIVE_INFINITY }, "")).toBe('{"x":null}');
  });
  test("-∞ as property value", () => {
    expect(fullStreamingResult({ x: Number.NEGATIVE_INFINITY }, "")).toBe('{"x":null}');
  });
});
