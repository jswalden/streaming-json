import { describe, expect, test } from "vitest";
import { stringify } from "../../index.js";

describe("examples from the `stringify` doc-comment", () => {
  test("fragment boundary demonstration and throwing", () => {
    const iter = stringify([
      1,
      { toJSON() {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 42;
      } },
      3,
    ], null, 0);

    // These fragment boundaries are not guaranteed.  This example merely
    // demonstrates the exception propagation behavior.
    expect(iter.next()).toEqual({
      done: false,
      value: "[",
    });

    expect(iter.next()).toEqual({
      done: false,
      value: "1",
    });

    expect(iter.next()).toEqual({
      done: false,
      value: ",",
    });

    let behavior = "didn't throw";
    try {
      iter.next();
    } catch (e: unknown) {
      behavior = Object.is(e, 42) ? "threw correct value" : "threw wrong value";
    }
    expect(behavior).toBe("threw correct value");
  });

  test("behavior when not stringifiable", () => {
    const cantStringify = undefined;

    expect(JSON.stringify(cantStringify, null, 2)).toBe(undefined);

    expect([...stringify(cantStringify, null, 2)]).toEqual([]);
  });
});
