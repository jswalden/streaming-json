import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("bad single-character escape", () => {
  test.each([
    [{ desc: "v", text: '"\\v"' }],
    [{ desc: "v followed", text: '"\\vq"' }],
    [{ desc: "v preceded", text: '"z\\v"' }],
  ])("$desc", ({ text }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    expect(() => parser.add(text)).toThrowErrorMatching(SyntaxError, "Bad escaped character 'v'");
    expect(parser.done()).toBe(true);
  });
});
