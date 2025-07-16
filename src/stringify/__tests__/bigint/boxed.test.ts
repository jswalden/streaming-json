import { describe, expect, test } from "vitest";
import { stringify } from "../../../index.js";

describe("bigint", () => {
  test("boxed 0n", () => {
    expect(() => stringify(Object(0n), null, "").next()).toThrowError(TypeError);
  });

  test("boxed >0n", () => {
    expect(() => stringify(Object(17n), null, "").next()).toThrowError(TypeError);
  });

  test("boxed <0n", () => {
    expect(() => stringify(Object(-17n), null, "").next()).toThrowError(TypeError);
  });
});
