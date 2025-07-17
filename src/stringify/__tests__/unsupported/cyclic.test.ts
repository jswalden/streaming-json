import { describe, expect, test, vi } from "vitest";
import { stringify } from "../../../index.js";
import { props } from "../helpers.js";

describe("cycle detection", () => {
  test("array containing itself", () => {
    const target: unknown[] = [0];

    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, p, _receiver) => {
        return (target as unknown as Record<string | symbol, unknown>)[p];
      }),
    } satisfies ProxyHandler<typeof target>;
    const cyclic = new Proxy(target, handler);

    target[0] = cyclic;

    const iter = stringify(cyclic, null, 2);

    expect(handler.get).toBeCalledTimes(0);

    expect(iter.next()).toEqual({
      done: false,
      value: "[\n  ",
    });

    expect(props(handler.get.mock.calls)).toEqual([
      // on cyclic
      "toJSON",
      // to determine whether it's an empty array, evaluating to 1
      "length",
    ]);
    handler.get.mockClear();

    expect(() => iter.next()).toThrowErrorMatching(TypeError, "cyclic");
    expect(props(handler.get.mock.calls)).toEqual([
      // to get the initial element after the opening bracket
      "0",
      // preprocessing that initial element value -- note that this happens
      // https://tc39.es/ecma262/#sec-serializejsonproperty step 2 *before*
      // cycle-through-this-array/object checks in step 11, as the first step of
      // https://tc39.es/ecma262/#sec-serializejsonobject or
      // https://tc39.es/ecma262/#sec-serializejsonarray
      "toJSON",
    ]);
  });

  test("object containing itself", () => {
    const target: Record<string | symbol, unknown> = {};

    const handler = {
      get: vi.fn<NonNullable<ProxyHandler<typeof target>["get"]>>((target, p, _receiver) => {
        return target[p];
      }),
    } satisfies ProxyHandler<typeof target>;
    const cyclic = new Proxy(target, handler);

    target.propname = cyclic;

    const iter = stringify(cyclic, null, 2);

    expect(handler.get).toBeCalledTimes(0);

    expect(iter.next()).toEqual({
      done: false,
      value: '{\n  "propname": ',
    });

    expect(props(handler.get.mock.calls)).toEqual([
      // on outermost object
      "toJSON",
      // get value of first property in keys (needed to know whether to yield
      // the opening brace and property name -- or to wait because if there are
      // no properties the overall yield for the object will be "{}")
      "propname",
      // performed during `preprocessValue`, that performs the partial work
      // needed to know whether this property value makes the property filtered
      // out or not
      "toJSON",
    ]);
    handler.get.mockClear();

    expect(() => iter.next()).toThrowErrorMatching(TypeError, "cyclic");
    expect(handler.get).toBeCalledTimes(0); // toJSON already called
  });
});
