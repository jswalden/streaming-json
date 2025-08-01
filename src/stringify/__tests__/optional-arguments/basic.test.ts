import { describe, expect, test } from "vitest";
import { stringify } from "../../../index.js";

describe("stringify omitting arguments", () => {
  describe("value only", () => {
    test("(value)", () => {
      const it = stringify([5]);

      expect([...it]).toEqual(["[", "5", "]"]);
    });
  });

  describe("value and replacer", () => {
    test("(value, null)", () => {
      const it = stringify([5], null);

      expect([...it]).toEqual(["[", "5", "]"]);
    });

    test("(value, undefined)", () => {
      const it = stringify([5], undefined);

      expect([...it]).toEqual(["[", "5", "]"]);
    });

    test("(value, property list)", () => {
      const it = stringify({ x: 42, y: 17 }, ["x"]);

      expect([...it]).toEqual(['{"x":', "42", "}"]);
    });

    test("(value, preserving replacer)", () => {
      const it = stringify({ x: 42 }, (_prop: string, value: unknown) => value);

      expect([...it]).toEqual(['{"x":', "42", "}"]);
    });

    test("(value, omitting replacer)", () => {
      const it = stringify({ x: 42, y: 17 }, (_prop: string, _value: unknown) => undefined);

      // Even the `{ "": { x: 42, y: 17 } }` is omitted, so the overall thing
      // doesn't stringify to anything.
      expect([...it]).toEqual([]);
    });

    test("(value, omitting replacer except outermost result)", () => {
      const it = stringify(
        { x: 42 },
        (prop: string, value: unknown) => prop !== "" ? undefined : value,
      );

      expect([...it]).toEqual(["{}"]);
    });
  });
});
