import { describe, expect, test, vi } from "vitest";
import { stringifyToString } from "../../helpers.js";

describe("property list is proxy", () => {
  test("ToNumber(length property) side effects should occur only once", () => {
    const target = ["x", "y", "z"];
    const targetLength = {
      valueOf: vi.fn<() => number>(() => {
        return target.length;
      }),
    };
    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, prop, _receiver): unknown => {
        if (prop === "length")
          return targetLength;
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      }),
    };
    const propertyListProxy = new Proxy(target, handler);

    expect(stringifyToString({ x: 42, q: 17 }, propertyListProxy, 0)).toBe('{"x":42}');

    const propertyGets = handler.get.mock.calls.map(([_target, prop, _receiver]) => prop);
    expect(propertyGets).toEqual(["length", "0", "1", "2"]);

    expect(targetLength.valueOf.mock.calls.length).toBe(1);
  });
});
