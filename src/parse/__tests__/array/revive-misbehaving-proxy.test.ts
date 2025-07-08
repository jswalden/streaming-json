import { describe, expect, test, vi } from "vitest";
import { StreamingJSONParser } from "../../../index.js";

describe("replace entire JSON result", () => {
  test("example", () => {
    const parser = new StreamingJSONParser();

    parser.add('[0, "REPLACED", 2]');

    const lengthTwo = {
      valueOf: vi.fn<() => number>(() => 2),
    };

    const target = ["hi!", "bye!"];
    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, prop, _receiver) => {
        if (prop === "length")
          return lengthTwo;
        return (target as unknown as Record<string | symbol, unknown>)[prop];
      }),
    };
    const proxy = new Proxy(target, handler);

    const result = parser.finish(function (prop: string, val: unknown): unknown {
      if (prop === "0") {
        if (val === "hi!")
          return val;

        (this as unknown[])[1] = proxy;
        return val;
      }

      if (prop === "1" || prop === "2" || prop === "")
        return val;
      throw new TypeError(`Unexpected prop: ${prop}`);
    });

    expect(Array.isArray(result)).toBe(true);
    expect((result as { 0: unknown })[0]).toBe(0);
    expect((result as { 1: unknown })[1]).toBe(proxy);
    expect((result as { 2: unknown })[2]).toBe(2);

    expect(handler.get.mock.calls.map(([_target, p, _val]) => p)).toEqual([
      "length",
      "0",
      "1",
    ]);

    // One single call before looping, not one call every time around the loop.
    expect(lengthTwo.valueOf.mock.calls.length).toBe(1);
  });
});
