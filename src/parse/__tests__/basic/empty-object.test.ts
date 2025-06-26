import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("empty object", () => {
  test.each([
    [{ desc: "standalone", text: "{}" }],
    [{ desc: "leading space", text: " {}" }],
    [{ desc: "leading \\n", text: "\n{}" }],
    [{ desc: "leading \\r", text: "\r{}" }],
    [{ desc: "leading \\t", text: "\t{}" }],
    [{ desc: "leading \\r\\n", text: "\r\n{}" }],
    [{ desc: "trailing space", text: " {} " }],
    [{ desc: "trailing \\n", text: "{}\n" }],
    [{ desc: "trailing \\r", text: "{}\r" }],
    [{ desc: "trailing \\t", text: "{}\t" }],
    [{ desc: "trailing \\r\\n", text: "{}\r\n" }],
    [{ desc: "WS both sides", text: " \r{}\n\t" }],
  ])("$desc", ({ text }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    const res = parser.finish();
    expect(res).toEqual({});

    expect(() => parser.finish()).toThrowErrorMatching(Error, "only be finished once");
  });
});
