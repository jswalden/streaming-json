import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("bad Unicode escape", () => {
  test.each([
    [{ desc: "\\u", text: '"\\u' }],
    [{ desc: "\\uA", text: '"\\uA' }],
    [{ desc: "\\uAB", text: '"\\uAB' }],
    [{ desc: "\\uABC", text: '"\\uABC' }],
  ])("EOF after $desc", ({ text }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    expect(() => parser.finish()).toThrowErrorMatching(SyntaxError, "Too-short Unicode escape");
  });

  test.each([
    [{ desc: "\\u", text: '"\\uQ777' }],
    [{ desc: "\\uA", text: '"\\uAQ77' }],
    [{ desc: "\\uAB", text: '"\\uABQ7' }],
    [{ desc: "\\uABC", text: '"\\uABCQ' }],
  ])("nonhex after $desc", ({ text }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    expect(() => parser.add(text)).toThrowErrorMatching(SyntaxError, "Bad Unicode escape");
  });

  test.each([
    [{ input: '"\\uQ' }],
    [{ input: '"\\uAQ' }],
    [{ input: '"\\uAAQ' }],
    [{ input: '"\\uAAAQ' }],
  ])("Check for immediate error in $input without requiring four digits be consumed", ({ input }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    for (let i = 0; i < input.length - 1; i++)
      parser.add(input[i]);
    expect(() => parser.add(input[input.length - 1])).toThrowErrorMatching(SyntaxError, "Bad Unicode escape");
  });
});
