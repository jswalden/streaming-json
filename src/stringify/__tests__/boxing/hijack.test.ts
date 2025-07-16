import { describe, expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";
import { stringify } from "../../../index.js";

describe("boxing hijinks", () => {
  test("Number and ToNumber", () => {
    const n = new Number(17);
    (n as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => 42;

    expect(JSON.stringify(n)).toBe("42");
    expect(stringifyToString(n, null, "")).toBe("42");
    expect(stringifyToString([1, n, 3], undefined, " ")).toBe("[\n 1,\n 42,\n 3\n]");
  });

  test("String and ToString", () => {
    const s = new String("hello");
    (s as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "world";

    expect(JSON.stringify(s)).toBe('"world"');
    expect(stringifyToString(s, null, "")).toBe('"world"');
    expect(stringifyToString([1, s, 3], null, " ")).toBe('[\n 1,\n "world",\n 3\n]');
  });

  test("Boolean is un-hijackable", () => {
    const b = new Boolean(true);
    (b as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => false;

    expect(JSON.stringify(b)).toBe("true");
    expect(stringifyToString(b, null, "")).toBe("true");
    expect(stringifyToString([1, b, 3], null, " ")).toBe("[\n 1,\n true,\n 3\n]");
  });

  test("boxed bigint is un-hijackable", () => {
    const bi = Object(17n) as object;
    (bi as unknown as Record<symbol, any>)[Symbol.toPrimitive] = () => "unexpected";

    expect(() => JSON.stringify(bi)).toThrowError(TypeError);
    expect(() => stringify(bi, null, "").next()).toThrowError(TypeError);

    const arrayIter = stringify([1, bi, 3], null, " ");
    expect(arrayIter.next()).toEqual({ done: false, value: "[\n " });
    expect(arrayIter.next()).toEqual({ done: false, value: "1" });
    expect(arrayIter.next()).toEqual({ done: false, value: ",\n " });
    expect(() => arrayIter.next()).toThrowError(TypeError);
  });
});
