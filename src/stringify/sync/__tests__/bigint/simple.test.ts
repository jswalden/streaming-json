import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("bigint", () => {
  test("0n", () => {
    expect(() => fullStreamingResult(0n, "")).toThrowError(TypeError);
  });

  test(">0n", () => {
    expect(() => fullStreamingResult(42n, "")).toThrowError(TypeError);
  });

  test("<0n", () => {
    expect(() => fullStreamingResult(-42n, "")).toThrowError(TypeError);
  });
});
