import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("basic objects", () => {
  test.each([
    [{ desc: "standalone", text: "{}", value: {} }],
    [{ desc: "one property", text: '{ "hi": "bye" }', value: { hi: "bye" } }],
    [{ desc: "two properties", text: '{ "count": 17, "yoda": 1.2 }', value: { count: 17, yoda: 1.2 } }],
  ])("$desc", ({ text, value }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    const res = parser.finish();
    expect(parser.done()).toBe(true);
    expect(res).toEqual(value);
  });
});
