import { expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";
import { Quantum } from "../../stringify.js";
import { stringify } from "../../../index.js";

test("very long string", () => {
  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const jsonResult = JSON.stringify(longString, null, "");

  expect(stringifyToString(longString, null, "")).toBe(jsonResult);

  const out: string[] = [...stringify(longString, undefined, "")];
  expect(out.length).toBe(3);
  for (let i = 0; i < out.length - 1; i++)
    expect(out[i].length).toBe(Quantum);
});
