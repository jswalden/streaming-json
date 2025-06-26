import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("strings without any escapes", () => {
  test.each([
    [{ desc: "empty string", text: '""', value: "" }],
    [{ desc: "single character", text: '"a"', value: "a" }],
  ])("$desc", ({ text, value }: { text: string; value: string }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    expect(parser.finish()).toBe(value);
  });
});
