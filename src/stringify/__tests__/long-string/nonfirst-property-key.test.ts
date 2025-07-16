import { expect, test } from "vitest";
import { Quantum } from "../../stringify.js";
import { stringify } from "../../../index.js";

test("very long successive property", () => {
  // The tests performed here depend upon implementation characteristics that
  // are not part of the promised API.

  const longString = new Array(2 * Quantum).fill(0).map((_v, index) => String.fromCharCode(index)).join("");

  const value = { [longString + "1"]: 17, [longString + "2"]: 42 };

  const iter = stringify(value, undefined, "Q");

  expect(iter.next()).toEqual({
    done: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    value: expect.stringMatching(/^\{\nQ"\\u0000\\u0001.+(?!")$/),
  });

  expect(iter.next()).toEqual({
    done: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    value: expect.stringMatching(/^.+$/),
  });

  const { done, value: value2 } = iter.next();
  expect(done).toBe(false);
  expect(value2).toEqual(expect.stringMatching(/": $/));

  const firstLastDigit = value2![value2!.length - 4];
  expect(firstLastDigit).toBeOneOf(["1", "2"]);

  expect(iter.next()).toEqual({
    done: false,
    value: firstLastDigit === "1" ? "17" : "42",
  });

  expect(iter.next()).toEqual({
    done: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    value: expect.stringMatching(/^,\nQ"\\u0000\\u0001/),
  });

  void iter.next();

  const { done: done2, value: value3 } = iter.next();
  expect(done2).toBe(false);
  expect(value3).toEqual(expect.stringMatching(/": $/));

  const result = iter.next();
  expect(result.done).toBe(false);

  const secondLastDigit = value3![value3!.length - 4];
  if (firstLastDigit === "1") {
    expect(secondLastDigit).toBe("2");
    expect(result.value).toBe("42");
  } else {
    expect(secondLastDigit).toBe("1");
    expect(result.value).toBe("17");
  }

  expect(iter.next()).toEqual({
    done: false,
    value: "\n}",
  });

  expect(iter.next()).toEqual({ done: true });
});
