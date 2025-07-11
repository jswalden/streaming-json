import { describe, expect, test } from "vitest";
import { type JSONValue, stringifyAsync } from "../../../../../index.js";

async function fullStreamingResult(value: JSONValue, replacer: null | undefined, space: number | string): Promise<string> {
  let result = "";
  await stringifyAsync(value, replacer, space, async (s) => {
    result += s;
  });
  return result;
}

describe("replacer", () => {
  test.each([
    [null],
    [undefined],
  ])("$0", async (replacer) => {
    await expect(fullStreamingResult(2, replacer, 2)).resolves.toBe("2");
    await expect(fullStreamingResult({ x: 42 }, replacer, 2)).resolves.toBe('{\n  "x": 42\n}');
    await expect(fullStreamingResult([1, 2, 3], replacer, 0)).resolves.toBe("[1,2,3]");
  });
});
