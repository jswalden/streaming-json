import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("unsupported values", async () => {
  test.each([
    [{ desc: "undefined", val: undefined }],
    [{ desc: "basic symbol", val: Symbol("hello") }],
    [{ desc: "registered symbol", val: Symbol.for("each") }],
    [{ desc: "language-defined symbol", val: Symbol.iterator }],
    [{ desc: "callable function", val: Function }],
  ])("stringifying $desc", async ({ val }) => {
    // Standalone.
    expect(JSON.stringify(val, null, "")).toBe(undefined);
    await expect(fullStreamingResult(val, "")).resolves.toBe("null");

    // As object property.
    expect(JSON.stringify({ x: val }, null, "")).toEqual("{}");
    await expect(fullStreamingResult({ x: val }, "")).resolves.toEqual("{}");

    // As array element.
    expect(JSON.stringify([val], null, "")).toEqual("[null]");
    await expect(fullStreamingResult([val], "")).resolves.toEqual("[null]");
  });
});
