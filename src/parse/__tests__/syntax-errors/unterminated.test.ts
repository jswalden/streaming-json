import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("invalidly terminated values", () => {
  test.each([
    [{ desc: "string", text: "\"" }],
    [{ desc: "array", text: "[" }],
    [{ desc: "object", text: "{" }],
  ])("$desc", ({ text }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    expect(() => parser.finish()).toThrowError(SyntaxError);
    expect(parser.done()).toBe(true);
    expect(() => parser.finish()).toThrowErrorMatching(Error, "Can't call finish: ");
  });
});
