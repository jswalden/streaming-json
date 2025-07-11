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
    { desc: "empty object", val: {} },
    { desc: "object containing 1 omitted property", val: { x: undefined } },
    { desc: "object containing >1 omitted property", val: { x: undefined, y: undefined } },
    { desc: "object containing >1 omitted, 1 accepted property", val: { x: undefined, y: undefined, z: 42 } },
    { desc: "object containing >1 omitted, 1 accepted property, 1 omitted", val: { x: undefined, y: undefined, z: 42, w: Function } },
    { desc: "object with infinity property value", val: { z: Number.POSITIVE_INFINITY } },
    { desc: "array of varied contents", val: [[2, { m: [5, {}, { q: { n: 4 } }] }]] },
    { desc: "multilevel objects", val: { x: 1, y: [{ z: { a: true } }] } },
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

  describe("array with multi-property object", async () => {
    const val = [{ x: 2, y: 3 }];

    const zeroSpace = [
      '[{"x":2,"y":3}]',
      '[{"y":3,"x":2}]',
    ];

    const twoSpace = [
      '[\n  {\n    "x": 2,\n    "y": 3\n  }\n]',
      '[\n  {\n    "y": 3,\n    "x": 2\n  }\n]',
    ];

    const tabSpace = [
      '[\n\t{\n\t\t"x": 2,\n\t\t"y": 3\n\t}\n]',
      '[\n\t{\n\t\t"y": 3,\n\t\t"x": 2\n\t}\n]',
    ];

    const tenSpaces = " ".repeat(10);
    const tenSpace = [
      `[\n${tenSpaces}{\n${tenSpaces}${tenSpaces}"x": 2,\n${tenSpaces}${tenSpaces}"y": 3\n${tenSpaces}}\n]`,
      `[\n${tenSpaces}{\n${tenSpaces}${tenSpaces}"y": 3,\n${tenSpaces}${tenSpaces}"x": 2\n${tenSpaces}}\n]`,
    ];

    test.each([
      // Zero-space spaces.
      [{ desc: "empty string", space: "", oneOf: zeroSpace }],
      [{ desc: 0, space: 0, oneOf: zeroSpace }],
      [{ desc: -0.5, space: -0.5, oneOf: zeroSpace }],
      [{ desc: -1, space: -1, oneOf: zeroSpace }],
      [{ desc: -1.5, space: -1.5, oneOf: zeroSpace }],
      [{ desc: NaN, space: NaN, oneOf: zeroSpace }],
      [{ desc: Number.NEGATIVE_INFINITY, space: Number.NEGATIVE_INFINITY, oneOf: zeroSpace }],
      // Two-space spaces.
      [{ desc: "  ", space: "  ", oneOf: twoSpace }],
      [{ desc: 2, space: 2, oneOf: twoSpace }],
      [{ desc: 2.5, space: 2.5, oneOf: twoSpace }],
      // Tab space.
      [{ desc: "tab", space: "\t", oneOf: tabSpace }],
      // Ten space.
      [{ desc: Number.POSITIVE_INFINITY, space: Number.POSITIVE_INFINITY, oneOf: tenSpace }],
      [{ desc: "ten spaces", space: tenSpaces, oneOf: tenSpace }],
      [{ desc: 11, space: 11, oneOf: tenSpace }],
    ])("$desc", ({ space, oneOf }) => {
      expect(fullStreamingResult(val, space)).toBeOneOf(oneOf);
    });
  });
});
