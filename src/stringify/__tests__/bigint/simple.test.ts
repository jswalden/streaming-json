import { describe, expect, test } from "vitest";
import { stringify } from "../../../index.js";

describe("bigint", () => {
  test("0n", () => {
    expect(() => stringify(0n, null, "").next()).toThrowError(TypeError);
  });

  test(">0n", () => {
    expect(() => stringify(42n, null, "").next()).toThrowError(TypeError);
  });

  test("<0n", () => {
    expect(() => stringify(-42n, null, "").next()).toThrowError(TypeError);
  });
});
