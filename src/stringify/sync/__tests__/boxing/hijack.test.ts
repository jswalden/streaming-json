import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("boxing hijinks", () => {
  test("Number and ToNumber", () => {
    const n = new Number(17);
    (n as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => 42;

    expect(JSON.stringify(n)).toBe("42");
    expect(fullStreamingResult(n, "")).toBe("42");
    expect(fullStreamingResult([1, n, 3], " ")).toBe("[\n 1,\n 42,\n 3\n]");
  });

  test("String and ToString", () => {
    const s = new String("hello");
    (s as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "world";

    expect(JSON.stringify(s)).toBe('"world"');
    expect(fullStreamingResult(s, "")).toBe('"world"');
    expect(fullStreamingResult([1, s, 3], " ")).toBe('[\n 1,\n "world",\n 3\n]');
  });

  test("Boolean is un-hijackable", () => {
    const b = new Boolean(true);
    (b as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => false;

    expect(JSON.stringify(b)).toBe("true");
    expect(fullStreamingResult(b, "")).toBe("true");
    expect(fullStreamingResult([1, b, 3], " ")).toBe("[\n 1,\n true,\n 3\n]");
  });

  test("boxed bigint is un-hijackable", () => {
    const bi = Object(17n) as object;
    (bi as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "unexpected";

    expect(() => JSON.stringify(bi)).toThrowError(TypeError);
    expect(() => fullStreamingResult(bi, "")).toThrowError(TypeError);
    expect(() => fullStreamingResult([1, bi, 3], " ")).toThrowError(TypeError);
  });
});
