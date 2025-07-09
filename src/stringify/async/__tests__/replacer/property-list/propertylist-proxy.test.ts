import { describe, expect, test, vi } from "vitest";
import { stringifyAsync } from "../../../../../index.js";

describe("property list is proxy", async () => {
  test("ToNumber(length property) side effects should occur only once", async () => {
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

    let result = "";
    await expect(stringifyAsync({ x: 42, q: 17 }, propertyListProxy, 0, async (s) => {
      result += s;
    })).resolves.toBe(undefined);

    const propertyGets = handler.get.mock.calls.map(([_target, prop, _receiver]) => prop);
    expect(propertyGets).toEqual(["length", "0", "1", "2"]);

    expect(targetLength.valueOf.mock.calls.length).toBe(1);

    expect(result).toBe('{"x":42}');
  });
});
