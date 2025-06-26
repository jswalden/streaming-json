import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("bigint", async () => {
  test("0n", async () => {
    await expect(async () => fullStreamingResult(0n, "")).rejects.toThrowError(TypeError);
  });

  test(">0n", async () => {
    await expect(async () => fullStreamingResult(42n, "")).rejects.toThrowError(TypeError);
  });

  test("<0n", async () => {
    await expect(async () => fullStreamingResult(-42n, "")).rejects.toThrowError(TypeError);
  });
});
