import { describe, expect, test } from "vitest";
import { stringifyToString } from "../../tostring.js";

describe("replacer", () => {
  test.each([
    [null],
    [undefined],
  ])("$0", (replacer) => {
    expect(stringifyToString(2, replacer, 2)).toBe("2");
    expect(stringifyToString({ x: 42 }, replacer, 2)).toBe('{\n  "x": 42\n}');
    expect(stringifyToString([1, 2, 3], replacer, 0)).toBe("[1,2,3]");
  });
});
