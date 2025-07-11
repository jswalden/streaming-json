import { expect, test } from "vitest";
import { Quantum } from "../../../shared.js";
import { stringify } from "../../../../index.js";

test("very long successive property", () => {
  // The tests performed here depend upon implementation characteristics that
  // are not part of the promised API.

  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const value = { [longString + "1"]: 17, [longString + "2"]: 42 };

  const out: string[] = [];
  stringify(value, undefined, "Q", (s) => out.push(s));
  expect(out[0].startsWith('{\nQ"\\u0000\\u0001')).toBe(true);
  expect(out[0].endsWith('"')).toBe(false);

  expect(out[2].endsWith('": ')).toBe(true);

  const firstLastDigit = out[2][out[2].length - 4];
  expect(firstLastDigit).toBeOneOf(["1", "2"]);

  if (firstLastDigit === "1")
    expect(out[3]).toBe("17");
  else
    expect(out[3]).toBe("42");

  expect(out[4].startsWith(',\nQ"\\u0000\\u0001')).toBe(true);
  expect(out[6].endsWith('": ')).toBe(true);

  const secondLastDigit = out[6][out[6].length - 4];
  if (firstLastDigit === "1") {
    expect(secondLastDigit).toBe("2");
    expect(out[7]).toBe("42");
  } else {
    expect(secondLastDigit).toBe("1");
    expect(out[7]).toBe("17");
  }

  expect(out[8]).toBe("\n}");
});
