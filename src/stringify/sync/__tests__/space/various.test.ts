import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("space handling", () => {
  // General same-characteristics testing, simply assuming `JSON.stringify`
  // behaves the intended way.
  test.each([
    { desc: "null on its own", val: null },
    { desc: "true on its own", val: true },
    { desc: "true on its own", val: false },
    { desc: "array with only null in it", val: [null] },
    { desc: "+0", val: +0 },
    { desc: "-0", val: -0 },
    { desc: "NaN", val: Number.NaN },
    { desc: "string", val: "hello world" },
    { desc: "empty array", val: [] },
    { desc: "array containing nonserializable value", val: [undefined] },
    { desc: "array with only 0 in it", val: [0] },
    { desc: "array of a string", val: ["hello world"] },
    { desc: "multi-element array", val: ["goodbye", "hello"] },
    { desc: "array with single-property object", val: [{ x: 2 }] },
    { desc: "array with multi-property object", val: [{ x: 2, y: 3 }] },
    { desc: "array of an object", val: [{ x: 2, y: 3 }] },
    { desc: "array of varied contents", val: [[2, { m: 5, obj: {}, q: { n: 4 } }]] },
    { desc: "multilevel multi-property objects", val: { x: 1, y: { m: 2, z: { a: true }, q: 3 } } },
    { desc: "empty object", val: {} },
    { desc: "object containing 1 omitted property", val: { x: undefined } },
    { desc: "object containing >1 omitted property", val: { x: undefined, y: undefined } },
    { desc: "object containing >1 omitted, 1 accepted property", val: { x: undefined, y: undefined, z: 42 } },
    { desc: "object containing >1 omitted, 1 accepted property, 1 omitted", val: { x: undefined, y: undefined, z: 42, w: Function } },
    { desc: "object with infinity property value", val: { z: Number.POSITIVE_INFINITY } },
  ])("$desc", ({ val }: { val: unknown }) => {
    expect(fullStreamingResult(val, "")).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, 0)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, "  ")).toBe(JSON.stringify(val, null, "  "));
    expect(fullStreamingResult(val, 2)).toBe(JSON.stringify(val, null, "  "));
    expect(fullStreamingResult(val, 2.5)).toBe(JSON.stringify(val, null, "  "));
    expect(fullStreamingResult(val, -0.5)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, -1)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, -1.5)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, "\t")).toBe(JSON.stringify(val, null, "\t"));
    expect(fullStreamingResult(val, NaN)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, +Infinity)).toBe(JSON.stringify(val, null, " ".repeat(10)));
    expect(fullStreamingResult(val, -Infinity)).toBe(JSON.stringify(val, null, ""));
    expect(fullStreamingResult(val, " ".repeat(11))).toBe(JSON.stringify(val, null, " ".repeat(10)));
  });
});
