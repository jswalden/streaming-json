import { expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";
import { Quantum } from "../../../shared.js";
import { stringifyAsync } from "../../stringifyAsync.js";

test("very long successive property", async () => {
  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const value = { [longString + "1"]: 17, [longString + "2"]: 42 };
  const jsonResult = JSON.stringify(value, null, "X");

  await expect(fullStreamingResult(value, "X")).resolves.toBe(jsonResult);

  const out: string[] = [];
  await stringifyAsync(value, undefined, "Q", async (s) => {
    out.push(s);
  });

  expect(out[0].startsWith('{\nQ"\\u0000\\u0001')).toBe(true);
  expect(out[0].endsWith('"')).toBe(false);
  expect(out[2].endsWith('": ')).toBe(true);
  expect(out[3]).toBe("17");
  expect(out[4].startsWith(',\nQ"\\u0000\\u0001')).toBe(true);
  expect(out[6].endsWith('": ')).toBe(true);
  expect(out[7]).toBe("42");
  expect(out[8]).toBe("\n}");
});
