import { describe, expect, test, vi } from "vitest";
import { stringify } from "../../../../../index.js";

describe("duplicated property list item", () => {
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

    let result = "";
    expect(stringify(obj, ["x", "y", "x"], 0, (s) => {
      result += s;
    })).toBe(undefined);

    const propertyGets = handler.get.mock.calls.map(([_target, prop, _receiver]) => prop);
    expect(propertyGets[0]).toBe("toJSON");
    expect(propertyGets.slice(1)).toBeOneOf([
      ["x", "y"],
      ["y", "x"],
    ]);
    expect(result).toBeOneOf(['{"x":42,"y":17}', '{"y":17,"x":42}']);
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

    let result = "";
    expect(stringify(obj, ["0", "1", "0"], 0, (s) => {
      result += s;
    })).toBe(undefined);

    const propertyGets = handler.get.mock.calls.map(([_target, prop, _receiver]) => prop);
    expect(propertyGets).toEqual(["toJSON", "length", "0", "1"]);
    expect(result).toBe("[42,17]");
  });
});
