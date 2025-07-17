import { describe, expect, test } from "vitest";
import { stringifyToString } from "../helpers.js";

describe("infinity", () => {
  test("+∞", () => {
    expect(stringifyToString(Number.POSITIVE_INFINITY, null, "")).toBe("null");
  });
  test("-∞", () => {
    expect(stringifyToString(Number.NEGATIVE_INFINITY, null, "")).toBe("null");
  });

  test("+∞ as property value", () => {
    expect(stringifyToString({ x: Number.POSITIVE_INFINITY }, null, "")).toBe('{"x":null}');
  });
  test("-∞ as property value", () => {
    expect(stringifyToString({ x: Number.NEGATIVE_INFINITY }, null, "")).toBe('{"x":null}');
  });
});
