import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("basic arrays", () => {
  test.each([
    [{ desc: "standalone", text: "[]", value: [] }],
    [{ desc: "one number element", text: "[1]", value: [1] }],
    [{ desc: "two number elements", text: "[1, 2]", value: [1, 2] }],
    [{ desc: "null, number elements", text: "[null, 3]", value: [null, 3] }],
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
