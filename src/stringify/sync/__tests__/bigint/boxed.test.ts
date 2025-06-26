import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("bigint", () => {
  test("boxed 0n", () => {
    expect(() => fullStreamingResult(Object(0n), "")).toThrowError(TypeError);
  });

  test("boxed >0n", () => {
    expect(() => fullStreamingResult(Object(17n), "")).toThrowError(TypeError);
  });

  test("boxed <0n", () => {
    expect(() => fullStreamingResult(Object(-17n), "")).toThrowError(TypeError);
  });
});
