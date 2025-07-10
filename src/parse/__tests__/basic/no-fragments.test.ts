import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("empty JSON", () => {
  test("no fragments ", () => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);
    expect(() => parser.finish()).toThrowErrorMatching(SyntaxError, "Unexpected end of data");
    expect(parser.done()).toBe(true);
  });

  test("an explicit empty fragment ", () => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);
    parser.add("");
    expect(parser.done()).toBe(false);
    expect(() => parser.finish()).toThrowErrorMatching(SyntaxError, "Unexpected end of data");
    expect(parser.done()).toBe(true);
  });
});
