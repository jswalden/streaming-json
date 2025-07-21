import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("Unicode escapes", () => {
  test("space", () => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add('"\\u0020');
    expect(parser.done()).toBe(false);

    parser.add('"');

    expect(parser.finish()).toBe(" ");
  });

  test("U+1234", () => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add('"\\u12');
    expect(parser.done()).toBe(false);
    parser.add("34");
    expect(parser.done()).toBe(false);

    parser.add('"');

    expect(parser.finish()).toBe("\u1234");
  });

  test("U+5309", () => {
    const parser = new StreamingJSONParser();
    expect(parser.done()).toBe(false);

    parser.add('"\\u5');
    expect(parser.done()).toBe(false);
    parser.add("309");
    expect(parser.done()).toBe(false);

    parser.add('"');

    expect(parser.finish()).toBe("\u5309");
  });
});
