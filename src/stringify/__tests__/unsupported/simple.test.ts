import { describe, expect, test } from "vitest";
import { stringifyToString } from "../helpers.js";
import { stringify } from "../../../index.js";

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
    expect([...stringify(val, null, "")]).toEqual([]);

    // As object property.
    expect(JSON.stringify({ x: val }, undefined, "")).toEqual("{}");
    expect(stringifyToString({ x: val }, undefined, "")).toEqual("{}");

    // As array element.
    expect(JSON.stringify([val], null, "")).toEqual("[null]");
    expect(stringifyToString([val], null, "")).toEqual("[null]");
  });
});
