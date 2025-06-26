import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("-0 in array", async () => {
  describe("primitive", async () => {
    test("first element", async () => {
      await expect(fullStreamingResult([-0, null], "")).resolves.toBe("[0,null]");
    });

    test("nonfirst element", async () => {
      await expect(fullStreamingResult([-1, -0, 2], "")).resolves.toBe("[-1,0,2]");
    });

    test("last element", async () => {
      await expect(fullStreamingResult([1, -2, -0], "")).resolves.toBe("[1,-2,0]");
    });
  });

  describe("boxed", async () => {
    test("first element", async () => {
      await expect(fullStreamingResult([new Number(-0), null], "")).resolves.toBe("[0,null]");
    });

    test("nonfirst element", async () => {
      await expect(fullStreamingResult([-1, new Number(-0), 2], "")).resolves.toBe("[-1,0,2]");
    });

    test("last element", async () => {
      await expect(fullStreamingResult([1, -2, new Number(-0)], "")).resolves.toBe("[1,-2,0]");
    });
  });
});
