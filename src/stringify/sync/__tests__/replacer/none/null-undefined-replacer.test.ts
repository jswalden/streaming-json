import { describe, expect, test } from "vitest";
import { type JSONValue, stringify } from "../../../../../index.js";

function fullStreamingResult(value: JSONValue, replacer: null | undefined, space: number | string): string {
  let result = "";
  stringify(value, replacer, space, (s) => {
    result += s;
  });
  return result;
}

describe("replacer", () => {
  test.each([
    [null],
    [undefined],
  ])("$0", (replacer) => {
    expect(fullStreamingResult(2, replacer, 2)).toBe("2");
    expect(fullStreamingResult({ x: 42 }, replacer, 2)).toBe('{\n  "x": 42\n}');
    expect(fullStreamingResult([1, 2, 3], replacer, 0)).toBe("[1,2,3]");
  });
});
