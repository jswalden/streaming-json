import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("simple singleton values", () => {
  test.each([
    [{ desc: "null", text: "null", value: null }],
    [{ desc: "true", text: "true", value: true }],
    [{ desc: "false", text: "false", value: false }],
  ])("$desc", ({ text, value }: { text: string; value: unknown }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    const res = parser.finish();
    expect(res).toBe(value);

    expect(() => parser.finish()).toThrowErrorMatching(Error, "Can't call finish: ");
  });
});
