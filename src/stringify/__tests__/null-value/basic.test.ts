import { describe, expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";

describe("null", () => {
  test("standalone", () => {
    expect(stringifyToString(null, null, "")).toBe("null");
  });

  test("result of toJSON", () => {
    expect(stringifyToString({ toJSON: () => null }, null, "")).toBe("null");
  });

  test("in array", () => {
    expect(stringifyToString([3, null], null, "")).toBe("[3,null]");
  });

  test("in object", () => {
    expect(stringifyToString({ x: null }, null, "")).toBe('{"x":null}');
  });
});
