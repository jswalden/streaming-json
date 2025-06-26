import { expect, test } from "vitest";
import { fullStreamingResult } from "../fullStreamingResult.js";
import { Quantum } from "../../../shared.js";
import { stringifyAsync } from "../../stringifyAsync.js";

test("very long string", async () => {
  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const jsonResult = JSON.stringify(longString);

  await expect(fullStreamingResult(longString, "")).resolves.toBe(jsonResult);

  const out: string[] = [];
  await stringifyAsync(longString, undefined, "", async (s) => {
    out.push(s);
  });
  expect(out.length).toBe(3);
  for (let i = 0; i < out.length - 1; i++)
    expect(out[i].length).toBe(Quantum);
});
