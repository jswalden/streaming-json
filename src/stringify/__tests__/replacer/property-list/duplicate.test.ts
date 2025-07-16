import { describe, expect, test, vi } from "vitest";
import { stringify } from "../../../../index.js";

describe("duplicated property list item", () => {
  const props = <T, P, R>(calls: [T, P, R][]) => {
    return calls.map(([_target, prop, _receiver]) => prop);
  };

  test("property", () => {
    const target = {
      x: 42,
      y: 17,
    };
    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, prop, _receiver): number | undefined => {
        if (prop === "x" || prop === "y")
          return target[prop];
        return undefined;
      }),
    };
    const obj = new Proxy(target, handler);

    const iter = stringify(obj, ["x", "y", "x"], 0);

    expect(handler.get).toBeCalledTimes(0);

    const { done: firstDone, value: firstValue } = iter.next();
    expect(firstDone).toBe(false);
    expect(firstValue).toEqual(expect.stringMatching(/^\{"[xy]":/));

    expect(handler.get).toBeCalledTimes(2);
    const calls = handler.get.mock.calls;
    handler.get.mockClear();
    const firstPropGets = props(calls);
    expect(firstPropGets[0]).toBe("toJSON");
    expect(firstPropGets[1]).toBeOneOf(["x", "y"]);

    const firstPropVal = iter.next().value;

    const { done: secondDone, value: secondValue } = iter.next();
    expect(secondDone).toBe(false);

    if (firstValue!.includes("x"))
      expect(secondValue).toEqual(expect.stringContaining("y"));
    else
      expect(secondValue).toEqual(expect.stringContaining("x"));

    const secondPropVal = iter.next().value;

    expect([firstPropVal, secondPropVal].sort()).toEqual(["17", "42"]);
  });

  test("property list not used for elements", () => {
    const target = [42, 17];
    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, prop, _receiver): number | undefined => {
        if (prop === "0" || prop === "1" || prop === "length")
          return target[prop];
        return undefined;
      }),
    };
    const obj = new Proxy(target, handler);

    const iter = stringify(obj, ["0", "1", "0"], 0);

    expect(handler.get).toHaveBeenCalledTimes(0);

    expect(iter.next()).toEqual({
      done: false,
      value: "[",
    });

    let gets;

    gets = handler.get.mock.calls;
    handler.get.mockClear();
    expect(props(gets)).toEqual(["toJSON", "length"]);

    expect(iter.next()).toEqual({
      done: false,
      value: "42",
    });

    gets = handler.get.mock.calls;
    handler.get.mockClear();
    expect(props(gets)).toEqual(["0"]);

    expect(iter.next()).toEqual({
      done: false,
      value: ",",
    });
    expect(handler.get).toBeCalledTimes(0);

    expect(iter.next()).toEqual({
      done: false,
      value: "17",
    });

    gets = handler.get.mock.calls;
    expect(props(gets)).toEqual(["1"]);
  });
});
