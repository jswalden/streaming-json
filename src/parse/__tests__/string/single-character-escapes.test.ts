import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("single-character escapes", () => {
  test.each([
    [{ desc: "f", text: '"\\f"', value: "\f" }],
    [{ desc: "n", text: '"\\n"', value: "\n" }],
    [{ desc: "r", text: '"\\r"', value: "\r" }],
    [{ desc: "t", text: '"\\t"', value: "\t" }],
    [{ desc: "\\", text: '"\\\\"', value: "\\" }],
    [{ desc: "/", text: '"\\/"', value: "/" }],
    [{ desc: '"', text: '"\\""', value: '"' }],
    [{ desc: "f followed", text: '"\\fq"', value: "\fq" }],
    [{ desc: "n followed", text: '"\\nq"', value: "\nq" }],
    [{ desc: "r followed", text: '"\\rq"', value: "\rq" }],
    [{ desc: "t followed", text: '"\\tq"', value: "\tq" }],
    [{ desc: "\\ followed", text: '"\\\\q"', value: "\\q" }],
    [{ desc: "/ followed", text: '"\\/q"', value: "/q" }],
    [{ desc: '" followed', text: '"\\"q"', value: '"q' }],
    [{ desc: "f preceded", text: '"z\\f"', value: "z\f" }],
    [{ desc: "n preceded", text: '"z\\n"', value: "z\n" }],
    [{ desc: "r preceded", text: '"z\\r"', value: "z\r" }],
    [{ desc: "t preceded", text: '"z\\t"', value: "z\t" }],
    [{ desc: "\\ preceded", text: '"z\\\\"', value: "z\\" }],
    [{ desc: "/ preceded", text: '"z\\/"', value: "z/" }],
    [{ desc: '" preceded', text: '"z\\\""', value: "z\"" }],
    [{ desc: "single character", text: '"a"', value: "a" }],
  ])("$desc", ({ text, value }: { text: string; value: string }) => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add(text);
    expect(parser.done()).toBe(false);

    expect(parser.finish()).toBe(value);
    expect(parser.done()).toBe(true);
  });
});
