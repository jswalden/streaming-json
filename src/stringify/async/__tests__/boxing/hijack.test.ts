import { describe, expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";

describe("boxing hijinks", async () => {
  test("Number and ToNumber", async () => {
    const n = new Number(17);
    (n as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => 42;

    expect(JSON.stringify(n)).toBe("42");
    await expect(fullStreamingResult(n, "")).resolves.toBe("42");
    await expect(fullStreamingResult([1, n, 3], " ")).resolves.toBe("[\n 1,\n 42,\n 3\n]");
  });

  test("String and ToString", async () => {
    const s = new String("hello");
    (s as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "world";

    expect(JSON.stringify(s)).toBe('"world"');
    await expect(fullStreamingResult(s, "")).resolves.toBe('"world"');
    await expect(fullStreamingResult([1, s, 3], " ")).resolves.toBe('[\n 1,\n "world",\n 3\n]');
  });

  test("Boolean is un-hijackable", async () => {
    const b = new Boolean(true);
    (b as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => false;

    expect(JSON.stringify(b)).toBe("true");
    await expect(fullStreamingResult(b, "")).resolves.toBe("true");
    await expect(fullStreamingResult([1, b, 3], " ")).resolves.toBe("[\n 1,\n true,\n 3\n]");
  });

  test("boxed bigint is un-hijackable", async () => {
    const bi = Object(17n) as object;
    (bi as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "unexpected";

    expect(() => JSON.stringify(bi)).toThrowError(TypeError);
    await expect(async () => fullStreamingResult(bi, "")).rejects.toThrowError(TypeError);
    await expect(async () => fullStreamingResult([1, bi, 3], " ")).rejects.toThrowError(TypeError);
  });
});
