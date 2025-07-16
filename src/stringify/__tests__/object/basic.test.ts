import { describe, expect, test } from "vitest";
import { stringify } from "../../../index.js";

describe("stringify object fragmenting", () => {
  test("empty object", () => {
    const it = stringify({}, null, "");

    expect([...it]).toEqual(["{}"]);
  });

  test("object with property", () => {
    const it = stringify({ x: 42 }, null, "");

    expect([...it]).toEqual(['{"x":', "42", "}"]);
  });

  test("object with property pretty", () => {
    const it = stringify({ x: 42 }, null, "QQ");

    expect([...it]).toEqual(['{\nQQ"x": ', "42", "\n}"]);
  });

  test("object with two properties", () => {
    const it = stringify({ x: 42, y: 17 }, null, "");

    const actual = [...it];
    expect(actual[0]).toBeOneOf(['{"x":', '{"y":']);

    if (actual[0] === '{"x":') {
      expect(actual.slice(1, actual.length - 1)).toEqual(
        ["42", ',"y":', "17"],
      );
    } else {
      expect(actual.slice(1, actual.length - 1)).toEqual(
        ["17", ',"x":', "42"],
      );
    }

    expect(actual[actual.length - 1]).toBe("}");
  });

  test("object with two properties pretty", () => {
    const it = stringify({ x: 42, y: 17 }, null, "QQ");

    const actual = [...it];
    expect(actual[0]).toBeOneOf(['{\nQQ"x": ', '{\nXX"y": ']);

    if (actual[0] === '{\nQQ"x": ') {
      expect(actual.slice(1, actual.length - 1)).toEqual(
        ["42", ',\nQQ"y": ', "17"],
      );
    } else {
      expect(actual.slice(1, actual.length - 1)).toEqual(
        ["17", ',\nQQ"x": ', "42"],
      );
    }

    expect(actual[actual.length - 1]).toBe("\n}");
  });
});
