import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("bigint", async () => {
  test("boxed 0n", async () => {
    await expect(async () => fullStreamingResult(Object(0n), "")).rejects.toThrowError(TypeError);
  });

  test("boxed >0n", async () => {
    await expect(async () => fullStreamingResult(Object(17n), "")).rejects.toThrowError(TypeError);
  });

  test("boxed <0n", async () => {
    await expect(async () => fullStreamingResult(Object(-17n), "")).rejects.toThrowError(TypeError);
  });
});
