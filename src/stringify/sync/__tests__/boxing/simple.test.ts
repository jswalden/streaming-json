import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("uncomplicated boxing", () => {
  test.each([
    { desc: "Boolean object true", boxed: new Boolean(true), primitive: true },
    { desc: "Boolean object false", boxed: new Boolean(false), primitive: false },
    { desc: "String object empty", boxed: new String(""), primitive: "" },
    { desc: "String object nonempty", boxed: new String("nonempty"), primitive: "nonempty" },
    { desc: "Number object 17", boxed: new Number(17), primitive: 17 },
    { desc: "Number object -1", boxed: new Number(-1), primitive: -1 },
    { desc: "Number object pi", boxed: new Number(Math.PI), primitive: Math.PI },
    // Nonfinite number values, boxed or otherwise, are treated as null, so
    // boxed/primitive don't directly correlate here.
    { desc: "Number object -Infinity", boxed: new Number(Number.NEGATIVE_INFINITY), primitive: null },
    { desc: "Number object +Infinity", boxed: new Number(Number.POSITIVE_INFINITY), primitive: null },
    { desc: "Number object NaN", boxed: new Number(Number.NaN), primitive: null },
  ])("$desc", ({ boxed: obj, primitive }) => {
    expect(fullStreamingResult(obj, "  ")).toBe(JSON.stringify(obj, null, "  "));
    expect(fullStreamingResult(obj, "  ")).toBe(JSON.stringify(primitive, null, "  "));
  });
});
