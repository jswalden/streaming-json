import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("unsupported values", () => {
  test.each([
    [{ desc: "undefined", val: undefined }],
    [{ desc: "basic symbol", val: Symbol("hello") }],
    [{ desc: "registered symbol", val: Symbol.for("each") }],
    [{ desc: "language-defined symbol", val: Symbol.iterator }],
    [{ desc: "callable function", val: Function }],
  ])("stringifying $desc", ({ val }) => {
    // Standalone.
    expect(JSON.stringify(val, null, "")).toBe(undefined);
    expect(fullStreamingResult(val, "")).toBe("null");

    // As object property.
    expect(JSON.stringify({ x: val }, null, "")).toEqual("{}");
    expect(fullStreamingResult({ x: val }, "")).toEqual("{}");

    // As array element.
    expect(JSON.stringify([val], null, "")).toEqual("[null]");
    expect(fullStreamingResult([val], "")).toEqual("[null]");
  });
});
