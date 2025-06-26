import { describe, expect, test } from "vitest";
import { StreamingJSONParser } from "../../parser.js";

describe("basic numbers", () => {
  test.each([
    [{ text: "0", value: 0 }],
    [{ text: "-0", paren: "that is, -0", value: -0 }],
    [{ text: "1", value: 1 }],
    [{ text: "-1", value: -1 }],
    [{ text: "17", value: 17 }],
    [{ text: "-17", value: -17 }],
    [{ text: "42.0", value: 42 }],
    [{ text: "-42.0", value: -42 }],
    [{ text: "3.141592654", paren: "pi", value: 3.141592654 }],
    [{ text: "-3.141592654", paren: "negative pi", value: -3.141592654 }],
    [{ text: "8.675309e6", paren: "for a good time", value: 8675309 }],
    [{ text: "-8.675309e6", paren: "for a good time", value: -8675309 }],
    [{ text: "100E-2", value: 1 }],
    [{ text: "-100E-2", value: -1 }],
  ])("$text ($paren)", ({ text, value }) => {
    const p = new StreamingJSONParser();
    expect(p.done()).toBe(false);

    p.add(text);
    expect(p.done()).toBe(false);

    expect(p.finish()).toBe(value);
    expect(p.done()).toBe(true);
  });

  test("100E-2", () => {
    const p = new StreamingJSONParser();
    expect(p.done()).toBe(false);

    p.add("100E-2");
    expect(p.done()).toBe(false);

    expect(p.finish()).toBe(1);
  });

  test("-100E-2", () => {
    const p = new StreamingJSONParser();
    expect(p.done()).toBe(false);

    p.add("-100E-2");
    expect(p.done()).toBe(false);

    expect(p.finish()).toBe(-1);
  });
});
