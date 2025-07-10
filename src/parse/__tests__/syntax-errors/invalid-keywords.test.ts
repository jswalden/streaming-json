import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../../index.js";

describe("example StreamingJSONParser usage in README.md", () => {
  test.each([
    [{ bad: "tQ", keyword: "true" }],
    [{ bad: "trQ", keyword: "true" }],
    [{ bad: "truQ", keyword: "true" }],
    [{ bad: "fQ", keyword: "false" }],
    [{ bad: "faQ", keyword: "false" }],
    [{ bad: "falQ", keyword: "false" }],
    [{ bad: "falsQ", keyword: "false" }],
    [{ bad: "nQ", keyword: "null" }],
    [{ bad: "nuQ", keyword: "null" }],
    [{ bad: "nulQ", keyword: "null" }],
  ])("$bad", ({ bad, keyword }) => {
    const parser = new StreamingJSONParser();
    expect(() => parser.add(bad)).toThrowErrorMatching(SyntaxError, `'${keyword}' keyword`);
    expect(parser.done()).toBe(true);
  });

  test("foo", () => {
    const parser = new StreamingJSONParser();

    expect(() => parser.add("#*@($&")).toThrowErrorMatching(SyntaxError, "Unexpected character");
    expect(parser.done()).toBe(true);
  });
});
