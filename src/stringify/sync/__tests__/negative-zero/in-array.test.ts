import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("-0 in array", () => {
  describe("primitive", () => {
    test("first element", () => {
      expect(fullStreamingResult([-0, null], "")).toBe("[0,null]");
    });

    test("nonfirst element", () => {
      expect(fullStreamingResult([-1, -0, 2], "")).toBe("[-1,0,2]");
    });

    test("last element", () => {
      expect(fullStreamingResult([1, -2, -0], "")).toBe("[1,-2,0]");
    });
  });

  describe("boxed", () => {
    test("first element", () => {
      expect(fullStreamingResult([new Number(-0), null], "")).toBe("[0,null]");
    });

    test("nonfirst element", () => {
      expect(fullStreamingResult([-1, new Number(-0), 2], "")).toBe("[-1,0,2]");
    });

    test("last element", () => {
      expect(fullStreamingResult([1, -2, new Number(-0)], "")).toBe("[1,-2,0]");
    });
  });
});
