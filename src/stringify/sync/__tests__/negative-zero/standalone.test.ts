import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("-0", () => {
  test("primitive", () => {
    // JSON to spec loses the sign.
    expect(fullStreamingResult(-0, "")).toBe("0");
  });

  test("boxed", () => {
    // JSON to spec loses the sign.
    expect(fullStreamingResult(new Number(-0), "")).toBe("0");
  });
});
