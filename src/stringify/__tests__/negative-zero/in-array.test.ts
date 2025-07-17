import { describe, expect, test } from "vitest";
import { stringifyToString } from "../helpers.js";

describe("-0 in array", () => {
  describe("primitive", () => {
    test("first element", () => {
      expect(stringifyToString([-0, null], null, "")).toBe("[0,null]");
    });

    test("nonfirst element", () => {
      expect(stringifyToString([-1, -0, 2], undefined, "")).toBe("[-1,0,2]");
    });

    test("last element", () => {
      expect(stringifyToString([1, -2, -0], undefined, "")).toBe("[1,-2,0]");
    });
  });

  describe("boxed", () => {
    test("first element", () => {
      expect(stringifyToString([new Number(-0), null], null, "")).toBe("[0,null]");
    });

    test("nonfirst element", () => {
      expect(stringifyToString([-1, new Number(-0), 2], null, "")).toBe("[-1,0,2]");
    });

    test("last element", () => {
      expect(stringifyToString([1, -2, new Number(-0)], null, "")).toBe("[1,-2,0]");
    });
  });
});
