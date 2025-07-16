import { describe, expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";

describe("NaN", () => {
  test("standalone", () => {
    expect(stringifyToString(Number.NaN, null, "")).toBe("null");
  });

  test("as property value", () => {
    expect(stringifyToString({ x: Number.NaN }, null, "")).toBe('{"x":null}');
  });

  test("as array element", () => {
    expect(stringifyToString([Number.NaN], null, "")).toBe("[null]");
  });
});
