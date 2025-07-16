import { expect, test } from "vitest";
import { stringifyToString } from "../tostring.js";
import { Quantum } from "../../stringify.js";
import { stringify } from "../../../index.js";

test("very long first property", () => {
  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const value = { [longString]: 42 };
  const jsonResult = JSON.stringify(value);

  expect(stringifyToString(value, null, "")).toBe(jsonResult);

  const out = [...stringify(value, undefined, "")];
  expect(out[0].startsWith('{"\\u0000\\u0001')).toBe(true);
  expect(out[0].endsWith('"')).toBe(false);
  expect(out[2].endsWith('":')).toBe(true);
  expect(out[3]).toBe("42");
  expect(out[4]).toBe("}");
});
