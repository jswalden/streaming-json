import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("-0", async () => {
  test("primitive", async () => {
    // JSON to spec loses the sign.
    await expect(fullStreamingResult(-0, "")).resolves.toBe("0");
  });

  test("boxed", async () => {
    // JSON to spec loses the sign.
    await expect(fullStreamingResult(new Number(-0), "")).resolves.toBe("0");
  });
});
